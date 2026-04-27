interface SparklineProps {
  data: number[]
  color: string
  width?: number
  height?: number
  filled?: boolean
  hour?: number // dot position
}

export function Sparkline({ data, color, width = 100, height = 28, filled = true, hour }: SparklineProps) {
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - (v / max) * (height - 4)}`)
  const line = pts.join(' ')
  const fillPts = `0,${height} ${line} ${width},${height}`
  const h = hour ?? new Date().getHours()
  const x = (h / 23) * width
  const y = height - (data[h] / max) * (height - 4)
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {filled && <polygon points={fillPts} fill={`${color}20`} />}
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={x} cy={y} r={3} fill={color} stroke="#fff" strokeWidth={1} />
    </svg>
  )
}

interface MiniBarChartProps {
  labels: string[]
  values: number[]
  colors: string[]
  width?: number
  height?: number
}

export function MiniBarChart({ labels, values, colors, width = 120, height = 40 }: MiniBarChartProps) {
  const max = Math.max(...values, 1)
  const bw = (width - (values.length - 1) * 3) / values.length
  return (
    <svg width={width} height={height + 14} viewBox={`0 0 ${width} ${height + 14}`}>
      {values.map((v, i) => {
        const bh = (v / max) * height
        const x = i * (bw + 3)
        return (
          <g key={i}>
            <rect
              x={x}
              y={height - bh}
              width={bw}
              height={bh}
              rx={2}
              fill={colors[i] || '#8B5CF6'}
              opacity={0.85}
            />
            <text
              x={x + bw / 2}
              y={height + 11}
              textAnchor="middle"
              fontSize={7}
              fill="rgba(255,255,255,0.5)"
              fontFamily="'JetBrains Mono', monospace"
            >
              {labels[i]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

interface HeatmapGridProps {
  data: number[][]
  width?: number
  height?: number
}

export function HeatmapGrid({ data, width = 100, height = 50 }: HeatmapGridProps) {
  const rows = data.length
  const cols = data[0]?.length ?? 0
  const cw = width / cols
  const ch = height / rows
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {data.map((row, r) =>
        row.map((v, c) => (
          <rect
            key={`${r}-${c}`}
            x={c * cw}
            y={r * ch}
            width={cw - 0.5}
            height={ch - 0.5}
            rx={1}
            fill={v > 0.7 ? '#EF4444' : v > 0.4 ? '#FF6B35' : v > 0.2 ? '#FFD166' : '#06D6A022'}
            opacity={0.3 + v * 0.7}
          />
        )),
      )}
    </svg>
  )
}
