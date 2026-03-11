import { Hono } from 'hono';
import { executeQuery, executeOne, executeRun, generateId } from '../utils/db.js';

const procedures = new Hono();

// Get all procedures
procedures.get('/', async (c) => {
  try {
    const isActive = c.req.query('is_active');

    let query = 'SELECT * FROM procedures';
    const params = [];

    if (isActive !== undefined) {
      query += ' WHERE is_active = ?';
      params.push(isActive === 'true' ? 1 : 0);
    }

    query += ' ORDER BY name';

    const results = await executeQuery(c.env.DB, query, params);
    return c.json(results);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get procedure by ID
procedures.get('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const procedure = await executeOne(
      c.env.DB,
      'SELECT * FROM procedures WHERE id = ?',
      [id]
    );

    if (!procedure) {
      return c.json({ success: false, error: 'Procedure not found' }, 404);
    }

    return c.json(procedure);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get procedures for a specific machine
procedures.get('/machine/:machineId', async (c) => {
  try {
    const { machineId } = c.req.param();

    const results = await executeQuery(
      c.env.DB,
      `SELECT p.* 
       FROM procedures p
       INNER JOIN machine_procedures mp ON p.id = mp.procedure_id
       WHERE mp.machine_id = ? AND p.is_active = 1
       ORDER BY p.name`,
      [machineId]
    );

    return c.json(results);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get machines for a specific procedure
procedures.get('/:id/machines', async (c) => {
  try {
    const { id } = c.req.param();

    const results = await executeQuery(
      c.env.DB,
      `SELECT m.*, r.name as room_name 
       FROM machines m
       LEFT JOIN rooms r ON m.room_id = r.id
       INNER JOIN machine_procedures mp ON m.id = mp.machine_id
       WHERE mp.procedure_id = ? AND m.is_available = 1
       ORDER BY m.name`,
      [id]
    );

    return c.json(results);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create procedure
procedures.post('/', async (c) => {
  try {
    const { name, description, duration_minutes, prep_duration_minutes, is_active } = await c.req.json();

    if (!name) {
      return c.json({ success: false, error: 'Name is required' }, 400);
    }

    const id = generateId();
    const active = is_active !== undefined ? (is_active ? 1 : 0) : 1;
    const duration = duration_minutes || 30;
    const prepDuration = prep_duration_minutes || 0;

    await executeRun(
      c.env.DB,
      'INSERT INTO procedures (id, name, description, duration_minutes, prep_duration_minutes, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, description || null, duration, prepDuration, active]
    );

    const procedure = await executeOne(
      c.env.DB,
      'SELECT * FROM procedures WHERE id = ?',
      [id]
    );

    return c.json(procedure);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update procedure
procedures.put('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const { name, description, duration_minutes, prep_duration_minutes, is_active } = await c.req.json();

    let query = 'UPDATE procedures SET updated_at = datetime("now")';
    const params = [];

    if (name !== undefined) {
      query += ', name = ?';
      params.push(name);
    }
    if (description !== undefined) {
      query += ', description = ?';
      params.push(description);
    }
    if (duration_minutes !== undefined) {
      query += ', duration_minutes = ?';
      params.push(duration_minutes);
    }
    if (prep_duration_minutes !== undefined) {
      query += ', prep_duration_minutes = ?';
      params.push(prep_duration_minutes);
    }
    if (is_active !== undefined) {
      query += ', is_active = ?';
      params.push(is_active ? 1 : 0);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await executeRun(c.env.DB, query, params);

    const procedure = await executeOne(
      c.env.DB,
      'SELECT * FROM procedures WHERE id = ?',
      [id]
    );

    return c.json(procedure);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete procedure
procedures.delete('/:id', async (c) => {
  try {
    const { id } = c.req.param();

    // Delete related machine_procedures first (cascade should handle this, but being explicit)
    await executeRun(c.env.DB, 'DELETE FROM machine_procedures WHERE procedure_id = ?', [id]);

    // Delete the procedure
    await executeRun(c.env.DB, 'DELETE FROM procedures WHERE id = ?', [id]);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Link procedure to machine
procedures.post('/:id/machines/:machineId', async (c) => {
  try {
    const { id, machineId } = c.req.param();

    // Check if procedure exists
    const procedure = await executeOne(
      c.env.DB,
      'SELECT * FROM procedures WHERE id = ?',
      [id]
    );

    if (!procedure) {
      return c.json({ success: false, error: 'Procedure not found' }, 404);
    }

    // Check if machine exists
    const machine = await executeOne(
      c.env.DB,
      'SELECT * FROM machines WHERE id = ?',
      [machineId]
    );

    if (!machine) {
      return c.json({ success: false, error: 'Machine not found' }, 404);
    }

    // Check if link already exists
    const existing = await executeOne(
      c.env.DB,
      'SELECT * FROM machine_procedures WHERE machine_id = ? AND procedure_id = ?',
      [machineId, id]
    );

    if (existing) {
      return c.json({ success: false, error: 'Link already exists' }, 400);
    }

    const linkId = generateId();
    await executeRun(
      c.env.DB,
      'INSERT INTO machine_procedures (id, machine_id, procedure_id) VALUES (?, ?, ?)',
      [linkId, machineId, id]
    );

    return c.json({ success: true, id: linkId });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Unlink procedure from machine
procedures.delete('/:id/machines/:machineId', async (c) => {
  try {
    const { id, machineId } = c.req.param();

    await executeRun(
      c.env.DB,
      'DELETE FROM machine_procedures WHERE machine_id = ? AND procedure_id = ?',
      [machineId, id]
    );

    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Bulk link procedures to machine
procedures.post('/machines/:machineId/bulk', async (c) => {
  try {
    const { machineId } = c.req.param();
    const { procedure_ids } = await c.req.json();

    if (!Array.isArray(procedure_ids)) {
      return c.json({ success: false, error: 'procedure_ids must be an array' }, 400);
    }

    // Check if machine exists
    const machine = await executeOne(
      c.env.DB,
      'SELECT * FROM machines WHERE id = ?',
      [machineId]
    );

    if (!machine) {
      return c.json({ success: false, error: 'Machine not found' }, 404);
    }

    // Delete existing links
    await executeRun(
      c.env.DB,
      'DELETE FROM machine_procedures WHERE machine_id = ?',
      [machineId]
    );

    // Insert new links
    const links = [];
    for (const procedureId of procedure_ids) {
      const linkId = generateId();
      await executeRun(
        c.env.DB,
        'INSERT INTO machine_procedures (id, machine_id, procedure_id) VALUES (?, ?, ?)',
        [linkId, machineId, procedureId]
      );
      links.push({ id: linkId, machine_id: machineId, procedure_id: procedureId });
    }

    return c.json({ success: true, links });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default procedures;
