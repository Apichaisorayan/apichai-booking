import { Hono } from 'hono';
import { executeQuery, executeOne, executeRun, generateId } from '../utils/db.js';
import { notifyBookingEvent } from './notifications.js';
import { authMiddleware } from '../utils/jwt.js';
import { transformBookingRow, BOOKING_WITH_RELATIONS } from '../utils/queries.js';
import { VALIDATION_MESSAGES, BOOKING_TYPES } from '../utils/constants.js';
import { timeRangesOverlap } from '../utils/availability.js';
import { checkProceduresRequireDoctor, isThreeStageProcedure, calculateThreeStageDoctorBusyBlocks, canFitInThreeStageFreeWindow, calculateThreeStageDoctorFreeBlock, getThreeStageAnchorTime } from '../utils/bookingHelper.js';
import { isStaffOnlyProcedureName, isThreeStageProcedureName } from '../utils/sharedBookingRules.js';
import { normalizeTime } from '../utils/timeFormat.js';

const bookings = new Hono();

// Force reload: 2024-02-10 (Clean Architecture Refactor)

// Get all bookings with relations
bookings.get('/', async (c) => {
  try {
    const type = c.req.query('type'); // 'PROCEDURE' or 'MEETING'

    let query = BOOKING_WITH_RELATIONS;
    const params = [];

    if (type) {
      query += ` WHERE b.booking_type = ?`;
      params.push(type);
    }

    query += ` ORDER BY b.date DESC, b.start_time ASC`;

    const results = await executeQuery(c.env.DB, query, params);

    // Transform to nested format using shared function
    const transformed = results.map(transformBookingRow);

    return c.json(transformed);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get booking by ID
bookings.get('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const row = await executeOne(
      c.env.DB,
      BOOKING_WITH_RELATIONS + ` WHERE b.id = ?`,
      [id]
    );

    if (!row) {
      return c.json({ success: false, error: VALIDATION_MESSAGES.NOT_FOUND }, 404);
    }

    // Transform to nested format using shared function
    const booking = transformBookingRow(row);
    return c.json(booking);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get bookings by date
bookings.get('/date/:date', async (c) => {
  try {
    const { date } = c.req.param();
    const results = await executeQuery(
      c.env.DB,
      BOOKING_WITH_RELATIONS + ` WHERE b.date = ? ORDER BY b.start_time ASC`,
      [date]
    );

    const transformed = results.map(transformBookingRow);
    return c.json(transformed);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Check availability
bookings.post('/check-availability', async (c) => {
  try {
    const { date, start_time, end_time } = await c.req.json();

    if (!date || !start_time || !end_time) {
      return c.json({ success: false, error: VALIDATION_MESSAGES.MISSING_FIELDS }, 400);
    }

    const conflicts = await executeQuery(
      c.env.DB,
      `SELECT doctor_id, machine_id, room_id 
       FROM bookings 
       WHERE date = ? 
       AND status != 'CANCELLED'
       AND start_time < ? 
       AND end_time > ?`,
      [date, end_time, start_time]
    );

    const unavailableDoctors = [...new Set(conflicts.map(b => b.doctor_id))];
    const unavailableMachines = [...new Set(conflicts.map(b => b.machine_id))];
    const unavailableRooms = [...new Set(conflicts.map(b => b.room_id))];

    return c.json({
      success: true,
      unavailable: {
        doctors: unavailableDoctors,
        machines: unavailableMachines,
        rooms: unavailableRooms,
      },
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Validate booking
bookings.post('/validate', async (c) => {
  try {
    const params = await c.req.json();

    // Extract parameters
    const {
      doctor_id,
      machine_id,
      room_id,
      date,
      start_time,
      end_time,
      prep_room_id,
      prep_start_time,
      prep_end_time,
      consult_room_id,
      consult_start_time,
      consult_end_time,
      exclude_booking_id,
      procedure_ids,
      booking_type,
      is_consult_only,
    } = params;

    const errors = [];
    const isMeeting = booking_type === 'MEETING';
    const isConsultation = booking_type === 'CONSULTATION' || is_consult_only;

    // Operating hours validation (08:00 - 20:59)
    const [startH, startM] = start_time.split(':').map(Number);
    const [endH, endM] = end_time.split(':').map(Number);
    const earliestTime = consult_start_time || prep_start_time || start_time;
    const [earliestH, earliestM] = earliestTime.split(':').map(Number);

    if (earliestH < 8 || endH > 21 || (endH === 21 && endM > 0)) {
      errors.push(`เวลาที่เลือกอยู่นอกเวลาทำการ (08:00 - 21:00)`);
    }

    // Basic validation
    if (!room_id || !date || !start_time || !end_time) {
      return c.json({ success: false, message: 'Missing required fields', errors: ['กรุณากรอกข้อมูลให้ครบถ้วน'] }, 400);
    }

    // Validate doctor and machine for procedure bookings
    if (!isMeeting && !isConsultation) {
      // Check if procedures require doctor
      let requiresDoctor = true;
      if (procedure_ids && procedure_ids.length > 0) {
        const procedures = await executeQuery(
          c.env.DB,
          `SELECT * FROM procedures WHERE id IN (${procedure_ids.map(() => '?').join(',')})`,
          procedure_ids
        );
        requiresDoctor = checkProceduresRequireDoctor(procedures);
      }

      // Validate doctor/TR staff if required
      if (requiresDoctor && doctor_id) {
        const doctor = await executeOne(c.env.DB, "SELECT * FROM users WHERE id = ? AND role IN ('DOCTOR', 'TR')", [doctor_id]);
        if (!doctor) errors.push('ไม่พบแพทย์/พนักงาน TR ที่เลือก');
      }

      // Validate machine
      if (machine_id) {
        const machine = await executeOne(c.env.DB, 'SELECT * FROM machines WHERE id = ?', [machine_id]);
        if (!machine || !machine.is_available) {
          errors.push('เครื่องไม่พร้อมใช้งาน');
        } else if (machine.type === 'FIXED') {
          // Check if machine is fixed to specific rooms
          const machineRooms = await executeQuery(c.env.DB, 'SELECT room_id FROM machine_rooms WHERE machine_id = ?', [machine_id]);
          const allowedRoomIds = machineRooms.map(mr => mr.room_id);
          if (allowedRoomIds.length > 0 && !allowedRoomIds.includes(room_id)) {
            const rooms = await executeQuery(c.env.DB, 'SELECT name FROM rooms WHERE id IN (' + allowedRoomIds.map(() => '?').join(',') + ')', allowedRoomIds);
            const roomNames = rooms.map(r => r.name).join(', ');
            errors.push(`เครื่องมือนี้ถูกล็อกไว้ที่ห้อง: ${roomNames}`);
          }
        }
      }
    }

    // Check for conflicts
    const allBookings = await executeQuery(
      c.env.DB,
      `SELECT * FROM bookings WHERE date = ? AND status != 'CANCELLED'`,
      [date]
    );

    // Filter out the booking being edited
    const otherBookings = exclude_booking_id
      ? allBookings.filter(b => b.id !== exclude_booking_id)
      : allBookings;

    // Check machine conflicts
    if (machine_id) {
      const machineConflicts = otherBookings.filter(b =>
        b.machine_id === machine_id && timeRangesOverlap(start_time, end_time, b.start_time, b.end_time)
      );
      if (machineConflicts.length > 0) errors.push('เครื่องถูกจองแล้วในช่วงเวลานี้');
    }

    // Check room conflicts
    const roomConflicts = otherBookings.filter(b => {
      if (b.room_id === room_id && timeRangesOverlap(start_time, end_time, b.start_time, b.end_time)) return true;
      if (b.prep_room_id === room_id && b.prep_start_time && b.prep_end_time &&
        timeRangesOverlap(start_time, end_time, b.prep_start_time, b.prep_end_time)) return true;
      if (b.consult_room_id === room_id && b.consult_start_time && b.consult_end_time &&
        timeRangesOverlap(start_time, end_time, b.consult_start_time, b.consult_end_time)) return true;
      return false;
    });
    if (roomConflicts.length > 0) errors.push('ห้องถูกจองแล้วในช่วงเวลานี้');

    // Check prep room conflicts
    if (prep_room_id && prep_start_time && prep_end_time) {
      const prepRoomConflicts = otherBookings.filter(b => {
        if (b.room_id === prep_room_id && timeRangesOverlap(prep_start_time, prep_end_time, b.start_time, b.end_time)) return true;
        if (b.prep_room_id === prep_room_id && b.prep_start_time && b.prep_end_time &&
          timeRangesOverlap(prep_start_time, prep_end_time, b.prep_start_time, b.prep_end_time)) return true;
        if (b.consult_room_id === prep_room_id && b.consult_start_time && b.consult_end_time &&
          timeRangesOverlap(prep_start_time, prep_end_time, b.consult_start_time, b.consult_end_time)) return true;
        return false;
      });
      if (prepRoomConflicts.length > 0) errors.push('ห้องเตรียมตัวถูกจองแล้วในช่วงเวลานี้');
    }

    // Check consult room conflicts
    if (consult_room_id && consult_start_time && consult_end_time) {
      const consultRoomConflicts = otherBookings.filter(b => {
        if (b.room_id === consult_room_id && timeRangesOverlap(consult_start_time, consult_end_time, b.start_time, b.end_time)) return true;
        if (b.prep_room_id === consult_room_id && b.prep_start_time && b.prep_end_time &&
          timeRangesOverlap(consult_start_time, consult_end_time, b.prep_start_time, b.prep_end_time)) return true;
        if (b.consult_room_id === consult_room_id && b.consult_start_time && b.consult_end_time &&
          timeRangesOverlap(consult_start_time, consult_end_time, b.consult_start_time, b.consult_end_time)) return true;
        return false;
      });
      if (consultRoomConflicts.length > 0) errors.push('ห้องปรึกษาถูกจองแล้วในช่วงเวลานี้');
    }

    // Check doctor conflicts (only for procedure bookings with doctor)
    if (!isMeeting && !isConsultation && doctor_id) {
      // Get all bookings with procedure names for 3-stage detection
      const allBookingsWithProcedures = await executeQuery(
        c.env.DB,
        `SELECT b.*, GROUP_CONCAT(p.name) as procedure_names 
         FROM bookings b
         LEFT JOIN booking_procedures bp ON b.id = bp.booking_id
         LEFT JOIN procedures p ON bp.procedure_id = p.id
         WHERE b.date = ? AND b.status != 'CANCELLED'
         GROUP BY b.id`,
        [date]
      );

      const otherBookingsWithProc = exclude_booking_id
        ? allBookingsWithProcedures.filter(b => b.id !== exclude_booking_id)
        : allBookingsWithProcedures;

      // Detect if NEW booking is 3-stage
      let isThreeStageNew = false;
      if (procedure_ids && procedure_ids.length > 0) {
        const procedures = await executeQuery(
          c.env.DB,
          `SELECT * FROM procedures WHERE id IN (${procedure_ids.map(() => '?').join(',')})`,
          procedure_ids
        );
        isThreeStageNew = isThreeStageProcedure(procedures);
      }

      // Calculate busy intervals for NEW booking
      const includeConsultNew = consult_start_time && consult_end_time;
      const newBookingObj = { start_time, consult_start_time, isThreeStage: isThreeStageNew, includeConsult: includeConsultNew, consult_room_id };
      const anchorTime = getThreeStageAnchorTime(newBookingObj);
      const newBusyIntervals = isThreeStageNew
        ? calculateThreeStageDoctorBusyBlocks(anchorTime, includeConsultNew)
        : [{ start: start_time, end: end_time }];

      const doctorConflicts = otherBookingsWithProc.filter(b => {
        if (b.doctor_id !== doctor_id) return false;

        // Determine busy intervals for EXISTING booking
        const existingProcedures = b.procedure_names ? b.procedure_names.split(',') : [];
        const existingIsThreeStage = existingProcedures.some(name => isThreeStageProcedureName(name));

        const existingAnchorTime = getThreeStageAnchorTime(b);
        const includeConsultExisting = !!b.consult_start_time;
        const existingBusyIntervals = existingIsThreeStage
          ? calculateThreeStageDoctorBusyBlocks(existingAnchorTime, includeConsultExisting)
          : [{ start: b.start_time, end: b.end_time }];

        // Check if NEW booking can fit in FREE window of EXISTING 3-stage booking
        if (existingIsThreeStage && !isThreeStageNew) {
          const fitsInFreeWindow = canFitInThreeStageFreeWindow(start_time, end_time, existingAnchorTime, includeConsultExisting);
          if (fitsInFreeWindow) return false; // No conflict
        }

        // Check if EXISTING booking can fit in FREE window of NEW 3-stage booking
        if (isThreeStageNew && !existingIsThreeStage) {
          const fitsInFreeWindow = canFitInThreeStageFreeWindow(b.start_time, b.end_time, anchorTime, includeConsultNew);
          if (fitsInFreeWindow) return false; // No conflict
        }

        // Check if ANY busy interval overlaps
        return newBusyIntervals.some(newIv =>
          existingBusyIntervals.some(exIv =>
            timeRangesOverlap(newIv.start, newIv.end, exIv.start, exIv.end)
          )
        );
      });

      if (doctorConflicts.length > 0) {
        const conflict = doctorConflicts[0];
        const conflictProcedures = conflict.procedure_names ? conflict.procedure_names.split(',') : [];
        const conflictIsThreeStage = conflictProcedures.some(name => isThreeStageProcedureName(name));

        if (conflictIsThreeStage) {
          const conflictAnchorTime = getThreeStageAnchorTime(conflict);
          const conflictIncludeConsult = !!conflict.consult_start_time;
          const freeBlock = calculateThreeStageDoctorFreeBlock(conflictAnchorTime, conflictIncludeConsult);
          errors.push(`แพทย์ไม่ว่างในช่วงเวลาที่เลือก (มี miraDry ${normalizeTime(conflict.start_time)}-${normalizeTime(conflict.end_time)}, แพทย์ว่างเฉพาะ ${freeBlock.start}-${freeBlock.end})`);
        } else {
          errors.push(`แพทย์มีนัดหมายอยู่แล้วในช่วงเวลา ${normalizeTime(conflict.start_time)}-${normalizeTime(conflict.end_time)}`);
        }
      }
    }

    if (errors.length > 0) {
      return c.json({ success: false, message: 'Validation failed', errors }, 400);
    }

    return c.json({ success: true, message: 'การจองนี้สามารถทำได้' });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create booking (with auth)
bookings.post('/', authMiddleware, async (c) => {
  try {
    const {
      doctor_id,
      machine_id,
      room_id,
      prep_room_id,
      user_id,
      patient_name,
      patient_hn,
      date,
      start_time,
      end_time,
      prep_start_time,
      prep_end_time,
      consult_room_id,
      consult_start_time,
      consult_end_time,
      notes,
      booking_type,
      procedure_ids,
      exclude_booking_id,
      is_consult_only
    } = await c.req.json();

    // Get current user from JWT token
    const currentUser = c.get('user');
    const createdByUserId = user_id || (currentUser ? currentUser.userId : null);

    // For MEETING bookings, only room is required
    // For PROCEDURE bookings, check if procedures require doctor
    // For CONSULTATION bookings, only room is required (similar to MEETING)
    const isMeeting = booking_type === BOOKING_TYPES.MEETING;
    const isConsultation = booking_type === 'CONSULTATION' || is_consult_only === true;

    if (!room_id || !patient_name || !date || !start_time || !end_time) {
      return c.json({ success: false, error: VALIDATION_MESSAGES.MISSING_FIELDS }, 400);
    }

    // For PROCEDURE bookings, check if any selected procedure requires a doctor
    let requiresDoctor = false;
    let isThreeStage = false;
    if (!isMeeting && procedure_ids && procedure_ids.length > 0) {
      const proceduresList = await executeQuery(
        c.env.DB,
        `SELECT * FROM procedures WHERE id IN (${procedure_ids.map(() => '?').join(',')})`,
        procedure_ids
      );

      requiresDoctor = checkProceduresRequireDoctor(proceduresList);
      isThreeStage = isThreeStageProcedure(proceduresList);
    }

    // Also check if machine is staff-only (e.g. D-Cool) - override requiresDoctor
    if (!isMeeting && machine_id && requiresDoctor) {
      const machineInfo = await executeOne(c.env.DB, 'SELECT name FROM machines WHERE id = ?', [machine_id]);
      if (machineInfo && isStaffOnlyProcedureName(machineInfo.name)) {
        requiresDoctor = false;
      }
    }

    // Validate doctor and machine based on procedure requirements
    // For CONSULTATION bookings, doctor is optional but machine is not required
    if (!isMeeting && !isConsultation) {
      if (requiresDoctor && !doctor_id) {
        return c.json({ success: false, error: 'Doctor is required for this procedure' }, 400);
      }
      if (!machine_id) {
        return c.json({ success: false, error: 'Machine is required for procedure bookings' }, 400);
      }
    } else if (isConsultation) {
      // For consultation bookings, validate doctor/TR if provided
      if (doctor_id) {
        const doctor = await executeOne(c.env.DB, "SELECT * FROM users WHERE id = ? AND role IN ('DOCTOR', 'TR')", [doctor_id]);
        if (!doctor) {
          return c.json({ success: false, error: 'Doctor/TR staff not found' }, 400);
        }
      }
    }

    // Run validation logic inline
    const errors = [];

    // Only validate doctor and machine for procedure bookings
    // Skip for CONSULTATION bookings
    if (!isMeeting && !isConsultation) {
      // Validate doctor/TR staff only if required
      if (requiresDoctor && doctor_id) {
        const doctor = await executeOne(c.env.DB, "SELECT * FROM users WHERE id = ? AND role IN ('DOCTOR', 'TR')", [doctor_id]);
        if (!doctor) {
          errors.push('Doctor not found');
        }
      }

      // Validate machine
      const machine = await executeOne(
        c.env.DB,
        'SELECT m.*, r.name as room_name FROM machines m LEFT JOIN rooms r ON m.room_id = r.id WHERE m.id = ?',
        [machine_id]
      );
      if (!machine || !machine.is_available) errors.push('Machine unavailable');

      // Check if machine is FIXED type and validate room
      if (machine?.type === 'FIXED') {
        // Get all rooms for this machine from machine_rooms table
        const machineRooms = await executeQuery(
          c.env.DB,
          'SELECT room_id FROM machine_rooms WHERE machine_id = ?',
          [machine_id]
        );

        const allowedRoomIds = machineRooms.map(mr => mr.room_id);

        if (allowedRoomIds.length > 0 && !allowedRoomIds.includes(room_id)) {
          // Get room names for error message
          const roomNames = await executeQuery(
            c.env.DB,
            'SELECT name FROM rooms WHERE id IN (' + allowedRoomIds.map(() => '?').join(',') + ')',
            allowedRoomIds
          );
          const roomNameList = roomNames.map(r => r.name).join(', ');
          errors.push(`Machine fixed to rooms: ${roomNameList}`);
        }
      }
    }

    const room = await executeOne(c.env.DB, 'SELECT * FROM rooms WHERE id = ?', [room_id]);
    if (!room || !room.is_available) errors.push('Room unavailable');

    // Check prep room if provided
    if (prep_room_id) {
      const prepRoom = await executeOne(c.env.DB, 'SELECT * FROM rooms WHERE id = ?', [prep_room_id]);
      if (!prepRoom || !prepRoom.is_available) errors.push('Prep room unavailable');
    }

    // Get all bookings for conflict checking, including procedure names for 3-stage detection
    const allBookings = await executeQuery(
      c.env.DB,
      `SELECT b.*, GROUP_CONCAT(p.name) as procedure_names 
       FROM bookings b
       LEFT JOIN booking_procedures bp ON b.id = bp.booking_id
       LEFT JOIN procedures p ON bp.procedure_id = p.id
       WHERE b.date = ? AND b.status != 'CANCELLED'
       GROUP BY b.id`,
      [date]
    );

    // Check treatment room conflicts
    const roomConflicts = allBookings.filter(b => {
      if (exclude_booking_id && b.id === exclude_booking_id) return false;

      // Check if booking uses this room as treatment room
      if (b.room_id === room_id && timeRangesOverlap(start_time, end_time, b.start_time, b.end_time)) {
        return true;
      }
      // Check if booking uses this room as consult room
      if (b.consult_room_id === room_id && b.consult_start_time && b.consult_end_time &&
        timeRangesOverlap(start_time, end_time, b.consult_start_time, b.consult_end_time)) {
        return true;
      }
      // Check if booking uses this room as prep room
      if (b.prep_room_id === room_id && b.prep_start_time && b.prep_end_time &&
        timeRangesOverlap(start_time, end_time, b.prep_start_time, b.prep_end_time)) {
        return true;
      }
      return false;
    });

    if (roomConflicts.length > 0) {
      errors.push('ห้องถูกจองแล้วในช่วงเวลานี้');
    }

    // Check prep room conflicts if provided
    if (prep_room_id && prep_start_time && prep_end_time) {
      const prepRoomConflicts = allBookings.filter(b => {
        if (exclude_booking_id && b.id === exclude_booking_id) return false;

        // Check if booking uses this room as treatment room
        if (b.room_id === prep_room_id && timeRangesOverlap(prep_start_time, prep_end_time, b.start_time, b.end_time)) {
          return true;
        }
        // Check if booking uses this room as prep room
        if (b.prep_room_id === prep_room_id && b.prep_start_time && b.prep_end_time &&
          timeRangesOverlap(prep_start_time, prep_end_time, b.prep_start_time, b.prep_end_time)) {
          return true;
        }
        // Check if booking uses this room as consult room
        if (b.consult_room_id === prep_room_id && b.consult_start_time && b.consult_end_time &&
          timeRangesOverlap(prep_start_time, prep_end_time, b.consult_start_time, b.consult_end_time)) {
          return true;
        }
        return false;
      });

      if (prepRoomConflicts.length > 0) {
        errors.push('ห้องเตรียมตัวถูกจองแล้วในช่วงเวลานี้');
      }
    }

    // Check consult room conflicts if provided
    if (consult_room_id && consult_start_time && consult_end_time) {
      const consultRoomConflicts = allBookings.filter(b => {
        if (exclude_booking_id && b.id === exclude_booking_id) return false;

        if (b.room_id === consult_room_id && timeRangesOverlap(consult_start_time, consult_end_time, b.start_time, b.end_time)) return true;
        if (b.prep_room_id === consult_room_id && b.prep_start_time && b.prep_end_time && timeRangesOverlap(consult_start_time, consult_end_time, b.prep_start_time, b.prep_end_time)) return true;
        if (b.consult_room_id === consult_room_id && b.consult_start_time && b.consult_end_time && timeRangesOverlap(consult_start_time, consult_end_time, b.consult_start_time, b.consult_end_time)) return true;
        return false;
      });

      if (consultRoomConflicts.length > 0) {
        errors.push('ห้องปรึกษาถูกจองแล้วในช่วงเวลานี้');
      }
    }

    // Check doctor and machine conflicts (only for procedure bookings)
    // Skip for CONSULTATION bookings
    if (!isMeeting && !isConsultation) {
      // Calculate busy intervals for the NEW booking
      // Detect if consultation is included in NEW booking
      const includeConsultNew = consult_start_time && consult_end_time;
      const newBookingObj = { start_time, consult_start_time, isThreeStage, includeConsult: includeConsultNew, consult_room_id };
      const anchorTime = getThreeStageAnchorTime(newBookingObj);
      const newBusyIntervals = isThreeStage
        ? calculateThreeStageDoctorBusyBlocks(anchorTime, includeConsultNew)
        : [{ start: start_time, end: end_time }];

      const doctorConflicts = allBookings.filter(b => {
        if (b.doctor_id !== doctor_id) return false;
        if (exclude_booking_id && b.id === exclude_booking_id) return false;

        // Determine busy intervals for the EXISTING booking
        const existingProcedures = b.procedure_names ? b.procedure_names.split(',') : [];
        const existingIsThreeStage = existingProcedures.some(name => isThreeStageProcedureName(name));

        const existingAnchorTime = getThreeStageAnchorTime(b);
        const includeConsultExisting = !!b.consult_start_time;
        const existingBusyIntervals = existingIsThreeStage
          ? calculateThreeStageDoctorBusyBlocks(existingAnchorTime, includeConsultExisting)
          : [{ start: b.start_time, end: b.end_time }];

        // 🎯 SMART OVERLAP DETECTION
        // Check if NEW booking can fit in FREE window of EXISTING 3-stage booking
        if (existingIsThreeStage && !isThreeStage) {
          const fitsInFreeWindow = canFitInThreeStageFreeWindow(start_time, end_time, existingAnchorTime, includeConsultExisting);
          if (fitsInFreeWindow) {
            return false; // No conflict - this is allowed!
          }
        }

        // Check if EXISTING booking can fit in FREE window of NEW 3-stage booking
        if (isThreeStage && !existingIsThreeStage) {
          const fitsInFreeWindow = canFitInThreeStageFreeWindow(b.start_time, b.end_time, anchorTime, includeConsultNew);
          if (fitsInFreeWindow) {
            return false; // No conflict - this is allowed!
          }
        }

        // Check if ANY busy interval of the new booking overlaps with ANY busy interval of the existing booking
        return newBusyIntervals.some(newIv =>
          existingBusyIntervals.some(exIv =>
            timeRangesOverlap(newIv.start, newIv.end, exIv.start, exIv.end)
          )
        );
      });

      if (doctorConflicts.length > 0) {
        const conflict = doctorConflicts[0];

        // Check if conflict is with a 3-stage booking
        const conflictProcedures = conflict.procedure_names ? conflict.procedure_names.split(',') : [];
        const conflictIsThreeStage = conflictProcedures.some(name => isThreeStageProcedureName(name));

        if (conflictIsThreeStage) {
          const conflictAnchorTime = getThreeStageAnchorTime(conflict);
          const conflictIncludeConsult = !!conflict.consult_start_time;
          const freeBlock = calculateThreeStageDoctorFreeBlock(conflictAnchorTime, conflictIncludeConsult);
          errors.push(`แพทย์ไม่ว่างในช่วงเวลาที่เลือก (มี miraDry ${normalizeTime(conflict.start_time)}-${normalizeTime(conflict.end_time)}, แพทย์ว่างเฉพาะ ${freeBlock.start}-${freeBlock.end})`);
        } else {
          errors.push(`แพทย์มีนัดหมายอยู่แล้วในช่วงเวลา ${normalizeTime(conflict.start_time)}-${normalizeTime(conflict.end_time)}`);
        }
      }

      // Machine and Room Locking for MiraDry
      // Stage 2+3: start+30 to start+180
      const busyBlocksNew = isThreeStage ? calculateThreeStageDoctorBusyBlocks(anchorTime, includeConsultNew) : [];
      const resourceLockStart = isThreeStage ? busyBlocksNew[includeConsultNew ? 1 : 0].start : start_time;
      const resourceLockEnd = end_time;

      const machineConflicts = allBookings.filter(b => {
        if (b.machine_id !== machine_id) return false;
        if (exclude_booking_id && b.id === exclude_booking_id) return false;

        // For machines, we currently lock for the whole duration shown
        return timeRangesOverlap(resourceLockStart, resourceLockEnd, b.start_time, b.end_time);
      });

      if (machineConflicts.length > 0) {
        errors.push('เครื่องถูกจองแล้วในช่วงเวลานี้');
      }
    }

    if (errors.length > 0) {
      return c.json({ success: false, message: 'Validation failed', errors }, 400);
    }

    // Create booking
    const id = generateId();

    // For meeting bookings, doctor_id and machine_id are NULL
    // For consultation bookings, doctor_id is optional and machine_id is NULL
    const finalDoctorId = isMeeting ? null : doctor_id;
    const finalMachineId = (isMeeting || isConsultation) ? null : machine_id;

    // Support multiple procedures
    const finalProcedureIds = Array.isArray(procedure_ids) ? procedure_ids : [];

    await executeRun(
      c.env.DB,
      `INSERT INTO bookings (
        id, doctor_id, machine_id, room_id, prep_room_id, 
        prep_start_time, prep_end_time, consult_room_id,
        consult_start_time, consult_end_time, user_id, patient_name, patient_hn,
        date, start_time, end_time, notes, status, booking_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?)`,
      [
        id,
        finalDoctorId,
        finalMachineId,
        room_id,
        prep_room_id || null,
        prep_start_time || null,
        prep_end_time || null,
        consult_room_id || null,
        consult_start_time || null,
        consult_end_time || null,
        createdByUserId,
        patient_name,
        patient_hn || null,
        date,
        start_time,
        end_time,
        notes || null,
        isConsultation ? 'CONSULTATION' : (booking_type || 'PROCEDURE')
      ]
    );

    // Insert into booking_procedures for multiple procedures support
    if (finalProcedureIds.length > 0) {
      for (const pId of finalProcedureIds) {
        const linkId = generateId();
        await executeRun(
          c.env.DB,
          'INSERT INTO booking_procedures (id, booking_id, procedure_id) VALUES (?, ?, ?)',
          [linkId, id, pId]
        );
      }
    }

    const bookingRow = await executeOne(
      c.env.DB,
      BOOKING_WITH_RELATIONS + ` WHERE b.id = ?`,
      [id]
    );

    const booking = transformBookingRow(bookingRow);

    // Send notifications
    await notifyBookingEvent(c.env.DB, id, 'created');

    return c.json({ success: true, data: booking });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update booking
bookings.put('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const updates = await c.req.json();

    let query = 'UPDATE bookings SET updated_at = datetime("now")';
    const params = [];

    const fields = [
      'doctor_id', 'machine_id', 'room_id', 'prep_room_id',
      'consult_room_id', 'user_id', 'patient_name', 'patient_hn', 'date',
      'start_time', 'end_time', 'prep_start_time', 'prep_end_time',
      'consult_start_time', 'consult_end_time',
      'status', 'notes', 'booking_type', 'is_consult_only'
    ];

    fields.forEach(field => {
      if (updates[field] !== undefined) {
        query += `, ${field} = ?`;
        params.push(updates[field]);
      }
    });

    query += ' WHERE id = ?';
    params.push(id);

    await executeRun(c.env.DB, query, params);

    // Update booking_procedures junction table
    if (updates.procedure_ids && Array.isArray(updates.procedure_ids)) {
      // Delete old links
      await executeRun(c.env.DB, 'DELETE FROM booking_procedures WHERE booking_id = ?', [id]);

      // Insert new links
      for (const pId of updates.procedure_ids) {
        const linkId = generateId();
        await executeRun(
          c.env.DB,
          'INSERT INTO booking_procedures (id, booking_id, procedure_id) VALUES (?, ?, ?)',
          [linkId, id, pId]
        );
      }
    }

    const bookingRow = await executeOne(
      c.env.DB,
      BOOKING_WITH_RELATIONS + ` WHERE b.id = ?`,
      [id]
    );

    const booking = transformBookingRow(bookingRow);

    // Send notifications
    await notifyBookingEvent(c.env.DB, id, 'updated');

    return c.json(booking);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Cancel booking
bookings.patch('/:id/cancel', async (c) => {
  try {
    const { id } = c.req.param();
    await executeRun(
      c.env.DB,
      'UPDATE bookings SET status = "CANCELLED", updated_at = datetime("now") WHERE id = ?',
      [id]
    );

    const booking = await executeOne(c.env.DB, 'SELECT * FROM bookings WHERE id = ?', [id]);

    // Send notifications
    await notifyBookingEvent(c.env.DB, id, 'cancelled');

    return c.json(booking);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete booking
bookings.delete('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    await executeRun(c.env.DB, 'DELETE FROM bookings WHERE id = ?', [id]);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default bookings;
