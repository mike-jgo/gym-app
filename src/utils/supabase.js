import { createClient } from '@supabase/supabase-js';
import { calc1RM } from './calc';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── Auth helpers ──────────────────────────────────────────────

export async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ── Exercise registry ─────────────────────────────────────────

export async function fetchExercises() {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, is_preset')
    .order('name');
  if (error) throw error;
  // Return as { [id]: { id, name } } map for compatibility with existing registry shape
  return Object.fromEntries(data.map((e) => [e.id, { id: e.id, name: e.name }]));
}

export async function insertExercise({ id, name }) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('exercises')
    .insert({ id, name, is_preset: false, user_id: userId });
  if (error) throw error;
}

// ── Workout config ────────────────────────────────────────────

export async function fetchWorkouts() {
  const { data, error } = await supabase
    .from('workouts')
    .select(`
      id, label, color, sort_order,
      workout_exercises (
        id, sets, sort_order,
        exercises ( id, name )
      )
    `)
    .order('sort_order');
  if (error) throw error;

  return {
    version: 1,
    workouts: data.map((w) => ({
      id: w.id,
      label: w.label,
      color: w.color,
      exercises: [...w.workout_exercises]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((we) => ({ id: we.exercises.id, name: we.exercises.name, sets: we.sets })),
    })),
  };
}

export async function saveConfig(config) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  for (let i = 0; i < config.workouts.length; i++) {
    const w = config.workouts[i];

    // Upsert the workout row
    const { error: wErr } = await supabase
      .from('workouts')
      .upsert({ id: w.id, user_id: userId, label: w.label, color: w.color, sort_order: i });
    if (wErr) throw wErr;

    // Replace workout_exercises: delete then re-insert
    const { error: delErr } = await supabase
      .from('workout_exercises')
      .delete()
      .eq('workout_id', w.id)
      .eq('user_id', userId);
    if (delErr) throw delErr;

    if (w.exercises.length > 0) {
      const rows = w.exercises.map((ex, idx) => ({
        workout_id: w.id,
        user_id: userId,
        exercise_id: ex.id,
        sets: ex.sets,
        sort_order: idx,
      }));
      const { error: insErr } = await supabase.from('workout_exercises').insert(rows);
      if (insErr) throw insErr;
    }
  }

  // Delete workouts removed from config
  const keepIds = config.workouts.map((w) => w.id);
  if (keepIds.length > 0) {
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('user_id', userId)
      .not('id', 'in', `(${keepIds.map((id) => `"${id}"`).join(',')})`);
    if (error) throw error;
  } else {
    // All workouts removed
    const { error } = await supabase.from('workouts').delete().eq('user_id', userId);
    if (error) throw error;
  }
}

// ── Sessions ──────────────────────────────────────────────────

export async function saveSession({ id, workout, workoutId, workoutColor, bodyweight, exercises, duration }) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const totalVolume = exercises.reduce((sum, ex) => sum + (ex.totalVolume ?? 0), 0);
  const hardSets = exercises.reduce((sum, ex) => sum + (ex.hardSets ?? 0), 0);
  const rpeSets = exercises.flatMap((ex) => ex.sets ?? []).filter((s) => s.rpe != null);
  const avgRPE = rpeSets.length
    ? Math.round((rpeSets.reduce((sum, s) => sum + s.rpe, 0) / rpeSets.length) * 10) / 10
    : null;

  const { error } = await supabase.from('sessions').insert({
    id,
    user_id: userId,
    date: new Date().toISOString(),
    workout_id: workoutId ?? null,
    workout_label: workout,
    workout_color: workoutColor,
    bodyweight,
    duration,
    total_volume: Math.round(totalVolume * 10) / 10,
    hard_sets: hardSets,
    avg_rpe: avgRPE,
    exercises,
  });
  if (error) throw error;
}

export async function fetchSessions() {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  // Normalize snake_case DB columns to camelCase for the rest of the app
  return data.map((s) => ({
    ...s,
    workout: s.workout_label,
    workoutColor: s.workout_color,
    totalVolume: s.total_volume,
    hardSets: s.hard_sets,
    avgRPE: s.avg_rpe,
  }));
}

// ── Derived data (computed client-side from sessions) ─────────

export function computeLastLifts(sessions) {
  const lastLifts = {};
  // sessions is reverse-chronological — first hit per exercise is the latest
  for (const session of sessions) {
    for (const exercise of (session.exercises ?? [])) {
      if (!lastLifts[exercise.id]) {
        lastLifts[exercise.id] = { date: session.date, sets: exercise.sets };
      }
    }
  }
  return lastLifts;
}

export function computePersonalBests(sessions) {
  const pbs = {};
  // sessions is reverse-chronological; iterate all to find all-time bests
  for (const session of sessions) {
    for (const exercise of (session.exercises ?? [])) {
      const exId = exercise.id;
      if (!pbs[exId]) {
        pbs[exId] = {
          best1RM: 0, best1RMDate: '',
          bestWeight: 0, bestWeightReps: 0, bestWeightDate: '',
          bestVolume: 0, bestVolumeDate: '',
        };
      }
      const pb = pbs[exId];

      if ((exercise.best1RM ?? 0) > pb.best1RM) {
        pb.best1RM = exercise.best1RM;
        pb.best1RMDate = session.date;
      }

      if ((exercise.totalVolume ?? 0) > pb.bestVolume) {
        pb.bestVolume = exercise.totalVolume;
        pb.bestVolumeDate = session.date;
      }

      for (const set of (exercise.sets ?? [])) {
        const e1rm = calc1RM(set.weight, set.reps);
        if (e1rm > pb.best1RM) {
          pb.best1RM = Math.round(e1rm * 10) / 10;
          pb.best1RMDate = session.date;
        }
        if ((set.weight ?? 0) > pb.bestWeight) {
          pb.bestWeight = set.weight;
          pb.bestWeightReps = set.reps;
          pb.bestWeightDate = session.date;
        }
      }
    }
  }
  return pbs;
}
