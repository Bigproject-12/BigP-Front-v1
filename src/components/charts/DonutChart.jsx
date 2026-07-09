import { useMemo, useState } from 'react';
import './charts.css';

const SIZE = 200;
const STROKE = 26;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
const GAP = 3;

const COLOR_VARS = ['var(--chart-cat-1)', 'var(--chart-cat-2)', 'var(--chart-cat-3)', 'var(--chart-cat-4)'];

export default function DonutChart({ data, labelKey = 'type', valueKey = 'count' }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const total = useMemo(() => data.reduce((sum, d) => sum + d[valueKey], 0), [data, valueKey]);

  const segments = useMemo(() => {
    let cumulative = 0;
    return data.map((d, i) => {
      const fraction = total === 0 ? 0 : d[valueKey] / total;
      const length = Math.max(fraction * C - GAP, 0);
      const offset = cumulative;
      cumulative += fraction * C;
      return {
        ...d,
        color: COLOR_VARS[i % COLOR_VARS.length],
        length,
        offset,
        percent: Math.round(fraction * 100),
      };
    });
  }, [data, total, valueKey]);

  return (
    <div className="gr-donut">
      <div className="gr-donut__chart">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label="이슈 유형 분포 도넛 차트">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="var(--surface-soft)"
            strokeWidth={STROKE}
          />
          {segments.map((s, i) => (
            <circle
              key={s[labelKey]}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={hoverIndex === i ? STROKE + 4 : STROKE}
              strokeDasharray={`${s.length} ${C - s.length}`}
              strokeDashoffset={-s.offset + GAP / 2}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              className="gr-donut__seg"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            />
          ))}
          <text x={SIZE / 2} y={SIZE / 2 - 4} textAnchor="middle" className="gr-donut__total-value">
            {total}
          </text>
          <text x={SIZE / 2} y={SIZE / 2 + 16} textAnchor="middle" className="gr-donut__total-label">
            전체 이슈
          </text>
        </svg>
      </div>

      <ul className="gr-donut__legend">
        {segments.map((s, i) => (
          <li
            key={s[labelKey]}
            className={`gr-donut__legend-item ${hoverIndex === i ? 'gr-donut__legend-item--active' : ''}`}
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <span className="gr-donut__swatch" style={{ background: s.color }} />
            <span className="text-body-sm gr-donut__legend-label">{s[labelKey]}</span>
            <span className="text-caption-md">
              {s[valueKey]}건 · {s.percent}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
