import { useEffect, useMemo, useRef, useState } from 'react';
import './charts.css';

const HEIGHT = 220;
const PAD = { top: 16, right: 16, bottom: 30, left: 38 };
// 측정 전 첫 렌더에 쓰는 기본 폭. 곧바로 실제 폭으로 교체된다.
const FALLBACK_WIDTH = 560;
// x축 라벨 하나가 겹치지 않고 차지하는 최소 폭(px). 이보다 촘촘해지면 라벨을 건너뛴다.
const LABEL_MIN_GAP = 64;

export default function LineChart({ data, valueSuffix = '' }) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [width, setWidth] = useState(FALLBACK_WIDTH);

  // 고정 viewBox에 width:100%를 걸면 폭이 줄 때 글자까지 함께 축소돼
  // 축 라벨(9px)이 4~5px로 뭉개진다. 컨테이너 폭을 실제로 재서 viewBox 폭으로 쓰면
  // 1 유저 단위 = 1 CSS px이 되어, 어떤 너비에서도 글자 크기가 그대로 유지된다.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0].contentRect.width);
      if (next > 0) setWidth(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { points, path, areaPath, yTicks, minY, maxY, labelStep } = useMemo(() => {
    const values = data.map((d) => d.value);
    const rawMax = Math.max(...values);
    const rawMin = Math.min(...values, 0);
    const maxY = Math.ceil(rawMax / 10) * 10 + 5;
    const minY = Math.min(0, Math.floor(rawMin / 10) * 10);
    const innerW = width - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;

    const xFor = (i) => PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const yFor = (v) => PAD.top + innerH - ((v - minY) / (maxY - minY)) * innerH;

    const points = data.map((d, i) => ({ x: xFor(i), y: yFor(d.value), ...d }));
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const areaPath = `${path} L${points[points.length - 1].x},${PAD.top + innerH} L${points[0].x},${PAD.top + innerH} Z`;

    const yTicks = [minY, (minY + maxY) / 2, maxY];

    // 좁아질수록 라벨을 성기게 찍는다. 폭이 아니라 개수를 줄이는 방식이라
    // 글자는 작아지지 않고 겹침만 사라진다.
    const maxLabels = Math.max(2, Math.floor(innerW / LABEL_MIN_GAP));
    const labelStep = Math.max(1, Math.ceil(data.length / maxLabels));

    return { points, path, areaPath, yTicks, minY, maxY, labelStep };
  }, [data, width]);

  const handleMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // viewBox 폭과 실제 폭이 같으므로 배율은 1이지만, 폰트 확대 등으로
    // 어긋날 수 있어 안전하게 비율을 계산한다.
    const scaleX = rect.width > 0 ? width / rect.width : 1;
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
    <div className="gr-chart" ref={wrapRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        width={width}
        height={HEIGHT}
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
              <line x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} className="gr-chart__grid" />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" className="gr-chart__axis-label">
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

        {points.map((p, i) =>
          i % labelStep === 0 ? (
            <text key={p.label} x={p.x} y={HEIGHT - 8} textAnchor="middle" className="gr-chart__axis-label">
              {p.label}
            </text>
          ) : null
        )}

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
          style={{ left: `${(active.x / width) * 100}%`, top: `${(active.y / HEIGHT) * 100}%` }}
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
