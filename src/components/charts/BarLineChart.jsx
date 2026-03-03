import React, { useMemo } from 'react';

const WIDTH = 680;
const HEIGHT = 240;
const PADDING = { top: 20, right: 36, bottom: 38, left: 40 };

function buildLayout(points) {
  if (!points.length) return { bars: [], line: [], maxVolume: 1, maxHardSets: 1 };

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const maxVolume = Math.max(1, ...points.map((p) => p.volume || 0));
  const maxHardSets = Math.max(1, ...points.map((p) => p.hardSets || 0));

  const step = plotWidth / points.length;
  const barWidth = Math.max(16, step * 0.55);

  const bars = points.map((point, index) => {
    const xCenter = PADDING.left + (step * index) + step / 2;
    const h = ((point.volume || 0) / maxVolume) * plotHeight;
    return {
      ...point,
      x: xCenter - barWidth / 2,
      y: PADDING.top + (plotHeight - h),
      width: barWidth,
      height: h,
      xCenter,
    };
  });

  const line = bars.map((bar) => {
    const y = PADDING.top + (plotHeight - ((bar.hardSets || 0) / maxHardSets) * plotHeight);
    return { x: bar.xCenter, y, weekStart: bar.weekStart, hardSets: bar.hardSets };
  });

  return { bars, line, maxVolume, maxHardSets };
}

export default function BarLineChart({ points }) {
  const { bars, line, maxVolume, maxHardSets } = useMemo(() => buildLayout(points || []), [points]);

  if (!bars.length) {
    return <div className="chart-empty mono">No data in selected range.</div>;
  }

  const linePath = line.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="chart-wrap">
      <svg className="chart-svg chart-svg-barline" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Weekly volume and hard sets chart">
        <line className="chart-axis" x1={PADDING.left} y1={HEIGHT - PADDING.bottom} x2={WIDTH - PADDING.right} y2={HEIGHT - PADDING.bottom} />
        <line className="chart-axis" x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={HEIGHT - PADDING.bottom} />
        <line className="chart-axis" x1={WIDTH - PADDING.right} y1={PADDING.top} x2={WIDTH - PADDING.right} y2={HEIGHT - PADDING.bottom} />

        <text className="chart-y-label" x={6} y={PADDING.top + 6}>{Math.round(maxVolume)}</text>
        <text className="chart-y-label" x={6} y={HEIGHT - PADDING.bottom}>{0}</text>
        <text className="chart-y-label" x={WIDTH - 4} y={PADDING.top + 6} textAnchor="end">{Math.round(maxHardSets)}</text>

        {bars.map((bar) => (
          <g key={bar.weekStart}>
            <rect
              className="chart-bar"
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={Math.max(1, bar.height)}
              rx="3"
            />
          </g>
        ))}

        <path className="chart-line chart-line-hardsets" d={linePath} fill="none" />

        {line.map((point) => (
          <circle key={`${point.weekStart}-hard`} className="chart-point chart-point-hardsets" cx={point.x} cy={point.y} r="3" />
        ))}

        {bars.map((bar, index) => {
          if (bars.length > 3 && index !== 0 && index !== bars.length - 1) return null;
          return (
            <text
              key={`week-${bar.weekStart}`}
              className="chart-x-label mono"
              x={bar.xCenter}
              y={HEIGHT - 10}
              textAnchor={index === 0 ? 'start' : index === bars.length - 1 ? 'end' : 'middle'}
            >
              {bar.weekStart.slice(5)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
