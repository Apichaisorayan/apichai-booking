import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import roomsRoutes from './routes/rooms.js';
import machinesRoutes from './routes/machines.js';
import proceduresRoutes from './routes/procedures.js';
import bookingsRoutes from './routes/bookings.js';
import imagesRoutes from './routes/images.js';
import calendarRoutes from './routes/calendar.js';
import notificationsRoutes from './routes/notifications.js';

const app = new Hono();

// Middleware
app.use('*', logger());

// CORS configuration - Allow all origins for QA testing
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin') || '*';
  
  // Set CORS headers - Allow all origins for now
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After');
  c.header('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After');
  c.header('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }

  await next();
});

// Health check
app.get('/', (c) => {
  return c.json({
    success: true,
    message: '🚀 Beauty Clinic API - Cloudflare Workers',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => {
  return c.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/users', usersRoutes);
app.route('/api/rooms', roomsRoutes);
app.route('/api/machines', machinesRoutes);
app.route('/api/procedures', proceduresRoutes);
app.route('/api/bookings', bookingsRoutes);
app.route('/api/images', imagesRoutes);
app.route('/api/calendar', calendarRoutes);
app.route('/api/notifications', notificationsRoutes);

// 404 Handler
app.notFound((c) => {
  return c.json({ success: false, error: 'Not Found' }, 404);
});

// Error Handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    success: false,
    error: err.message || 'Internal Server Error',
  }, 500);
});

export default app;
