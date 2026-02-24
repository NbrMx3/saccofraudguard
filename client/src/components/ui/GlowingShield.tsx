import { Shield } from 'lucide-react'

interface GlowingShieldProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function GlowingShield({ className = '', size = 'lg' }: GlowingShieldProps) {
  const sizeConfig = {
    sm: { container: 'w-32 h-32', icon: 'h-12 w-12', rings: [48, 56, 64], grid: 120 },
    md: { container: 'w-56 h-56', icon: 'h-20 w-20', rings: [80, 96, 112], grid: 200 },
    lg: { container: 'w-72 h-72 sm:w-80 sm:h-80', icon: 'h-24 w-24 sm:h-28 sm:w-28', rings: [112, 136, 160], grid: 280 },
  }

  const config = sizeConfig[size]

  return (
    <div className={`relative flex items-center justify-center ${config.container} ${className}`}>
      {/* Outermost glow */}
      <div className="absolute inset-0 rounded-full bg-sky-500/[0.04] blur-[60px] cyber-pulse" />

      {/* Rotating wireframe rings */}
      {config.rings.map((r, i) => (
        <div
          key={i}
          className="absolute rounded-full border cyber-spin"
          style={{
            width: r * 2,
            height: r * 2,
            borderColor: `rgba(56, 189, 248, ${0.08 - i * 0.02})`,
            animationDuration: `${20 + i * 8}s`,
            animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
          }}
        />
      ))}

      {/* Grid overlay on globe area */}
      <div
        className="absolute rounded-full opacity-[0.04]"
        style={{
          width: config.grid,
          height: config.grid,
          backgroundImage: `
            linear-gradient(rgba(56,189,248,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.4) 1px, transparent 1px)
          `,
          backgroundSize: '16px 16px',
          mask: 'radial-gradient(circle, black 60%, transparent 100%)',
          WebkitMask: 'radial-gradient(circle, black 60%, transparent 100%)',
        }}
      />

      {/* Center padlock / shield */}
      <div className="relative z-10 flex items-center justify-center">
        {/* Inner glow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-28 h-28 sm:w-36 sm:h-36 bg-sky-400/[0.08] rounded-full blur-[30px] cyber-pulse" />
        </div>

        {/* Digital mosaic background */}
        <div className="relative">
          <div className="absolute -inset-6 sm:-inset-8">
            <div className="w-full h-full cyber-grid-mosaic rounded-2xl overflow-hidden" />
          </div>

          {/* Keyhole shield icon */}
          <div className="relative flex items-center justify-center p-6 sm:p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-400/20 to-blue-600/10 rounded-2xl border border-sky-400/20 backdrop-blur-sm" />
            <Shield className={`${config.icon} text-sky-400 relative z-10 drop-shadow-[0_0_20px_rgba(56,189,248,0.5)]`} />
          </div>
        </div>
      </div>

      {/* Connecting lines radiating out */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <div
          key={angle}
          className="absolute h-px bg-gradient-to-r from-sky-400/20 to-transparent"
          style={{
            width: '140%',
            transform: `rotate(${angle}deg)`,
            transformOrigin: 'left center',
            left: '50%',
            top: '50%',
            opacity: 0.3,
          }}
        />
      ))}
    </div>
  )
}
