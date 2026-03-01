const API_URL_KEY = 'fbeod_api_url';

export function getApiUrl() {
  return localStorage.getItem(API_URL_KEY) || '';
}

export function setApiUrl(url) {
  localStorage.setItem(API_URL_KEY, url);
}

/**
 * Save a workout session to Google Sheets
 */
export async function saveWorkout({ workout, workoutColor = '', exercises, bodyweight = 64.5, duration = 0 }) {
  const url = getApiUrl();
  if (!url) throw new Error('No API URL configured');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      action: 'save',
      workout,
      workoutColor,
      date: new Date().toISOString(),
      bodyweight,
      exercises,
      duration,
    }),
  });

  const result = await response.json();
  if (result.status !== 'ok') throw new Error(result.message || 'Save failed');
  return result;
}

/**
 * Fetch last-lift data for all exercises
 */
export async function fetchLastLifts() {
  const url = getApiUrl();
  if (!url) throw new Error('No API URL configured');

  const response = await fetch(`${url}?action=lastLifts`);
  const result = await response.json();

  if (result.status !== 'ok') throw new Error(result.message || 'Fetch failed');
  return result.data || {};
}

/**
 * Fetch session history (reverse chronological)
 */
export async function fetchSessions() {
  const url = getApiUrl();
  if (!url) throw new Error('No API URL configured');

  const response = await fetch(`${url}?action=sessions`);
  const result = await response.json();

  if (result.status !== 'ok') throw new Error(result.message || 'Fetch failed');
  return result.data || [];
}

/**
 * Fetch all workout log data (for analysis)
 */
export async function fetchAllData() {
  const url = getApiUrl();
  if (!url) throw new Error('No API URL configured');

  const response = await fetch(`${url}?action=allData`);
  const result = await response.json();

  if (result.status !== 'ok') throw new Error(result.message || 'Fetch failed');
  return result.data || [];
}
