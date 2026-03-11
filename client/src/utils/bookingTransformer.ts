/**
 * Booking Data Transformer
 * 
 * Transforms raw API booking data into the Appointment format
 * used by the calendar views. Extracted from AppointmentsCalendar
 * to eliminate duplication between fetchBookings & refreshAppointments.
 */
import type { Appointment } from '../types/appointment';
import { isStaffOnlyProcedureName } from '../constants/sharedBookingRules';

/**
 * Transform a single raw API booking object into an Appointment
 */
export function transformBookingToAppointment(booking: any): Appointment {
  const bookingDate = new Date(booking.date);

  // Actual treatment times
  const treatmentStartTime = booking.start_time ? booking.start_time.substring(0, 5) : '00:00';
  const treatmentEndTime = booking.end_time ? booking.end_time.substring(0, 5) : '00:00';

  // Check if this is a miraDry booking
  const isMiraDry = booking.procedures?.some((p: any) => {
    const name = p.name.toLowerCase();
    return !name.includes('f/u') && name.includes('miradry');
  });

  // Check if consultation procedure is included
  const hasConsultProcedure = booking.procedures?.some((p: any) => {
    const name = p.name.toLowerCase();
    return name.includes('ปรึกษา') || name.includes('consult');
  });

  // For miraDry bookings, if consult times are missing but consultation procedure exists,
  // we need to recalculate them based on prep times
  let consultStartTime = booking.consult_start_time ? booking.consult_start_time.substring(0, 5) : undefined;
  let consultEndTime = booking.consult_end_time ? booking.consult_end_time.substring(0, 5) : undefined;
  let prepStartTime = booking.prep_start_time ? booking.prep_start_time.substring(0, 5) : undefined;
  let prepEndTime = booking.prep_end_time ? booking.prep_end_time.substring(0, 5) : undefined;

  // Fix missing consult times for miraDry with consultation
  if (isMiraDry && hasConsultProcedure && !consultStartTime && prepStartTime) {
    // If prep starts at X, consult should start 30 minutes before
    const [h, m] = prepStartTime.split(':').map(Number);
    const prepStartMinutes = h * 60 + m;
    const consultStartMinutes = prepStartMinutes - 30;
    consultStartTime = `${Math.floor(consultStartMinutes / 60).toString().padStart(2, '0')}:${(consultStartMinutes % 60).toString().padStart(2, '0')}`;
    consultEndTime = prepStartTime;
  }

  // Determine doctor display name
  // If no doctor assigned, check if it's a staff-only procedure
  let doctorDisplay = booking.doctors?.name || 'N/A';
  if (!booking.doctors?.name || booking.doctors?.name === 'N/A') {
    // Check if any procedure is staff-only OR if machine is staff-only
    const hasStaffOnlyProcedure = booking.procedures?.some((p: any) => 
      isStaffOnlyProcedureName(p.name)
    );
    const hasStaffOnlyMachine = booking.machines?.name && 
      isStaffOnlyProcedureName(booking.machines.name);
    
    if (hasStaffOnlyProcedure || hasStaffOnlyMachine) {
      doctorDisplay = 'จนท.';
    }
  }

  return {
    id: booking.id,
    title: `${booking.patient_name} - ${booking.machines?.name || 'N/A'}`,
    patient: booking.patient_name,
    patient_hn: booking.patient_hn,
    doctor: doctorDisplay,
    doctorId: booking.doctor_id,
    treatment: booking.machines?.name || 'N/A',
    room: booking.rooms?.name || 'N/A',
    roomId: booking.room_id,
    prepRoom: booking.prep_rooms?.name || undefined,
    prepRoomId: booking.prep_room_id,
    machine: booking.machines?.name || 'N/A',
    machineId: booking.machine_id,
    procedure: booking.procedures && booking.procedures.length > 0
      ? (booking.procedures.length === 1
        ? booking.procedures[0].name
        : `${booking.procedures[0].name} และอีก ${booking.procedures.length - 1} รายการ`)
      : undefined,
    procedures: booking.procedures || [],
    procedureId: booking.procedures && booking.procedures.length > 0 ? booking.procedures[0].id : undefined,
    date: bookingDate,
    startTime: treatmentStartTime,
    endTime: treatmentEndTime,
    prepStartTime: prepStartTime,
    prepEndTime: prepEndTime,
    consultRoom: booking.consult_rooms?.name || undefined,
    consultRoomId: booking.consult_room_id,
    consultStartTime: consultStartTime,
    consultEndTime: consultEndTime,
    color: '',
    status: booking.status,
    notes: booking.notes || '',
    createdBy: booking.users?.name || 'ไม่ระบุ',
    createdByRole: booking.users?.role || '',
    isConsultOnly: booking.booking_type === 'CONSULTATION',
    treatmentStartTime: booking.start_time ? booking.start_time.substring(0, 5) : undefined,
  };
}

/**
 * Transform an array of raw API bookings, filtering out cancelled ones
 */
export function transformBookings(data: any[]): Appointment[] {
  return data
    .filter((booking: any) => booking.status !== 'CANCELLED')
    .map(transformBookingToAppointment);
}
