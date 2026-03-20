import { Hono } from 'hono';
import { executeQuery, executeOne, executeRun, generateId } from '../utils/db.js';
import { calculateAvailability } from '../utils/availability.js';
import { VALIDATION_MESSAGES } from '../utils/constants.js';

const machines = new Hono();

// Get all machines with room info
machines.get('/', async (c) => {
  try {
    const category = c.req.query('category'); // 'MEDICAL' or 'MEETING'
    const includeProcedures = c.req.query('include_procedures') === 'true';

    let query = `SELECT m.*, GROUP_CONCAT(r.name, ', ') as room_name, GROUP_CONCAT(r.id, ',') as room_ids
       FROM machines m 
       LEFT JOIN machine_rooms mr ON m.id = mr.machine_id
       LEFT JOIN rooms r ON mr.room_id = r.id`;

    const params = [];
    if (category) {
      query += ' WHERE m.machine_type_category = ?';
      params.push(category);
    }

    query += ' GROUP BY m.id ORDER BY m.name';

    const results = await executeQuery(c.env.DB, query, params);

    // If include_procedures is true, fetch procedures for each machine
    if (includeProcedures) {
      for (const machine of results) {
        const procedures = await executeQuery(
          c.env.DB,
          `SELECT p.* 
           FROM procedures p
           INNER JOIN machine_procedures mp ON p.id = mp.procedure_id
           WHERE mp.machine_id = ? AND p.is_active = 1
           ORDER BY p.name`,
          [machine.id]
        );
        machine.procedures = procedures;
      }
    }

    return c.json(results);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get available machines
machines.get('/available', async (c) => {
  try {
    const category = c.req.query('category'); // 'MEDICAL' or 'MEETING'

    let query = `SELECT m.*, GROUP_CONCAT(r.name, ', ') as room_name, GROUP_CONCAT(r.id, ',') as room_ids
       FROM machines m 
       LEFT JOIN machine_rooms mr ON m.id = mr.machine_id
       LEFT JOIN rooms r ON mr.room_id = r.id 
       WHERE m.is_available = 1`;

    const params = [];
    if (category) {
      query += ' AND m.machine_type_category = ?';
      params.push(category);
    }

    query += ' GROUP BY m.id ORDER BY m.name';

    const results = await executeQuery(c.env.DB, query, params);
    return c.json(results);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get machines by type
machines.get('/type/:type', async (c) => {
  try {
    const { type } = c.req.param();

    if (!VALID_MACHINE_TYPES.includes(type.toUpperCase())) {
      return c.json({ success: false, error: VALIDATION_MESSAGES.INVALID_TYPE }, 400);
    }

    const results = await executeQuery(
      c.env.DB,
      `SELECT m.*, GROUP_CONCAT(r.name, ', ') as room_name, GROUP_CONCAT(r.id, ',') as room_ids
       FROM machines m 
       LEFT JOIN machine_rooms mr ON m.id = mr.machine_id
       LEFT JOIN rooms r ON mr.room_id = r.id 
       WHERE m.type = ? 
       GROUP BY m.id
       ORDER BY m.name`,
      [type.toUpperCase()]
    );
    return c.json(results);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get machine by ID
machines.get('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const includeProcedures = c.req.query('include_procedures') === 'true';

    const machine = await executeOne(
      c.env.DB,
      `SELECT m.*, GROUP_CONCAT(r.name, ', ') as room_name, GROUP_CONCAT(r.id, ',') as room_ids 
       FROM machines m 
       LEFT JOIN machine_rooms mr ON m.id = mr.machine_id
       LEFT JOIN rooms r ON mr.room_id = r.id 
       WHERE m.id = ?
       GROUP BY m.id`,
      [id]
    );

    if (!machine) {
      return c.json({ success: false, error: 'Machine not found' }, 404);
    }

    // If include_procedures is true, get procedures for this machine
    if (includeProcedures) {
      const procedures = await executeQuery(
        c.env.DB,
        `SELECT p.*
         FROM procedures p
         INNER JOIN machine_procedures mp ON p.id = mp.procedure_id
         WHERE mp.machine_id = ? AND p.is_active = 1
         ORDER BY p.name`,
        [id]
      );
      machine.procedures = procedures;
    }

    return c.json(machine);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get machine availability
machines.get('/:id/availability', async (c) => {
  try {
    const { id } = c.req.param();
    const date = c.req.query('date') || new Date().toISOString().split('T')[0];

    // Get all bookings for this machine on this date
    const bookings = await executeQuery(
      c.env.DB,
      `SELECT b.*, r.name as room_name, d.name as doctor_name 
       FROM bookings b
       LEFT JOIN rooms r ON b.room_id = r.id
       LEFT JOIN users d ON b.doctor_id = d.id
       WHERE b.machine_id = ? AND b.date = ? AND b.status != 'CANCELLED'
       ORDER BY b.start_time ASC`,
      [id, date]
    );

    // Use shared availability calculator
    const availability = calculateAvailability(bookings, date);
    return c.json(availability);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create machine
machines.post('/', async (c) => {
  try {
    const { name, type, room_id, room_ids, is_available, machine_type_category } = await c.req.json();

    if (!name || !type) {
      return c.json({ success: false, error: VALIDATION_MESSAGES.MISSING_FIELDS }, 400);
    }

    const validTypes = ['MOVABLE', 'FIXED'];
    if (!validTypes.includes(type.toUpperCase())) {
      return c.json({ success: false, error: VALIDATION_MESSAGES.INVALID_TYPE }, 400);
    }

    // Check for either room_id (legacy) or room_ids (new)
    const effectiveRoomId = (room_ids && room_ids.length > 0) ? room_ids[0] : room_id;
    if (type.toUpperCase() === 'FIXED' && !effectiveRoomId) {
      return c.json({ success: false, error: VALIDATION_MESSAGES.FIXED_MACHINE_NEEDS_ROOM }, 400);
    }

    const id = generateId();
    const available = is_available !== undefined ? (is_available ? 1 : 0) : 1;
    const category = machine_type_category || 'MEDICAL'; // Default to MEDICAL if not specified

    await executeRun(
      c.env.DB,
      'INSERT INTO machines (id, name, type, room_id, is_available, machine_type_category) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, type.toUpperCase(), effectiveRoomId || null, available, category]
    );

    // Save multiple rooms if provided
    if (room_ids && Array.from(room_ids).length > 0) {
      for (const roomId of room_ids) {
        await executeRun(
          c.env.DB,
          'INSERT INTO machine_rooms (id, machine_id, room_id) VALUES (?, ?, ?)',
          [generateId(), id, roomId]
        );
      }
    } else if (room_id) {
      // Logic for single room_id (legacy)
      await executeRun(
        c.env.DB,
        'INSERT INTO machine_rooms (id, machine_id, room_id) VALUES (?, ?, ?)',
        [generateId(), id, room_id]
      );
    }

    const machine = await executeOne(
      c.env.DB,
      `SELECT m.*, GROUP_CONCAT(r.name, ', ') as room_name, GROUP_CONCAT(r.id, ',') as room_ids 
       FROM machines m 
       LEFT JOIN machine_rooms mr ON m.id = mr.machine_id
       LEFT JOIN rooms r ON mr.room_id = r.id 
       WHERE m.id = ?
       GROUP BY m.id`,
      [id]
    );

    return c.json(machine);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update machine
machines.put('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const { name, type, room_id, room_ids, is_available, machine_type_category } = await c.req.json();

    let query = 'UPDATE machines SET updated_at = datetime("now")';
    const params = [];

    if (name) {
      query += ', name = ?';
      params.push(name);
    }
    if (type) {
      const validTypes = ['MOVABLE', 'FIXED'];
      if (!validTypes.includes(type.toUpperCase())) {
        return c.json({ success: false, error: VALIDATION_MESSAGES.INVALID_TYPE }, 400);
      }
      query += ', type = ?';
      params.push(type.toUpperCase());
    }

    // Legacy support and sync with first room
    const effectiveRoomId = (room_ids && room_ids.length > 0) ? room_ids[0] : room_id;
    if (effectiveRoomId !== undefined) {
      query += ', room_id = ?';
      params.push(effectiveRoomId || null);
    }

    if (is_available !== undefined) {
      query += ', is_available = ?';
      params.push(is_available ? 1 : 0);
    }
    if (machine_type_category) {
      query += ', machine_type_category = ?';
      params.push(machine_type_category);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await executeRun(c.env.DB, query, params);

    // Update multiple rooms if room_ids provided
    if (room_ids !== undefined) {
      // Clear existing rooms
      await executeRun(c.env.DB, 'DELETE FROM machine_rooms WHERE machine_id = ?', [id]);

      // Add new rooms
      if (room_ids && Array.from(room_ids).length > 0) {
        for (const roomId of room_ids) {
          await executeRun(
            c.env.DB,
            'INSERT INTO machine_rooms (id, machine_id, room_id) VALUES (?, ?, ?)',
            [generateId(), id, roomId]
          );
        }
      }
    } else if (room_id !== undefined) {
      // Legacy single room update
      await executeRun(c.env.DB, 'DELETE FROM machine_rooms WHERE machine_id = ?', [id]);
      if (room_id) {
        await executeRun(
          c.env.DB,
          'INSERT INTO machine_rooms (id, machine_id, room_id) VALUES (?, ?, ?)',
          [generateId(), id, room_id]
        );
      }
    }

    const machine = await executeOne(
      c.env.DB,
      `SELECT m.*, GROUP_CONCAT(r.name, ', ') as room_name, GROUP_CONCAT(r.id, ',') as room_ids 
       FROM machines m 
       LEFT JOIN machine_rooms mr ON m.id = mr.machine_id
       LEFT JOIN rooms r ON mr.room_id = r.id 
       WHERE m.id = ?
       GROUP BY m.id`,
      [id]
    );

    return c.json(machine);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Bulk link procedures to machine
machines.post('/:id/procedures/bulk', async (c) => {
  try {
    const { id } = c.req.param();
    const { procedure_ids } = await c.req.json();

    if (!procedure_ids || !Array.isArray(procedure_ids)) {
      return c.json({ success: false, error: 'procedure_ids array is required' }, 400);
    }

    // Check if machine exists
    const machine = await executeOne(c.env.DB, 'SELECT id FROM machines WHERE id = ?', [id]);
    if (!machine) {
      return c.json({ success: false, error: 'Machine not found' }, 404);
    }

    // Delete existing procedure links for this machine
    await executeRun(c.env.DB, 'DELETE FROM machine_procedures WHERE machine_id = ?', [id]);

    // Insert new procedure links
    for (const procedureId of procedure_ids) {
      await executeRun(
        c.env.DB,
        'INSERT INTO machine_procedures (id, machine_id, procedure_id) VALUES (?, ?, ?)',
        [generateId(), id, procedureId]
      );
    }

    // Get updated machine with procedures
    const procedures = await executeQuery(
      c.env.DB,
      `SELECT p.*
       FROM procedures p
       INNER JOIN machine_procedures mp ON p.id = mp.procedure_id
       WHERE mp.machine_id = ? AND p.is_active = 1
       ORDER BY p.name`,
      [id]
    );

    return c.json({ success: true, procedures });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete machine
machines.delete('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    await executeRun(c.env.DB, 'DELETE FROM machines WHERE id = ?', [id]);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default machines;
