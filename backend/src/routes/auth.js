import { Hono } from 'hono';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { generateToken, authMiddleware, adminMiddleware } from '../utils/jwt.js';
import { executeOne, executeRun, generateId } from '../utils/db.js';
import { authRateLimit } from '../utils/rateLimit.js';

const auth = new Hono();

// Register (Admin only)
auth.post('/register', authMiddleware, adminMiddleware, authRateLimit, async (c) => {
  try {
    const { name, email, password, role } = await c.req.json();

    if (!name || !email || !password || !role) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    // Validate password length
    if (password.length < 6) {
      return c.json({ success: false, error: 'Password must be at least 6 characters' }, 400);
    }

    // Validate password strength (optional: at least one letter and one number)
    if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
      return c.json({ success: false, error: 'Password must contain at least one letter and one number' }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ success: false, error: 'Invalid email format' }, 400);
    }

    if (!['ADMIN', 'DOCTOR', 'SALES', 'CRM'].includes(role.toUpperCase())) {
      return c.json({ success: false, error: 'Invalid role' }, 400);
    }

    // Check if user exists
    const existing = await executeOne(
      c.env.DB,
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (existing) {
      return c.json({ success: false, error: 'Registration failed. Please check your information.' }, 400);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);
    const id = generateId();

    // Create user (store email in lowercase for consistency)
    await executeRun(
      c.env.DB,
      'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [id, name, email.toLowerCase(), hashedPassword, role.toUpperCase()]
    );

    // Get created user
    const user = await executeOne(
      c.env.DB,
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [id]
    );

    // Generate token with version
    if (!c.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET is not configured! Please set it with: wrangler secret put JWT_SECRET');
      return c.json({
        success: false,
        error: 'Server configuration error. Please contact administrator.'
      }, 500);
    }

    const token = await generateToken(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        tokenVersion: 2 // Increment this to invalidate all old tokens
      },
      c.env.JWT_SECRET
    );

    return c.json({
      success: true,
      message: 'Registration successful',
      user,
      token,
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Login
auth.post('/login', authRateLimit, async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ success: false, error: 'Missing email or password' }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Get user (use lowercase email for consistency)
    const user = await executeOne(
      c.env.DB,
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!user) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Verify password
    const isValid = await comparePassword(password, user.password);

    if (!isValid) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Generate token with version
    if (!c.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET is not configured! Please set it with: wrangler secret put JWT_SECRET');
      return c.json({
        success: false,
        error: 'Server configuration error. Please contact administrator.'
      }, 500);
    }

    const token = await generateToken(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        tokenVersion: 2 // Increment this to invalidate all old tokens
      },
      c.env.JWT_SECRET
    );

    // Remove password from response
    delete user.password;

    return c.json({
      success: true,
      message: 'Login successful',
      user,
      token,
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get current user
auth.get('/me', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');

    const user = await executeOne(
      c.env.DB,
      'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    return c.json({ success: true, user });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default auth;
