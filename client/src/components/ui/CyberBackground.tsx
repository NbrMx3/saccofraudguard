import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
}

/** Binary digit falling column */
interface BinaryColumn {
  x: number
  y: number
  speed: number
  chars: string[]
  opacity: number
  fontSize: number
}

interface CyberBackgroundProps {
  particleCount?: number
  connectionDistance?: number
  className?: string
  color?: [number, number, number] // RGB
  opacity?: number
  showBinary?: boolean
  binaryColumns?: number
}

export default function CyberBackground({
  particleCount = 55,
  connectionDistance = 140,
  className = '',
  color = [0, 229, 255], // cyan #00e5ff
  opacity = 1,
  showBinary = true,
  binaryColumns = 30,
}: CyberBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const binaryRef = useRef<BinaryColumn[]>([])
  const mouseRef = useRef({ x: -1000, y: -1000 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 }
    }
    canvas.addEventListener('mousemove', handleMouse)
    canvas.addEventListener('mouseleave', handleMouseLeave)

    // Initialize particles
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2 + 0.8,
    }))

    // Initialize binary columns
    if (showBinary) {
      binaryRef.current = Array.from({ length: binaryColumns }, () => {
        const colLen = Math.floor(Math.random() * 8) + 4
        return {
          x: Math.random() * w,
          y: Math.random() * h * 2 - h,
          speed: Math.random() * 0.3 + 0.15,
          chars: Array.from({ length: colLen }, () => (Math.random() > 0.5 ? '1' : '0')),
          opacity: Math.random() * 0.08 + 0.03,
          fontSize: Math.random() * 4 + 10,
        }
      })
    }

    const [r, g, b] = color

    const animate = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)

      // ── Binary rain ─────────────────────────────
      if (showBinary) {
        for (const col of binaryRef.current) {
          ctx.font = `${col.fontSize}px monospace`
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${col.opacity * opacity})`
          for (let j = 0; j < col.chars.length; j++) {
            const cy = col.y + j * (col.fontSize + 2)
            if (cy > -col.fontSize && cy < h + col.fontSize) {
              ctx.fillText(col.chars[j], col.x, cy)
            }
          }
          col.y += col.speed
          // Reset column when it scrolls off
          const totalHeight = col.chars.length * (col.fontSize + 2)
          if (col.y > h + totalHeight) {
            col.y = -totalHeight
            col.x = Math.random() * w
            // Re-randomize chars
            for (let k = 0; k < col.chars.length; k++) {
              col.chars[k] = Math.random() > 0.5 ? '1' : '0'
            }
          }
        }
      }

      // ── Particles ───────────────────────────────
      const particles = particlesRef.current
      const mouse = mouseRef.current

      for (const p of particles) {
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const mouseDist = Math.sqrt(dx * dx + dy * dy)
        if (mouseDist < 120) {
          const force = (120 - mouseDist) / 120
          p.vx += (dx / mouseDist) * force * 0.02
          p.vy += (dy / mouseDist) * force * 0.02
        }
        p.vx *= 0.999
        p.vy *= 0.999
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) { p.x = 0; p.vx *= -1 }
        if (p.x > w) { p.x = w; p.vx *= -1 }
        if (p.y < 0) { p.y = 0; p.vy *= -1 }
        if (p.y > h) { p.y = h; p.vy *= -1 }
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < connectionDistance) {
            const alpha = (1 - dist / connectionDistance) * 0.2 * opacity
            ctx.beginPath()
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
            ctx.lineWidth = 0.6
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // Mouse connections
      for (const p of particles) {
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < connectionDistance * 1.2) {
          const alpha = (1 - dist / (connectionDistance * 1.2)) * 0.35 * opacity
          ctx.beginPath()
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
          ctx.lineWidth = 0.8
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(mouse.x, mouse.y)
          ctx.stroke()
        }
      }

      // Draw particles with glow
      for (const p of particles) {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 5)
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.2 * opacity})`)
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
        ctx.beginPath()
        ctx.fillStyle = gradient
        ctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.7 * opacity})`
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', handleMouse)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
      cancelAnimationFrame(animationRef.current)
    }
  }, [particleCount, connectionDistance, color, opacity, showBinary, binaryColumns])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ pointerEvents: 'auto' }}
    />
  )
}
