import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { PRESET_EXERCISES } from '../src/utils/workouts.js';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  return new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}

export async function migrate(pool) {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  await seedPresetExercises(pool);
}

export async function seedPresetExercises(pool) {
  for (const exercise of PRESET_EXERCISES) {
    await pool.query(
      `INSERT INTO exercises (id, name, is_preset)
       VALUES ($1, $2, true)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         is_preset = true`,
      [exercise.id, exercise.name]
    );
  }
}

export async function withTransaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
