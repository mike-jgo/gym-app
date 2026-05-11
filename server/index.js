import 'dotenv/config';
import { createApp } from './app.js';
import { createPool, migrate } from './db.js';
import { requireSessionSecret } from './auth.js';

const port = Number(process.env.PORT || 3000);
const pool = createPool();

requireSessionSecret();
await migrate(pool);

const app = createApp(pool);
app.listen(port, () => {
  console.log(`Fitlog server listening on port ${port}`);
});
