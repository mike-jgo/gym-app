import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createPool, migrate } from './db.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? '';

if (!email || !password) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
}

const pool = createPool();
await migrate(pool);

const passwordHash = await bcrypt.hash(password, 12);
await pool.query(
  `INSERT INTO users (email, password_hash)
   VALUES ($1, $2)
   ON CONFLICT (email) DO UPDATE SET
     password_hash = EXCLUDED.password_hash,
     updated_at = now()`,
  [email, passwordHash]
);

await pool.end();
console.log(`Seeded admin user ${email}`);
