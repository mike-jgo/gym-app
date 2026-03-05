import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatDuration } from '../utils/date';
import './StatsView.css';

function getWeekStart(dateStr) {
  const d = new Date(dateStr.replace(' ', 'T'));
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function formatWeekLabel(isoDate) {
  const [y, m, dd] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatDateLabel(dateStr) {
  return new Date(dateStr.replace(' ', 'T'))
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function ChartTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-value mono">{payload[0].value}{unit}</div>
    </div>
  );
}

export default function StatsView({ sessions }) {
  const [selectedExerciseId, setSelectedExerciseId] = useState('');

  const summary = useMemo(() => {
    const totalSessions = sessions.length;
    const totalVolumeKg = Math.round(
      sessions.reduce((s, sess) => s + (sess.totalVolume || 0), 0)
    );
    const durSessions = sessions.filter((s) => s.duration > 0);
    const avgDuration = durSessions.length
      ? Math.round(durSessions.reduce((s, sess) => s + sess.duration, 0) / durSessions.length)
      : 0;
    const rpeSessions = sessions.filter((s) => s.avgRPE != null && s.avgRPE !== '');
    const avgRPE = rpeSessions.length
      ? Math.round(
          (rpeSessions.reduce((s, sess) => s + Number(sess.avgRPE), 0) / rpeSessions.length) * 10
        ) / 10
      : null;
    return { totalSessions, totalVolumeKg, avgDuration, avgRPE };
  }, [sessions]);

  const weeklyVolume = useMemo(() => {
    const byWeek = {};
    sessions.forEach((sess) => {
      if (!sess.date || !sess.totalVolume) return;
      const week = getWeekStart(sess.date);
      byWeek[week] = (byWeek[week] || 0) + sess.totalVolume;
    });
    return Object.entries(byWeek)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-8)
      .map(([week, volume]) => ({ week: formatWeekLabel(week), volume: Math.round(volume) }));
  }, [sessions]);

  const exercises = useMemo(() => {
    const map = {};
    sessions.forEach((sess) => {
      (sess.exercises || []).forEach((ex) => {
        if (ex.id && !map[ex.id]) map[ex.id] = ex.name;
      });
    });
    return Object.entries(map)
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions]);

  const e1rmHistory = useMemo(() => {
    if (!selectedExerciseId) return [];
    return sessions
      .map((sess) => {
        const ex = (sess.exercises || []).find((e) => e.id === selectedExerciseId);
        return ex && ex.best1RM > 0
          ? { _raw: sess.date, date: formatDateLabel(sess.date), e1rm: ex.best1RM }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => (a._raw < b._raw ? -1 : 1));
  }, [sessions, selectedExerciseId]);

  if (sessions.length === 0) {
    return <p className="history-status">No sessions recorded yet.</p>;
  }

  return (
    <div className="stats-view">
      {/* Summary cards */}
      <div className="stats-cards">
        <div className="stat-card">
          <span className="stat-value mono">{summary.totalSessions}</span>
          <span className="stat-label">Sessions</span>
        </div>
        <div className="stat-card">
          <span className="stat-value mono">{summary.totalVolumeKg.toLocaleString()}</span>
          <span className="stat-label">Lifetime volume (kg)</span>
        </div>
        <div className="stat-card">
          <span className="stat-value mono">
            {summary.avgDuration > 0 ? formatDuration(summary.avgDuration) : '—'}
          </span>
          <span className="stat-label">Avg duration</span>
        </div>
        <div className="stat-card">
          <span className="stat-value mono">{summary.avgRPE != null ? summary.avgRPE : '—'}</span>
          <span className="stat-label">Avg RPE</span>
        </div>
      </div>

      {/* e1RM Progress */}
      <div className="stats-section">
        <h2 className="stats-section-title mono">e1RM PROGRESS</h2>
        <select
          className="exercise-picker"
          value={selectedExerciseId}
          onChange={(e) => setSelectedExerciseId(e.target.value)}
        >
          <option value="">— select exercise —</option>
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </select>

        {selectedExerciseId && e1rmHistory.length === 0 && (
          <p className="stats-empty">No e1RM data for this exercise yet.</p>
        )}
        {e1rmHistory.length > 0 && (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={e1rmHistory} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="#2a2a40" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#7a7a95', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#7a7a95', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
                width={40}
              />
              <Tooltip content={<ChartTooltip unit=" kg" />} />
              <Line
                type="monotone"
                dataKey="e1rm"
                stroke="#ff6b4a"
                strokeWidth={2}
                dot={{ r: 3, fill: '#ff6b4a', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Weekly Volume */}
      {weeklyVolume.length > 0 && (
        <div className="stats-section">
          <h2 className="stats-section-title mono">WEEKLY VOLUME</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyVolume} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="#2a2a40" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fill: '#7a7a95', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: '#7a7a95', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip content={<ChartTooltip unit=" kg" />} />
              <Bar dataKey="volume" fill="#ff6b4a" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
