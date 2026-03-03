import { calc1RM } from './calc.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_DAYS = {
  '4W': 28,
  '12W': 84,
  ALL: null,
};

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function dateKeyLocal(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function weekStartMonday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // Sunday 0..Saturday 6
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function normalizeEffort(rpeRaw, rirRaw) {
  let rpe = toFiniteNumber(rpeRaw);
  let rir = toFiniteNumber(rirRaw);

  if (rpe == null && rir == null) return { rpe: null, rir: null };
  if (rpe == null && rir != null) rpe = 10 - rir;
  if (rir == null && rpe != null) rir = 10 - rpe;
  if (rpe != null && rir != null) rir = 10 - rpe;

  return {
    rpe: rpe == null ? null : round1(rpe),
    rir: rir == null ? null : round1(rir),
  };
}

function isHardSet(set) {
  const effort = normalizeEffort(set.rpe, set.rir);
  if (effort.rpe != null) return effort.rpe >= 8;
  if (effort.rir != null) return effort.rir <= 2;
  return false;
}

function normalizeSet(rawSet) {
  const weight = toFiniteNumber(rawSet?.weight) ?? 0;
  const reps = Math.floor(toFiniteNumber(rawSet?.reps) ?? 0);
  const effort = normalizeEffort(rawSet?.rpe, rawSet?.rir);

  return {
    weight,
    reps,
    rpe: effort.rpe,
    rir: effort.rir,
  };
}

function normalizeExercise(rawExercise) {
  const id = String(rawExercise?.id || '').trim();
  const name = String(rawExercise?.name || '').trim();
  const sets = Array.isArray(rawExercise?.sets)
    ? rawExercise.sets.map(normalizeSet)
    : [];

  return { id, name, sets };
}

export function normalizeSessions(sessions) {
  if (!Array.isArray(sessions)) return [];

  const normalized = sessions
    .map((session, index) => {
      const date = parseDate(session?.date);
      if (!date) return null;

      const exercises = Array.isArray(session?.exercises)
        ? session.exercises.map(normalizeExercise).filter((ex) => ex.id)
        : [];

      const totalVolume = toFiniteNumber(session?.totalVolume);
      const hardSets = toFiniteNumber(session?.hardSets);

      return {
        id: String(session?.id || `${date.toISOString()}_${index}`),
        date,
        dateKey: dateKeyLocal(date),
        weekStart: dateKeyLocal(weekStartMonday(date)),
        totalVolume: totalVolume == null ? null : round1(totalVolume),
        hardSets: hardSets == null ? null : Math.max(0, Math.floor(hardSets)),
        exercises,
      };
    })
    .filter(Boolean);

  normalized.sort((a, b) => a.date.getTime() - b.date.getTime());
  return normalized;
}

export function filterSessionsByRange(sessions, range = '12W', now = new Date()) {
  if (!Array.isArray(sessions)) return [];
  const days = Object.prototype.hasOwnProperty.call(RANGE_DAYS, range)
    ? RANGE_DAYS[range]
    : RANGE_DAYS['12W'];
  if (days == null) return sessions;

  const threshold = now.getTime() - (days * DAY_MS);
  return sessions.filter((session) => session?.date && session.date.getTime() >= threshold);
}

export function listExercisesFromSessions(sessions) {
  const byId = new Map();

  (Array.isArray(sessions) ? sessions : []).forEach((session) => {
    (session.exercises || []).forEach((exercise) => {
      if (!exercise.id) return;
      const current = byId.get(exercise.id);
      const name = exercise.name || exercise.id;
      if (!current || (!current.name && name)) {
        byId.set(exercise.id, { id: exercise.id, name });
      }
    });
  });

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function buildExerciseE1RMSeries(sessions, exerciseId, range = '12W', now = new Date()) {
  if (!exerciseId) return [];
  const filtered = filterSessionsByRange(sessions, range, now);

  return filtered
    .map((session) => {
      let best = 0;
      session.exercises.forEach((exercise) => {
        if (exercise.id !== exerciseId) return;
        exercise.sets.forEach((set) => {
          const rm = calc1RM(set.weight, set.reps);
          if (rm > best) best = rm;
        });
      });

      if (best <= 0) return null;
      return {
        date: session.dateKey,
        value: round1(best),
      };
    })
    .filter(Boolean);
}

export function buildWeeklyVolumeSeries(sessions, range = '12W', now = new Date()) {
  const filtered = filterSessionsByRange(sessions, range, now);
  const byWeek = new Map();

  filtered.forEach((session) => {
    let computedVolume = 0;
    let computedHardSets = 0;
    let hasAnySetVolume = false;
    let hasAnyEffort = false;

    session.exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        if (set.weight > 0 && set.reps > 0) {
          computedVolume += set.weight * set.reps;
          hasAnySetVolume = true;
        }
        if (set.rpe != null || set.rir != null) {
          hasAnyEffort = true;
          if (isHardSet(set)) computedHardSets += 1;
        }
      });
    });

    const volume = hasAnySetVolume
      ? round1(computedVolume)
      : (session.totalVolume != null ? session.totalVolume : 0);

    const hardSets = hasAnyEffort
      ? computedHardSets
      : (session.hardSets != null ? session.hardSets : 0);

    const prev = byWeek.get(session.weekStart) || { weekStart: session.weekStart, volume: 0, hardSets: 0 };
    prev.volume = round1(prev.volume + volume);
    prev.hardSets += hardSets;
    byWeek.set(session.weekStart, prev);
  });

  return [...byWeek.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}
