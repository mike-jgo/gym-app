const EFFORT_EPSILON = 0.0001;

function isHalfStep(value) {
  return Math.abs((value * 2) - Math.round(value * 2)) < EFFORT_EPSILON;
}

function roundEffort(value) {
  return Math.round(value * 10) / 10;
}

function parseEffortValue(value) {
  if (value === '' || value == null) return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeEffort(rpeRaw, rirRaw) {
  let rpe = parseEffortValue(rpeRaw);
  let rir = parseEffortValue(rirRaw);

  if (rpe == null && rir == null) {
    return { rpe: null, rir: null, error: null };
  }

  if (rpe != null && (rpe < 6 || rpe > 10 || !isHalfStep(rpe))) {
    return { error: 'RPE must be 6-10 in 0.5 steps' };
  }

  if (rir != null && (rir < 0 || rir > 4 || !isHalfStep(rir))) {
    return { error: 'RIR must be 0-4 in 0.5 steps' };
  }

  if (rpe == null && rir != null) {
    rpe = 10 - rir;
  } else if (rir == null && rpe != null) {
    rir = 10 - rpe;
  } else if (rpe != null && rir != null) {
    rir = 10 - rpe;
  }

  return {
    rpe: roundEffort(rpe),
    rir: roundEffort(rir),
    error: null,
  };
}
