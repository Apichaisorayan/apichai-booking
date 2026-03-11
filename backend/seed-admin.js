import { Hono } from 'hono';
import { hashPassword } from './src/utils/hash.js';
import { executeRun, generateId } from './src/utils/db.js';

const app = new Hono();

app.get('/', async (c) => {
  try {
    // Admin user details
    const adminEmail = 'admin01@gmail.com';
    const adminPassword = '123456Aa';
    const adminName = 'Admin';
    const adminRole = 'ADMIN';

    // Hash password
    const hashedPassword = await hashPassword(adminPassword);
    const id = generateId();

    // Insert admin user
    await executeRun(
      c.env.DB,
      'INSERT OR REPLACE INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [id, adminName, adminEmail.toLowerCase(), hashedPassword, adminRole]
    );

    return c.json({
      success: true,
      message: 'Admin user created successfully',
      credentials: {
        email: adminEmail,
        password: adminPassword,
        note: 'Please change this password after first login'
      }
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

export default app;
