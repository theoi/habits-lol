import type { WeekRate } from '../lib/stats';
import { formatDay, formatPercent } from '../ui/format';
import { habitVars } from '../ui/color';

const H = 132;
const BOTTOM = 22;
const TOP = 8;
const LEFT = 34;

export function WeeklyChart({ rates, color }: { rates: WeekRate[]; color: string }) {
  const n = rates.length;
  const slot = 26;
  const width = LEFT + n * slot;
  const plotH = H - BOTTOM - TOP;
  const y = (v: number) => TOP + plotH * (1 - v);
  return (
    <svg
      className="chart"
      viewBox={`0 0 ${width} ${H}`}
      width="100%"
      role="img"
      aria-label="Weekly completion rate"
      style={habitVars(color)}
    >
      {[0, 0.5, 1].map((v) => (
        <g key={v}>
          <line x1={LEFT - 4} x2={width} y1={y(v)} y2={y(v)} className="chart-grid" />
          <text x={LEFT - 8} y={y(v) + 4} textAnchor="end" className="chart-label">
            {v * 100}%
          </text>
        </g>
      ))}
      {rates.map((r, i) => {
        const x = LEFT + i * slot + 5;
        const bw = slot - 10;
        const showLabel = (n - 1 - i) % 3 === 0;
        return (
          <g key={r.weekStart}>
            {r.rate === null ? (
              <rect x={x} y={y(0) - 2} width={bw} height={2} rx={1} className="chart-empty" />
            ) : (
              <rect
                x={x}
                y={y(r.rate)}
                width={bw}
                height={Math.max(2, plotH * r.rate)}
                rx={5}
                className="chart-bar"
                opacity={i === n - 1 ? 0.55 : 1}
              >
                <title>{`Week of ${formatDay(r.weekStart, 'd MMM')}: ${formatPercent(r.rate)}`}</title>
              </rect>
            )}
            {showLabel && (
              <text x={x + bw / 2} y={H - 6} textAnchor="middle" className="chart-label">
                {formatDay(r.weekStart, 'd MMM')}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
