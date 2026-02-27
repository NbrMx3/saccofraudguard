import { Lock } from 'lucide-react'

interface GlowingShieldProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/* Concentric arc data: radius, startAngle, sweepAngle, opacity, hasDots */
interface ArcRing {
  r: number
  start: number
  sweep: number
  opacity: number
  width: number
  dots?: number
  speed?: number
}

export default function GlowingShield({ className = '', size = 'lg' }: GlowingShieldProps) {
  const sizeConfig = {
    sm: { container: 'w-48 h-48', scale: 0.45, icon: 'h-10 w-10' },
    md: { container: 'w-72 h-72', scale: 0.7, icon: 'h-16 w-16' },
    lg: { container: 'w-[420px] h-[420px]', scale: 1, icon: 'h-20 w-20 sm:h-24 sm:w-24' },
  }

  const config = sizeConfig[size]
  const cx = 210
  const cy = 210

  const arcs: ArcRing[] = [
    // Inner tight rings
    { r: 62, start: 0, sweep: 360, opacity: 0.25, width: 1.5 },
    { r: 72, start: 30, sweep: 120, opacity: 0.35, width: 2, dots: 8, speed: 30 },
    { r: 72, start: 200, sweep: 100, opacity: 0.25, width: 2 },
    { r: 85, start: 0, sweep: 360, opacity: 0.12, width: 1 },
    // Mid rings with arcs and dot segments
    { r: 100, start: -20, sweep: 160, opacity: 0.4, width: 2.5, dots: 12, speed: -25 },
    { r: 100, start: 180, sweep: 140, opacity: 0.2, width: 1.5 },
    { r: 115, start: 60, sweep: 200, opacity: 0.15, width: 1, dots: 6, speed: 20 },
    { r: 130, start: 10, sweep: 130, opacity: 0.35, width: 2, dots: 10, speed: -35 },
    { r: 130, start: 180, sweep: 120, opacity: 0.2, width: 1.5 },
    // Outer rings
    { r: 148, start: -30, sweep: 180, opacity: 0.3, width: 2, dots: 14, speed: 22 },
    { r: 148, start: 170, sweep: 150, opacity: 0.15, width: 1 },
    { r: 165, start: 40, sweep: 240, opacity: 0.12, width: 1.5, dots: 8, speed: -18 },
    { r: 182, start: 0, sweep: 120, opacity: 0.2, width: 2, speed: 28 },
    { r: 182, start: 150, sweep: 90, opacity: 0.15, width: 1 },
    { r: 182, start: 270, sweep: 70, opacity: 0.1, width: 1 },
    { r: 198, start: -10, sweep: 360, opacity: 0.06, width: 0.5 },
  ]

  /* SVG arc path helper */
  function describeArc(cx: number, cy: number, r: number, startDeg: number, sweepDeg: number) {
    if (sweepDeg >= 360) {
      return `M ${cx - r},${cy} A ${r},${r} 0 1,1 ${cx + r},${cy} A ${r},${r} 0 1,1 ${cx - r},${cy}`
    }
    const startRad = ((startDeg - 90) * Math.PI) / 180
    const endRad = ((startDeg + sweepDeg - 90) * Math.PI) / 180
    const x1 = cx + r * Math.cos(startRad)
    const y1 = cy + r * Math.sin(startRad)
    const x2 = cx + r * Math.cos(endRad)
    const y2 = cy + r * Math.sin(endRad)
    const largeArc = sweepDeg > 180 ? 1 : 0
    return `M ${x1},${y1} A ${r},${r} 0 ${largeArc},1 ${x2},${y2}`
  }

  /* Dot positions along an arc */
  function arcDots(cx: number, cy: number, r: number, startDeg: number, sweepDeg: number, count: number) {
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i < count; i++) {
      const angle = ((startDeg + (sweepDeg * i) / (count - 1 || 1) - 90) * Math.PI) / 180
      pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) })
    }
    return pts
  }

  return (
    <div className={`relative flex items-center justify-center ${config.container} ${className}`}>
      {/* Deep radial glow layers */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-full rounded-full bg-cyan-500/[0.07] blur-[80px] cyber-pulse" />
      </div>
      <div className="absolute inset-[15%] flex items-center justify-center">
        <div className="w-full h-full rounded-full bg-cyan-400/[0.12] blur-[50px] cyber-pulse" style={{ animationDelay: '1s' }} />
      </div>
      <div className="absolute inset-[30%] flex items-center justify-center">
        <div className="w-full h-full rounded-full bg-cyan-300/[0.15] blur-[30px] cyber-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* SVG concentric arcs */}
      <svg
        viewBox="0 0 420 420"
        className="absolute inset-0 w-full h-full"
        style={{ transform: `scale(${config.scale})` }}
      >
        <defs>
          <filter id="arc-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.15" />
            <stop offset="60%" stopColor="#00bcd4" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#001122" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background radial glow circle */}
        <circle cx={cx} cy={cy} r="200" fill="url(#center-glow)" />

        {/* Arcs and dot segments */}
        {arcs.map((arc, i) => (
          <g
            key={i}
            className={arc.speed ? 'cyber-spin' : ''}
            style={arc.speed ? {
              transformOrigin: `${cx}px ${cy}px`,
              animationDuration: `${Math.abs(arc.speed)}s`,
              animationDirection: arc.speed < 0 ? 'reverse' : 'normal',
            } : undefined}
          >
            <path
              d={describeArc(cx, cy, arc.r, arc.start, arc.sweep)}
              fill="none"
              stroke="#00e5ff"
              strokeWidth={arc.width}
              strokeOpacity={arc.opacity}
              strokeLinecap="round"
              filter={arc.opacity > 0.25 ? 'url(#arc-glow)' : undefined}
            />
            {arc.dots && arcDots(cx, cy, arc.r, arc.start, arc.sweep, arc.dots).map((pt, j) => (
              <circle
                key={j}
                cx={pt.x}
                cy={pt.y}
                r={1.8}
                fill="#00e5ff"
                fillOpacity={arc.opacity * 1.2}
              />
            ))}
          </g>
        ))}

        {/* Tick marks around inner ring */}
        {Array.from({ length: 36 }, (_, i) => {
          const angle = ((i * 10 - 90) * Math.PI) / 180
          const inner = 56
          const outer = i % 3 === 0 ? 60 : 58
          return (
            <line
              key={`tick-${i}`}
              x1={cx + inner * Math.cos(angle)}
              y1={cy + inner * Math.sin(angle)}
              x2={cx + outer * Math.cos(angle)}
              y2={cy + outer * Math.sin(angle)}
              stroke="#00e5ff"
              strokeWidth={i % 3 === 0 ? 1.5 : 0.5}
              strokeOpacity={i % 3 === 0 ? 0.4 : 0.15}
            />
          )
        })}
      </svg>

      {/* Central padlock icon */}
      <div className="relative z-10 flex items-center justify-center">
        {/* Inner glow behind padlock */}
        <div className="absolute w-28 h-28 sm:w-32 sm:h-32 bg-cyan-400/20 rounded-full blur-[25px]" />

        {/* Padlock */}
        <div className="relative p-5 sm:p-6">
          <Lock
            className={`${config.icon} text-cyan-400 relative z-10`}
            style={{
              filter: 'drop-shadow(0 0 25px rgba(0,229,255,0.6)) drop-shadow(0 0 50px rgba(0,229,255,0.3))',
            }}
            strokeWidth={1.8}
          />
        </div>
      </div>
    </div>
  )
}
