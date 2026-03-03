import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeSessions,
  filterSessionsByRange,
  listExercisesFromSessions,
  buildExerciseE1RMSeries,
  buildWeeklyVolumeSeries,
} from './stats.js';

const SAMPLE_SESSIONS = [
  {
    id: 's_old',
    date: '2025-10-01T09:00:00Z',
    exercises: [
      {
        id: 'bench',
        name: 'Bench Press',
        sets: [
          { weight: 100, reps: 5, rpe: 8 },
          { weight: 90, reps: 8, rpe: 7.5 },
        ],
      },
    ],
  },
  {
    id: 's1',
    date: '2026-02-17T09:00:00Z',
    totalVolume: 2000,
    hardSets: 2,
    exercises: [
      {
        id: 'bench',
        name: 'Bench Press',
        sets: [
          { weight: 105, reps: 4, rpe: 8.5 },
          { weight: 95, reps: 6, rpe: 8 },
        ],
      },
      {
        id: 'row',
        name: 'Barbell Row',
        sets: [{ weight: 80, reps: 8, rir: 1 }],
      },
    ],
  },
  {
    id: 's2',
    date: '2026-02-23T09:00:00Z',
    exercises: [
      {
        id: 'bench',
        name: 'Bench Press',
        sets: [
          { weight: 110, reps: 3, rpe: 9 },
          { weight: 100, reps: 5 },
        ],
      },
    ],
  },
  {
    id: 'fallback_hardset',
    date: '2026-02-24T09:00:00Z',
    totalVolume: 500,
    hardSets: 3,
    exercises: [
      {
        id: 'bench',
        name: 'Bench Press',
        sets: [
          { weight: 0, reps: 0 },
        ],
      },
    ],
  },
];

test('normalizeSessions handles malformed rows and sorts by date', () => {
  const normalized = normalizeSessions([
    { id: 'bad', date: 'invalid', exercises: [] },
    ...SAMPLE_SESSIONS,
  ]);

  assert.equal(normalized.length, SAMPLE_SESSIONS.length);
  assert.equal(normalized[0].id, 's_old');
  assert.equal(normalized.at(-1).id, 'fallback_hardset');
  assert.equal(normalized[0].dateKey, '2025-10-01');
});

test('filterSessionsByRange supports 4W, 12W, and ALL', () => {
  const normalized = normalizeSessions(SAMPLE_SESSIONS);
  const now = new Date('2026-03-03T00:00:00Z');

  assert.equal(filterSessionsByRange(normalized, '4W', now).length, 3);
  assert.equal(filterSessionsByRange(normalized, '12W', now).length, 3);
  assert.equal(filterSessionsByRange(normalized, 'ALL', now).length, 4);
});

test('listExercisesFromSessions returns unique sorted exercise options', () => {
  const normalized = normalizeSessions(SAMPLE_SESSIONS);
  const options = listExercisesFromSessions(normalized);
  assert.deepEqual(options, [
    { id: 'row', name: 'Barbell Row' },
    { id: 'bench', name: 'Bench Press' },
  ]);
});

test('buildExerciseE1RMSeries calculates best e1RM per session and ignores invalid sets', () => {
  const normalized = normalizeSessions(SAMPLE_SESSIONS);
  const now = new Date('2026-03-03T00:00:00Z');
  const points = buildExerciseE1RMSeries(normalized, 'bench', '4W', now);

  assert.equal(points.length, 2);
  assert.deepEqual(points.map((p) => p.date), ['2026-02-17', '2026-02-23']);
  assert.equal(points[0].value, 114.5);
  assert.equal(points[1].value, 116.5);
});

test('buildWeeklyVolumeSeries groups by Monday week and uses hard-set fallback when needed', () => {
  const normalized = normalizeSessions(SAMPLE_SESSIONS);
  const now = new Date('2026-03-03T00:00:00Z');
  const points = buildWeeklyVolumeSeries(normalized, '4W', now);

  assert.equal(points.length, 2);
  assert.deepEqual(points.map((p) => p.weekStart), ['2026-02-16', '2026-02-23']);
  assert.equal(points[0].volume, 1630);
  assert.equal(points[0].hardSets, 3);
  assert.equal(points[1].volume, 1330);
  assert.equal(points[1].hardSets, 4);
});
