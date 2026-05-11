import { calc1RM } from './calc';
import { apiRequest } from './api';

// Data API helpers for the VPS backend.

export async function fetchExercises() {
  const data = await apiRequest('/api/exercises');
  return data.exercises;
}

export async function insertExercise({ id, name }) {
  await apiRequest('/api/exercises', {
    method: 'POST',
    body: JSON.stringify({ id, name }),
  });
}

export async function fetchWorkouts() {
  return apiRequest('/api/workouts');
}

export async function saveConfig(config) {
  await apiRequest('/api/workouts', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

export async function saveSession({ id, workout, workoutId, workoutColor, bodyweight, exercises, duration }) {
  await apiRequest('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({
      id,
      workout,
      workoutId,
      workoutColor,
      bodyweight,
      duration,
      exercises,
    }),
  });
}

export async function fetchSessions() {
  const data = await apiRequest('/api/sessions');
  return data.sessions;
}

export function computeLastLifts(sessions) {
  const lastLifts = {};
  // sessions is reverse-chronological - first hit per exercise is the latest
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
