-- ============================================================
-- FBEOD Gym App — Supabase Schema
-- Run this in the Supabase SQL editor to set up the database.
-- ============================================================

-- ── Tables ───────────────────────────────────────────────────

-- All exercises: global presets (user_id IS NULL) + per-user custom exercises
CREATE TABLE IF NOT EXISTS exercises (
  id         TEXT        PRIMARY KEY,
  name       TEXT        NOT NULL,
  is_preset  BOOLEAN     NOT NULL DEFAULT false,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Workout programs (e.g. "A", "B") — one set per user
CREATE TABLE IF NOT EXISTS workouts (
  id         TEXT        NOT NULL,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label      TEXT        NOT NULL,
  color      TEXT        NOT NULL,
  sort_order INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (id, user_id)
);

-- Junction: which exercises are in each workout, in what order, with how many sets
CREATE TABLE IF NOT EXISTS workout_exercises (
  id          BIGSERIAL   PRIMARY KEY,
  workout_id  TEXT        NOT NULL,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id TEXT        NOT NULL REFERENCES exercises(id),
  sets        INT         NOT NULL DEFAULT 3,
  sort_order  INT         NOT NULL DEFAULT 0,
  FOREIGN KEY (workout_id, user_id) REFERENCES workouts(id, user_id) ON DELETE CASCADE
);

-- One row per completed workout session
CREATE TABLE IF NOT EXISTS sessions (
  id             TEXT        PRIMARY KEY,
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date           TIMESTAMPTZ NOT NULL,
  workout_id     TEXT,
  workout_label  TEXT,
  workout_color  TEXT,
  bodyweight     NUMERIC,
  duration       INT,
  total_volume   NUMERIC,
  hard_sets      INT,
  avg_rpe        NUMERIC,
  exercises      JSONB       NOT NULL DEFAULT '[]'
);

-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE exercises        ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions         ENABLE ROW LEVEL SECURITY;

-- exercises: presets visible to everyone; custom exercises visible only to owner
CREATE POLICY "exercises_select" ON exercises
  FOR SELECT USING (is_preset = true OR user_id = auth.uid());

CREATE POLICY "exercises_insert" ON exercises
  FOR INSERT WITH CHECK (user_id = auth.uid() AND is_preset = false);

CREATE POLICY "exercises_update" ON exercises
  FOR UPDATE USING (user_id = auth.uid() AND is_preset = false);

CREATE POLICY "exercises_delete" ON exercises
  FOR DELETE USING (user_id = auth.uid() AND is_preset = false);

-- workouts: owner only
CREATE POLICY "workouts_all" ON workouts
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- workout_exercises: owner only
CREATE POLICY "workout_exercises_all" ON workout_exercises
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- sessions: owner only
CREATE POLICY "sessions_all" ON sessions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── Preset Exercise Seed Data ─────────────────────────────────
-- Run once. Safe to re-run (ON CONFLICT DO NOTHING).

INSERT INTO exercises (id, name, is_preset) VALUES
  ('bb_bench',     'Barbell Bench Press',         true),
  ('sm_squat',     'Smith Machine Squat',          true),
  ('lat_pull',     'Lat Pulldown',                 true),
  ('db_rdl',       'DB Romanian Deadlift',         true),
  ('db_lat_raise', 'DB Lateral Raise',             true),
  ('db_hammer',    'DB Hammer Curls',              true),
  ('sm_incline',   'Smith Machine Incline Press',  true),
  ('bb_row',       'Barbell Row',                  true),
  ('db_goblet',    'DB Goblet Squat',              true),
  ('db_ohp',       'Seated DB Shoulder Press',     true),
  ('sa_lat_pull',  'Single-Arm Lat Pulldown',      true),
  ('tri_ext',      'Tricep Overhead Extension',    true),
  ('bb_squat',     'Barbell Squat',                true),
  ('bb_deadlift',  'Barbell Deadlift',             true),
  ('bb_ohp',       'Barbell Overhead Press',       true),
  ('pull_up',      'Pull-Up',                      true),
  ('dip',          'Dip',                          true),
  ('leg_press',    'Leg Press',                    true),
  ('leg_curl',     'Leg Curl',                     true),
  ('leg_ext',      'Leg Extension',                true),
  ('cable_row',    'Cable Row',                    true),
  ('chest_fly',    'Cable Chest Fly',              true),
  ('face_pull',    'Face Pull',                    true),
  ('db_curl',      'DB Bicep Curl',                true),
  ('db_tricep',    'DB Tricep Kickback',            true),
  ('calf_raise',   'Calf Raise',                   true),
  ('ab_crunch',    'Cable Crunch',                 true),
  ('hip_thrust',   'Hip Thrust',                   true)
ON CONFLICT (id) DO NOTHING;

-- ── RPC: atomic config save ───────────────────────────────────
-- Replaces the multi-step JS loop in saveConfig. Runs in a single
-- transaction so a mid-save failure can never leave partial state.
-- Uses auth.uid() from the caller's JWT — no extra network round-trip.
CREATE OR REPLACE FUNCTION save_config(config_json JSONB)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  uid       UUID    := auth.uid();
  keep_ids  TEXT[];
  workout   JSONB;
  exercise  JSONB;
  w_idx     INT := 0;
  ex_idx    INT;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Collect IDs of workouts to keep
  SELECT ARRAY(
    SELECT elem->>'id'
    FROM jsonb_array_elements(config_json->'workouts') AS elem
  ) INTO keep_ids;

  -- Delete removed workouts; ON DELETE CASCADE cleans up their workout_exercises
  DELETE FROM workouts
  WHERE user_id = uid
    AND NOT (id = ANY(keep_ids));

  -- Upsert each workout and replace its exercises atomically
  FOR workout IN SELECT jsonb_array_elements(config_json->'workouts') LOOP
    INSERT INTO workouts (id, user_id, label, color, sort_order)
    VALUES (
      workout->>'id', uid, workout->>'label', workout->>'color', w_idx
    )
    ON CONFLICT (id, user_id) DO UPDATE SET
      label      = EXCLUDED.label,
      color      = EXCLUDED.color,
      sort_order = EXCLUDED.sort_order;

    DELETE FROM workout_exercises
    WHERE workout_id = workout->>'id' AND user_id = uid;

    ex_idx := 0;
    FOR exercise IN SELECT jsonb_array_elements(workout->'exercises') LOOP
      INSERT INTO workout_exercises (workout_id, user_id, exercise_id, sets, sort_order)
      VALUES (
        workout->>'id', uid, exercise->>'id', (exercise->>'sets')::INT, ex_idx
      );
      ex_idx := ex_idx + 1;
    END LOOP;

    w_idx := w_idx + 1;
  END LOOP;
END;
$$;
