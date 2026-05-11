import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_WORKOUTS } from '../src/utils/workouts.js';
import { authMiddleware, clearSessionCookie, createSessionToken, setSessionCookie } from './auth.js';
import { withTransaction } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');

function publicUser(user) {
  return { id: user.id, email: user.email };
}

function normalizeSession(row) {
  return {
    ...row,
    workout: row.workout_label,
    workoutColor: row.workout_color,
    totalVolume: row.total_volume == null ? null : Number(row.total_volume),
    hardSets: row.hard_sets,
    avgRPE: row.avg_rpe == null ? null : Number(row.avg_rpe),
    bodyweight: row.bodyweight == null ? null : Number(row.bodyweight),
  };
}

async function saveWorkoutConfig(client, userId, config) {
  const workouts = Array.isArray(config?.workouts) ? config.workouts : [];
  const keepIds = workouts.map((workout) => workout.id);

  if (keepIds.length) {
    await client.query(
      'DELETE FROM workouts WHERE user_id = $1 AND NOT (id = ANY($2::text[]))',
      [userId, keepIds]
    );
  } else {
    await client.query('DELETE FROM workouts WHERE user_id = $1', [userId]);
  }

  for (let workoutIndex = 0; workoutIndex < workouts.length; workoutIndex += 1) {
    const workout = workouts[workoutIndex];
    await client.query(
      `INSERT INTO workouts (id, user_id, label, color, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id, user_id) DO UPDATE SET
         label = EXCLUDED.label,
         color = EXCLUDED.color,
         sort_order = EXCLUDED.sort_order`,
      [workout.id, userId, workout.label, workout.color, workoutIndex]
    );

    await client.query(
      'DELETE FROM workout_exercises WHERE workout_id = $1 AND user_id = $2',
      [workout.id, userId]
    );

    const exercises = Array.isArray(workout.exercises) ? workout.exercises : [];
    for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex += 1) {
      const exercise = exercises[exerciseIndex];
      await client.query(
        `INSERT INTO workout_exercises (workout_id, user_id, exercise_id, sets, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [workout.id, userId, exercise.id, Number(exercise.sets) || 3, exerciseIndex]
      );
    }
  }
}

async function ensureDefaultWorkouts(pool, userId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM workouts WHERE user_id = $1',
    [userId]
  );
  if (rows[0].count === 0) {
    await withTransaction(pool, (client) =>
      saveWorkoutConfig(client, userId, { version: 1, workouts: DEFAULT_WORKOUTS })
    );
  }
}

export function createApp(pool) {
  const app = express();
  const requireAuth = authMiddleware(pool);

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const email = String(req.body?.email ?? '').trim().toLowerCase();
      const password = String(req.body?.password ?? '');
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const { rows } = await pool.query(
        'SELECT id, email, password_hash FROM users WHERE email = $1',
        [email]
      );
      const user = rows[0];
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = createSessionToken(user);
      setSessionCookie(res, token);
      return res.json({ user: publicUser(user) });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearSessionCookie(res);
    res.status(204).end();
  });

  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: publicUser(req.user) });
  });

  app.get('/api/exercises', requireAuth, async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, name, is_preset
         FROM exercises
         WHERE is_preset = true OR user_id = $1
         ORDER BY name`,
        [req.user.id]
      );
      const exercises = Object.fromEntries(rows.map((e) => [e.id, { id: e.id, name: e.name }]));
      res.json({ exercises });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/exercises', requireAuth, async (req, res, next) => {
    try {
      const id = String(req.body?.id ?? '').trim();
      const name = String(req.body?.name ?? '').trim();
      if (!id || !name) {
        return res.status(400).json({ error: 'Exercise id and name are required' });
      }

      await pool.query(
        `INSERT INTO exercises (id, name, is_preset, user_id)
         VALUES ($1, $2, false, $3)`,
        [id, name, req.user.id]
      );
      res.status(201).json({ exercise: { id, name } });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/workouts', requireAuth, async (req, res, next) => {
    try {
      await ensureDefaultWorkouts(pool, req.user.id);
      const { rows } = await pool.query(
        `SELECT
           w.id AS workout_id, w.label, w.color, w.sort_order AS workout_order,
           we.id AS workout_exercise_id, we.sets, we.sort_order AS exercise_order,
           e.id AS exercise_id, e.name AS exercise_name
         FROM workouts w
         LEFT JOIN workout_exercises we
           ON we.workout_id = w.id AND we.user_id = w.user_id
         LEFT JOIN exercises e ON e.id = we.exercise_id
         WHERE w.user_id = $1
         ORDER BY w.sort_order, we.sort_order`,
        [req.user.id]
      );

      const byId = new Map();
      for (const row of rows) {
        if (!byId.has(row.workout_id)) {
          byId.set(row.workout_id, {
            id: row.workout_id,
            label: row.label,
            color: row.color,
            exercises: [],
          });
        }
        if (row.exercise_id) {
          byId.get(row.workout_id).exercises.push({
            id: row.exercise_id,
            name: row.exercise_name,
            sets: row.sets,
          });
        }
      }

      res.json({ version: 1, workouts: [...byId.values()] });
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/workouts', requireAuth, async (req, res, next) => {
    try {
      const config = { version: 1, workouts: Array.isArray(req.body?.workouts) ? req.body.workouts : [] };
      await withTransaction(pool, (client) => saveWorkoutConfig(client, req.user.id, config));
      res.json(config);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/sessions', requireAuth, async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM sessions WHERE user_id = $1 ORDER BY date DESC',
        [req.user.id]
      );
      res.json({ sessions: rows.map(normalizeSession) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/sessions', requireAuth, async (req, res, next) => {
    try {
      const exercises = Array.isArray(req.body?.exercises) ? req.body.exercises : [];
      const totalVolume = exercises.reduce((sum, ex) => sum + (ex.totalVolume ?? 0), 0);
      const hardSets = exercises.reduce((sum, ex) => sum + (ex.hardSets ?? 0), 0);
      const rpeSets = exercises.flatMap((ex) => ex.sets ?? []).filter((set) => set.rpe != null);
      const avgRPE = rpeSets.length
        ? Math.round((rpeSets.reduce((sum, set) => sum + set.rpe, 0) / rpeSets.length) * 10) / 10
        : null;

      const id = String(req.body?.id ?? '').trim();
      if (!id || exercises.length === 0) {
        return res.status(400).json({ error: 'Session id and exercises are required' });
      }

      await pool.query(
        `INSERT INTO sessions (
          id, user_id, date, workout_id, workout_label, workout_color, bodyweight,
          duration, total_volume, hard_sets, avg_rpe, exercises
        )
        VALUES ($1, $2, now(), $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          id,
          req.user.id,
          req.body.workoutId ?? null,
          req.body.workout ?? null,
          req.body.workoutColor ?? null,
          req.body.bodyweight ?? null,
          req.body.duration ?? null,
          Math.round(totalVolume * 10) / 10,
          hardSets,
          avgRPE,
          JSON.stringify(exercises),
        ]
      );
      res.status(201).json({ id });
    } catch (error) {
      next(error);
    }
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use(express.static(distDir));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
