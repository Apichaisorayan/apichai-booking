import { Hono } from 'hono';
import { authMiddleware } from '../utils/jwt.js';
import { executeQuery, executeOne, executeRun, generateId } from '../utils/db.js';

const notifications = new Hono();

// Apply auth middleware to all routes
notifications.use('*', authMiddleware);

// Get all notifications for current user
notifications.get('/', async (c) => {
  try {
    const { userId } = c.get('user');
    const unreadOnly = c.req.query('unread') === 'true';
    const limit = parseInt(c.req.query('limit') || '50');
    
    let query = `
      SELECT * FROM notifications 
      WHERE user_id = ?
    `;
    
    if (unreadOnly) {
      query += ' AND is_read = 0';
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    
    const results = await executeQuery(c.env.DB, query, [userId, limit]);
    
    return c.json({
      success: true,
      data: results,
      unread_count: results.filter(n => !n.is_read).length
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get unread count
notifications.get('/unread-count', async (c) => {
  try {
    const { userId } = c.get('user');
    
    const result = await executeOne(
      c.env.DB,
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    
    return c.json({
      success: true,
      count: result?.count || 0
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Mark notification as read
notifications.patch('/:id/read', async (c) => {
  try {
    const { userId } = c.get('user');
    const { id } = c.req.param();
    
    // Verify notification belongs to user
    const notification = await executeOne(
      c.env.DB,
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (!notification) {
      return c.json({ success: false, error: 'Notification not found' }, 404);
    }
    
    await executeRun(
      c.env.DB,
      'UPDATE notifications SET is_read = 1, read_at = datetime("now") WHERE id = ?',
      [id]
    );
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Mark all as read
notifications.patch('/mark-all-read', async (c) => {
  try {
    const { userId } = c.get('user');
    
    await executeRun(
      c.env.DB,
      'UPDATE notifications SET is_read = 1, read_at = datetime("now") WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete notification
notifications.delete('/:id', async (c) => {
  try {
    const { userId } = c.get('user');
    const { id } = c.req.param();
    
    // Verify notification belongs to user
    const notification = await executeOne(
      c.env.DB,
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (!notification) {
      return c.json({ success: false, error: 'Notification not found' }, 404);
    }
    
    await executeRun(c.env.DB, 'DELETE FROM notifications WHERE id = ?', [id]);
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create notification (internal use)
export async function createNotification(db, data) {
  const { userId, type, title, message, relatedId, relatedType } = data;
  const id = generateId();
  
  await executeRun(
    db,
    `INSERT INTO notifications (id, user_id, type, title, message, related_id, related_type) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, type, title, message, relatedId || null, relatedType || null]
  );
  
  return id;
}

// Notify all relevant users about a booking event
export async function notifyBookingEvent(db, bookingId, eventType) {
  try {
    // Get booking details
    const booking = await executeOne(
      db,
      `SELECT b.*, u.name as doctor_name, r.name as room_name, m.name as machine_name
       FROM bookings b
       LEFT JOIN users u ON b.doctor_id = u.id
       LEFT JOIN rooms r ON b.room_id = r.id
       LEFT JOIN machines m ON b.machine_id = m.id
       WHERE b.id = ?`,
      [bookingId]
    );
    
    if (!booking) return;
    
    // Get all users who should be notified (doctors, sales, crm, admin)
    const users = await executeQuery(
      db,
      "SELECT id, role FROM users WHERE role IN ('DOCTOR', 'SALES', 'CRM', 'ADMIN')"
    );
    
    let title, message, type;
    
    switch (eventType) {
      case 'created':
        title = 'การจองใหม่';
        message = `${booking.patient_name} จองนัด${booking.booking_type === 'MEETING' ? 'ห้องประชุม' : 'หัตถการ'} ${booking.date} ${booking.start_time}`;
        type = 'BOOKING_CREATED';
        break;
      case 'cancelled':
        title = 'ยกเลิกนัดหมาย';
        message = `${booking.patient_name} ยกเลิกนัด ${booking.date} ${booking.start_time}`;
        type = 'BOOKING_CANCELLED';
        break;
      case 'updated':
        title = 'แก้ไขนัดหมาย';
        message = `นัดหมายของ ${booking.patient_name} ถูกแก้ไข ${booking.date} ${booking.start_time}`;
        type = 'BOOKING_UPDATED';
        break;
    }
    
    // Create notifications for relevant users
    for (const user of users) {
      // Notify doctor if it's their booking
      if (user.id === booking.doctor_id) {
        await createNotification(db, {
          userId: user.id,
          type,
          title,
          message,
          relatedId: bookingId,
          relatedType: 'booking'
        });
      }
      // Notify all admin, sales, crm
      else if (['ADMIN', 'SALES', 'CRM'].includes(user.role)) {
        await createNotification(db, {
          userId: user.id,
          type,
          title,
          message,
          relatedId: bookingId,
          relatedType: 'booking'
        });
      }
    }
  } catch (error) {
    console.error('Error creating booking notifications:', error);
  }
}

export default notifications;
