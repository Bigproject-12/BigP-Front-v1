import { useMemo, useRef, useState } from 'react';
import './charts.css';

const WIDTH = 560;
const HEIGHT = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 32 };

export default function LineChart({ data, valueSuffix = '' }) {
  const svgRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  const { points, path, areaPath, yTicks, minY, maxY } = useMemo(() => {
    const values = data.map((d) => d.value);
    const rawMax = Math.max(...values);
    const rawMin = Math.min(...values, 0);
    const maxY = Math.ceil(rawMax / 10) * 10 + 5;
    const minY = Math.min(0, Math.floor(rawMin / 10) * 10);
    const innerW = WIDTH - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;

    const xFor = (i) => PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const yFor = (v) => PAD.top + innerH - ((v - minY) / (maxY - minY)) * innerH;

    const points = data.map((d, i) => ({ x: xFor(i), y: yFor(d.value), ...d }));
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const areaPath = `${path} L${points[points.length - 1].x},${PAD.top + innerH} L${points[0].x},${PAD.top + innerH} Z`;

    const yTicks = [minY, (minY + maxY) / 2, maxY];

    return { points, path, areaPath, yTicks, minY, maxY };
  }, [data]);

  const handleMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const localX = (e.clientX - rect.left) * scaleX;
    let closest = 0;
    let closestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - localX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    setHoverIndex(closest);
  };

  const active = hoverIndex !== null ? points[hoverIndex] : null;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  return (
    <div className="gr-chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="gr-chart__svg"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
        role="img"
        aria-label="코드 품질 추이 라인 차트"
      >
        {yTicks.map((t) => {
          const y = PAD.top + innerH - ((t - minY) / (maxY - minY)) * innerH;
          return (
            <g key={t}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} className="gr-chart__grid" />
              <text x={4} y={y + 4} className="gr-chart__axis-label">
                {Math.round(t)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} className="gr-chart__area" />
        <path d={path} className="gr-chart__line" />

        {points.map((p, i) => (
          <circle
            key={p.label}
            cx={p.x}
            cy={p.y}
            r={hoverIndex === i ? 5 : 3}
            className="gr-chart__dot"
          />
        ))}

        {points.map((p, i) => (
          <text key={p.label} x={p.x} y={HEIGHT - 6} textAnchor="middle" className="gr-chart__axis-label">
            {i % Math.ceil(points.length / 7) === 0 ? p.label : ''}
          </text>
        ))}

        {active && (
          <line
            x1={active.x}
            x2={active.x}
            y1={PAD.top}
            y2={PAD.top + innerH}
            className="gr-chart__crosshair"
          />
        )}
      </svg>

      {active && (
        <div
          className="gr-chart__tooltip"
          style={{ left: `${(active.x / WIDTH) * 100}%`, top: `${(active.y / HEIGHT) * 100}%` }}
        >
          <div className="gr-chart__tooltip-label">{active.label}</div>
          <div className="gr-chart__tooltip-value">
            {active.value}
            {valueSuffix}
          </div>
        </div>
      )}
    </div>
  );
}
