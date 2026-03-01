/**
 * Format elapsed seconds as MM:SS or H:MM:SS for live session display.
 */
export function formatElapsed(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Format elapsed seconds as a compact human duration for history display.
 * e.g. 3723 → "1h 2m"
 */
export function formatDuration(totalSeconds) {
  if (!totalSeconds) return '';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Format any date value (ISO string, Date object, or already-formatted string)
 * to yyyy-MM-dd, using local time.
 */
export function formatDate(val) {
  if (!val) return '';
  const s = String(val);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // already correct
  const d = new Date(val);
  if (isNaN(d.getTime())) return s;
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

/**
 * Format any date value to yyyy-MM-dd HH:mm:ss, using local time.
 */
export function formatDateTime(val) {
  if (!val) return '';
  const s = String(val);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return s; // already correct
  const d = new Date(val);
  if (isNaN(d.getTime())) return s;
  const date = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
  const time = [
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
    String(d.getSeconds()).padStart(2, '0'),
  ].join(':');
  return `${date} ${time}`;
}
