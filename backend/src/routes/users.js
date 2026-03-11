import { Hono } from 'hono';
import { hashPassword } from '../utils/hash.js';
import { executeQuery, executeOne, executeRun, generateId } from '../utils/db.js';
import { calculateAvailability } from '../utils/availability.js';
import { VALID_ROLES } from '../utils/constants.js';
import { calculateThreeStageDoctorBusyBlocks, getThreeStageAnchorTime } from '../utils/bookingHelper.js';
import { authMiddleware, adminMiddleware } from '../utils/jwt.js';


const users = new Hono();

// Get all users (Authenticated only)
users.get('/', authMiddleware, async (c) => {
  try {
    const results = await executeQuery(
      c.env.DB,
      'SELECT id, name, email, password, role, is_available, created_at, updated_at FROM users ORDER BY name'
    );
    return c.json(results);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get user by ID (Authenticated only)
users.get('/:id', authMiddleware, async (c) => {
  try {
    const { id } = c.req.param();
    const user = await executeOne(
      c.env.DB,
      'SELECT id, name, email, role, is_available, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    return c.json(user);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get user availability (Authenticated only)
users.get('/:id/availability', authMiddleware, async (c) => {
  try {
    const { id } = c.req.param();
    const date = c.req.query('date') || new Date().toISOString().split('T')[0];

    // Get all bookings for this doctor on this date with procedure names
    const bookings = await executeQuery(
      c.env.DB,
      `SELECT b.*, r.name as room_name, m.name as machine_name,
              GROUP_CONCAT(p.name) as procedure_names
       FROM bookings b
       LEFT JOIN rooms r ON b.room_id = r.id
       LEFT JOIN machines m ON b.machine_id = m.id
       LEFT JOIN booking_procedures bp ON b.id = bp.booking_id
       LEFT JOIN procedures p ON bp.procedure_id = p.id
       WHERE b.doctor_id = ? AND b.date = ? AND b.status != 'CANCELLED'
       GROUP BY b.id
       ORDER BY b.start_time ASC`,
      [id, date]
    );

    // Transform bookings into actual busy intervals for the doctor
    let busyIntervals = [];

    bookings.forEach(booking => {
      const procedureNames = booking.procedure_names || '';
      const isMiraDry = !procedureNames.toLowerCase().includes('f/u') && procedureNames.toLowerCase().includes('miradry');

      if (isMiraDry) {
        const includeConsult = !!booking.consult_start_time;
        const anchorTime = getThreeStageAnchorTime(booking);
        const blocks = calculateThreeStageDoctorBusyBlocks(anchorTime, includeConsult);
        blocks.forEach(block => {
          busyIntervals.push({
            ...booking,
            start_time: block.start,
            end_time: block.end,
            notes: booking.notes || 'MiraDry Procedure'
          });
        });
      } else {
        // For non-3-stage procedures, add consult time if exists
        if (booking.consult_start_time && booking.consult_end_time) {
          busyIntervals.push({
            ...booking,
            start_time: booking.consult_start_time,
            end_time: booking.consult_end_time,
            notes: booking.notes || 'Consultation'
          });
        }
        
        // Add main treatment time
        busyIntervals.push({
          ...booking,
          start_time: booking.start_time,
          end_time: booking.end_time
        });
      }
    });

    busyIntervals.sort((a, b) => a.start_time.localeCompare(b.start_time));
    const availability = calculateAvailability(busyIntervals, date);
    return c.json(availability);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create user (Admin only)
users.post('/', authMiddleware, adminMiddleware, async (c) => {
  try {
    const { name, email, password, role, is_available } = await c.req.json();

    if (!name || !email || !password || !role) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    if (!VALID_ROLES.includes(role.toUpperCase())) {
      return c.json({ success: false, error: 'Invalid role' }, 400);
    }

    const existing = await executeOne(
      c.env.DB,
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (existing) {
      return c.json({ success: false, error: 'Email already exists' }, 400);
    }

    const hashedPassword = await hashPassword(password);
    const id = generateId();

    await executeRun(
      c.env.DB,
      'INSERT INTO users (id, name, email, password, role, is_available) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, email.toLowerCase(), hashedPassword, role.toUpperCase(), is_available !== undefined ? (is_available ? 1 : 0) : 1]
    );

    const user = await executeOne(
      c.env.DB,
      'SELECT id, name, email, role, is_available, created_at FROM users WHERE id = ?',
      [id]
    );

    return c.json({ success: true, data: user });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update user (Admin only)
users.put('/:id', authMiddleware, adminMiddleware, async (c) => {
  try {
    const { id } = c.req.param();
    const { name, email, password, role, is_available } = await c.req.json();

    let query = 'UPDATE users SET updated_at = datetime("now")';
    const params = [];

    if (name) {
      query += ', name = ?';
      params.push(name);
    }
    if (email) {
      query += ', email = ?';
      params.push(email.toLowerCase());
    }
    if (password) {
      const hashedPassword = await hashPassword(password);
      query += ', password = ?';
      params.push(hashedPassword);
    }
    if (role) {
      query += ', role = ?';
      params.push(role.toUpperCase());
    }
    if (is_available !== undefined) {
      query += ', is_available = ?';
      params.push(is_available ? 1 : 0);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await executeRun(c.env.DB, query, params);

    const user = await executeOne(
      c.env.DB,
      'SELECT id, name, email, role, is_available, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    return c.json(user);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete user (Admin only)
users.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  try {
    const { id } = c.req.param();
    await executeRun(c.env.DB, 'DELETE FROM users WHERE id = ?', [id]);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default users;
