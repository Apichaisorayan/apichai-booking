import { Hono } from 'hono';
import { executeQuery, executeOne, executeRun, generateId } from '../utils/db.js';
import { calculateAvailability } from '../utils/availability.js';
import { VALIDATION_MESSAGES } from '../utils/constants.js';

const rooms = new Hono();

// Get all rooms
rooms.get('/', async (c) => {
  try {
    const type = c.req.query('type'); // 'PROCEDURE', 'MEETING', or 'BOTH'

    let query = 'SELECT * FROM rooms';
    const params = [];

    if (type) {
      if (type === 'PROCEDURE') {
        query += ' WHERE room_type IN (?, ?, ?, ?, ?)';
        params.push('PROCEDURE', 'PREP', 'CONSULTATION', 'TREATMENT', 'BOTH');
      } else {
        query += ' WHERE room_type = ? OR room_type = ?';
        params.push(type, 'BOTH');
      }
    }

    query += ' ORDER BY name';

    const results = await executeQuery(c.env.DB, query, params);
    return c.json(results);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get available rooms
rooms.get('/available', async (c) => {
  try {
    const type = c.req.query('type'); // 'PROCEDURE', 'MEETING', or 'BOTH'

    let query = 'SELECT * FROM rooms WHERE is_available = 1';
    const params = [];

    if (type) {
      if (type === 'PROCEDURE') {
        query += ' AND room_type IN (?, ?, ?, ?, ?)';
        params.push('PROCEDURE', 'PREP', 'CONSULTATION', 'TREATMENT', 'BOTH');
      } else {
        query += ' AND (room_type = ? OR room_type = ?)';
        params.push(type, 'BOTH');
      }
    }

    query += ' ORDER BY name';

    const results = await executeQuery(c.env.DB, query, params);
    return c.json(results);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get room by ID
rooms.get('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const room = await executeOne(
      c.env.DB,
      'SELECT * FROM rooms WHERE id = ?',
      [id]
    );

    if (!room) {
      return c.json({ success: false, error: 'Room not found' }, 404);
    }

    return c.json(room);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get room availability
rooms.get('/:id/availability', async (c) => {
  try {
    const { id } = c.req.param();
    const date = c.req.query('date') || new Date().toISOString().split('T')[0];

    // Get all bookings for this room on this date
    // Check all roles: Treatment, Prep, Consult
    const bookings = await executeQuery(
      c.env.DB,
      `SELECT b.*, m.name as machine_name, d.name as doctor_name 
       FROM bookings b
       LEFT JOIN machines m ON b.machine_id = m.id
       LEFT JOIN users d ON b.doctor_id = d.id
       WHERE (b.room_id = ? OR b.prep_room_id = ? OR b.consult_room_id = ?) 
       AND b.date = ? 
       AND b.status != 'CANCELLED'
       ORDER BY b.start_time ASC`,
      [id, id, id, date]
    );

    // Transform bookings into busy intervals
    // A single booking might use the room for multiple stages, so we extract all relevant intervals
    const busyIntervals = [];

    bookings.forEach(booking => {
      // 1. Used as Treatment Room
      if (booking.room_id === id && booking.start_time && booking.end_time) {
        busyIntervals.push({
          ...booking,
          start_time: booking.start_time,
          end_time: booking.end_time,
          notes: booking.notes || 'Treatment' // Specific note for this stage
        });
      }

      // 2. Used as Prep Room
      if (booking.prep_room_id === id && booking.prep_start_time && booking.prep_end_time) {
        busyIntervals.push({
          ...booking,
          start_time: booking.prep_start_time,
          end_time: booking.prep_end_time,
          notes: 'Prep/Anesthesia' + (booking.notes ? ` (${booking.notes})` : '')
        });
      }

      // 3. Used as Consult Room
      if (booking.consult_room_id === id && booking.consult_start_time && booking.consult_end_time) {
        busyIntervals.push({
          ...booking,
          start_time: booking.consult_start_time,
          end_time: booking.consult_end_time,
          notes: 'Consultation' + (booking.notes ? ` (${booking.notes})` : '')
        });
      }
    });

    // Sort by start time
    busyIntervals.sort((a, b) => a.start_time.localeCompare(b.start_time));

    // Use shared availability calculator with the transformed intervals
    const availability = calculateAvailability(busyIntervals, date);
    return c.json(availability);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create room
rooms.post('/', async (c) => {
  try {
    const { name, is_available, room_type } = await c.req.json();

    if (!name) {
      return c.json({ success: false, error: VALIDATION_MESSAGES.MISSING_FIELDS }, 400);
    }

    const id = generateId();
    const available = is_available !== undefined ? (is_available ? 1 : 0) : 1;
    const type = room_type || 'PROCEDURE'; // Default to PROCEDURE if not specified

    await executeRun(
      c.env.DB,
      'INSERT INTO rooms (id, name, is_available, room_type) VALUES (?, ?, ?, ?)',
      [id, name, available, type]
    );

    const room = await executeOne(
      c.env.DB,
      'SELECT * FROM rooms WHERE id = ?',
      [id]
    );

    return c.json(room);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update room
rooms.put('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const { name, is_available, room_type } = await c.req.json();

    let query = 'UPDATE rooms SET updated_at = datetime("now")';
    const params = [];

    if (name) {
      query += ', name = ?';
      params.push(name);
    }
    if (is_available !== undefined) {
      query += ', is_available = ?';
      params.push(is_available ? 1 : 0);
    }
    if (room_type) {
      query += ', room_type = ?';
      params.push(room_type);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await executeRun(c.env.DB, query, params);

    const room = await executeOne(
      c.env.DB,
      'SELECT * FROM rooms WHERE id = ?',
      [id]
    );

    return c.json(room);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete room
rooms.delete('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    await executeRun(c.env.DB, 'DELETE FROM rooms WHERE id = ?', [id]);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default rooms;
