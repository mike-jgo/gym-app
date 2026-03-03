import React, { useMemo } from 'react';

const WIDTH = 680;
const HEIGHT = 220;
const PADDING = { top: 18, right: 16, bottom: 34, left: 36 };

function round1(value) {
  return Math.round(value * 10) / 10;
}

function buildPoints(points) {
  if (!points.length) return [];

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const yMin = span === 0 ? min - Math.max(1, min * 0.05) : min - span * 0.08;
  const yMax = span === 0 ? max + Math.max(1, max * 0.05) : max + span * 0.08;
  const safeSpan = Math.max(1e-6, yMax - yMin);

  return points.map((point, index) => {
    const x = points.length === 1
      ? (PADDING.left + (plotWidth / 2))
      : (PADDING.left + (plotWidth * index) / (points.length - 1));
    const y = PADDING.top + ((yMax - point.value) / safeSpan) * plotHeight;

    return {
      ...point,
      x,
      y,
      yMin: round1(yMin),
      yMax: round1(yMax),
    };
  });
}

export default function LineChart({ points, strokeClass = 'chart-line-default' }) {
  const layout = useMemo(() => buildPoints(points || []), [points]);

  if (!layout.length) {
    return <div className="chart-empty mono">No data in selected range.</div>;
  }

  const path = layout.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const yMin = layout[0].yMin;
  const yMax = layout[0].yMax;

  return (
    <div className="chart-wrap">
      <svg className="chart-svg chart-svg-line" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Line chart">
        <line className="chart-axis" x1={PADDING.left} y1={HEIGHT - PADDING.bottom} x2={WIDTH - PADDING.right} y2={HEIGHT - PADDING.bottom} />
        <line className="chart-axis" x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={HEIGHT - PADDING.bottom} />

        <text className="chart-y-label" x={6} y={PADDING.top + 6}>{yMax}</text>
        <text className="chart-y-label" x={6} y={HEIGHT - PADDING.bottom}>{yMin}</text>

        <path className={`chart-line ${strokeClass}`} d={path} fill="none" />

        {layout.map((point) => (
          <g key={`${point.date}-${point.value}`}>
            <circle className="chart-point" cx={point.x} cy={point.y} r="3.5" />
          </g>
        ))}

        {layout.map((point, index) => {
          if (layout.length > 3 && index !== 0 && index !== layout.length - 1) return null;
          return (
            <text
              key={`label-${point.date}-${index}`}
              className="chart-x-label mono"
              x={point.x}
              y={HEIGHT - 10}
              textAnchor={index === 0 ? 'start' : index === layout.length - 1 ? 'end' : 'middle'}
            >
              {point.date.slice(5)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
