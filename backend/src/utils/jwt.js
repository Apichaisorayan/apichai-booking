import jwt from '@tsndr/cloudflare-worker-jwt';

export const generateToken = async (payload, secret) => {
  const exp = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7); // 7 days
  return await jwt.sign({ ...payload, exp }, secret);
};

export const verifyToken = async (token, secret) => {
  try {
    const isValid = await jwt.verify(token, secret);
    if (!isValid) return null;

    const decoded = jwt.decode(token);
    return decoded.payload;
  } catch (error) {
    return null;
  }
};

export const authMiddleware = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'No token provided' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const decoded = await verifyToken(token, c.env.JWT_SECRET);

  if (!decoded) {
    return c.json({ success: false, error: 'Invalid token' }, 401);
  }

  // Check token version (reject old tokens)
  const CURRENT_TOKEN_VERSION = 2;
  if (!decoded.tokenVersion || decoded.tokenVersion < CURRENT_TOKEN_VERSION) {
    return c.json({ success: false, error: 'Invalid token' }, 401);
  }

  c.set('user', decoded);
  await next();
};

export const adminMiddleware = async (c, next) => {
  const user = c.get('user');

  if (!user || user.role !== 'ADMIN') {
    return c.json({ success: false, error: 'Unauthorized: Admin access required' }, 403);
  }

  await next();
};

