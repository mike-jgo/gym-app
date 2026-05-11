import jwt from 'jsonwebtoken';

export const SESSION_COOKIE = 'fitlog_session';

const isProduction = process.env.NODE_ENV === 'production';

export function requireSessionSecret() {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is required');
  }
}

export function createSessionToken(user) {
  requireSessionSecret();
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.SESSION_SECRET,
    { expiresIn: process.env.SESSION_TTL || '30d' }
  );
}

export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
}

export function authMiddleware(pool) {
  return async (req, res, next) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      requireSessionSecret();
      const payload = jwt.verify(token, process.env.SESSION_SECRET);
      const { rows } = await pool.query(
        'SELECT id, email FROM users WHERE id = $1',
        [payload.sub]
      );
      if (!rows[0]) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      req.user = rows[0];
      return next();
    } catch {
      return res.status(401).json({ error: 'Not authenticated' });
    }
  };
}
