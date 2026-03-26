import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatDuration } from '../utils/date';

function getWeekStart(dateStr) {
  const d = new Date(dateStr.replace(' ', 'T'));
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
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
    <div className="bg-surface2 border border-line rounded-lg px-3 py-2">
      <div className="text-[0.7rem] text-muted mb-0.5">{label}</div>
      <div className="font-mono text-[0.9rem] font-bold text-text">{payload[0].value}{unit}</div>
    </div>
  );
}

export default function StatsView({ sessions }) {
  const [selectedExerciseId, setSelectedExerciseId] = useState('');

  const summary = useMemo(() => {
    const totalSessions = sessions.length;
    const totalVolumeKg = Math.round(sessions.reduce((s, sess) => s + (sess.totalVolume || 0), 0));
    const durSessions = sessions.filter((s) => s.duration > 0);
    const avgDuration = durSessions.length
      ? Math.round(durSessions.reduce((s, sess) => s + sess.duration, 0) / durSessions.length)
      : 0;
    const rpeSessions = sessions.filter((s) => s.avgRPE != null && s.avgRPE !== '');
    const avgRPE = rpeSessions.length
      ? Math.round((rpeSessions.reduce((s, sess) => s + Number(sess.avgRPE), 0) / rpeSessions.length) * 10) / 10
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
    return Object.entries(map).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
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
    return <p className="text-muted text-sm">No sessions recorded yet.</p>;
  }

  const statCard = 'bg-surface rounded-xl px-4 py-3.5 flex flex-col gap-1';
  const sectionTitle = 'font-mono text-[0.72rem] font-bold tracking-widest text-muted';

  return (
    <div className="flex flex-col gap-6 pb-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { value: summary.totalSessions, label: 'Sessions' },
          { value: summary.totalVolumeKg.toLocaleString(), label: 'Lifetime volume (kg)' },
          { value: summary.avgDuration > 0 ? formatDuration(summary.avgDuration) : '—', label: 'Avg duration' },
          { value: summary.avgRPE != null ? summary.avgRPE : '—', label: 'Avg RPE' },
        ].map(({ value, label }) => (
          <div key={label} className={statCard}>
            <span className="font-mono text-[1.4rem] font-bold text-text">{value}</span>
            <span className="text-[0.7rem] text-muted">{label}</span>
          </div>
        ))}
      </div>

      {/* e1RM Progress */}
      <div className="flex flex-col gap-3">
        <h2 className={sectionTitle}>e1RM PROGRESS</h2>
        <select
          className="bg-surface text-text border border-line rounded-lg px-3 py-2 font-sans text-[0.85rem] w-full cursor-pointer appearance-none outline-none focus:border-[var(--accent-a)]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%237a7a95' d='M6 8L0 0h12z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
            paddingRight: '32px',
          }}
          value={selectedExerciseId}
          onChange={(e) => setSelectedExerciseId(e.target.value)}
        >
          <option value="">— select exercise —</option>
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </select>

        {selectedExerciseId && e1rmHistory.length === 0 && (
          <p className="text-[0.85rem] text-muted">No e1RM data for this exercise yet.</p>
        )}
        {e1rmHistory.length > 0 && (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={e1rmHistory} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="#2a2a40" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#7a7a95', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#7a7a95', fontSize: 10 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={40} />
              <Tooltip content={<ChartTooltip unit=" kg" />} />
              <Line type="monotone" dataKey="e1rm" stroke="#ff6b4a" strokeWidth={2} dot={{ r: 3, fill: '#ff6b4a', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Weekly Volume */}
      {weeklyVolume.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className={sectionTitle}>WEEKLY VOLUME</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyVolume} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="#2a2a40" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: '#7a7a95', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#7a7a95', fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={<ChartTooltip unit=" kg" />} />
              <Bar dataKey="volume" fill="#ff6b4a" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
