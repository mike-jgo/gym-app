// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import { createApp } from '../app.js';

function createFakePool(user) {
  return {
    async query(sql, params) {
      if (sql.includes('SELECT id, email, password_hash FROM users WHERE email')) {
        return { rows: params[0] === user.email ? [user] : [] };
      }
      if (sql.includes('SELECT id, email FROM users WHERE id')) {
        return { rows: params[0] === user.id ? [{ id: user.id, email: user.email }] : [] };
      }
      return { rows: [] };
    },
  };
}

async function listen(app) {
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

describe('auth routes', () => {
  let server;

  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-session-secret';
    process.env.NODE_ENV = 'test';
  });

  afterEach(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      server = null;
    }
  });

  it('rejects invalid credentials', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    const app = createApp(createFakePool({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'me@example.com',
      password_hash: passwordHash,
    }));
    ({ server } = await listen(app));
    const { port } = server.address();

    const response = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'me@example.com', password: 'wrong' }),
    });

    expect(response.status).toBe(401);
  });

  it('sets a session cookie and returns the current user', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    const app = createApp(createFakePool({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'me@example.com',
      password_hash: passwordHash,
    }));
    const started = await listen(app);
    server = started.server;
    const { baseUrl } = started;

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'me@example.com', password: 'correct-password' }),
    });
    const cookie = loginResponse.headers.get('set-cookie');

    expect(loginResponse.status).toBe(200);
    expect(cookie).toContain('fitlog_session=');

    const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookie },
    });
    const body = await meResponse.json();

    expect(meResponse.status).toBe(200);
    expect(body.user).toEqual({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'me@example.com',
    });
  });
});
