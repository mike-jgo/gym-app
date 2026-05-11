import 'dotenv/config';
import { createApp } from './app.js';
import { createPool, migrate } from './db.js';
import { requireSessionSecret } from './auth.js';
import { seedAdminUser } from './users.js';

const port = Number(process.env.PORT || 3000);
const pool = createPool();

requireSessionSecret();
await migrate(pool);
if (await seedAdminUser(pool)) {
  console.log(`Seeded admin user ${process.env.ADMIN_EMAIL.trim().toLowerCase()}`);
}

const app = createApp(pool);
app.listen(port, () => {
  console.log(`Fitlog server listening on port ${port}`);
});
