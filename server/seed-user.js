import 'dotenv/config';
import { createPool, migrate } from './db.js';
import { seedAdminUser } from './users.js';

if (!process.env.ADMIN_EMAIL?.trim() || !process.env.ADMIN_PASSWORD) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
}

const pool = createPool();
await migrate(pool);
await seedAdminUser(pool);

await pool.end();
console.log(`Seeded admin user ${process.env.ADMIN_EMAIL.trim().toLowerCase()}`);
