import {
  Wifi,
  Cloud,
  Mail,
  Lock,
  User,
  Settings,
  Shield,
  Database,
  Globe,
  Fingerprint,
  Key,
  Server,
  Eye,
  MonitorSmartphone,
  type LucideIcon,
} from 'lucide-react'

interface FloatingIcon {
  Icon: LucideIcon
  top: string
  left: string
  delay: string
  duration: string
  size: number
}

const icons: FloatingIcon[] = [
  { Icon: Wifi, top: '8%', left: '6%', delay: '0s', duration: '7s', size: 18 },
  { Icon: Cloud, top: '12%', left: '82%', delay: '1.2s', duration: '8s', size: 20 },
  { Icon: Mail, top: '55%', left: '4%', delay: '2.4s', duration: '6s', size: 16 },
  { Icon: Lock, top: '18%', left: '28%', delay: '0.6s', duration: '9s', size: 22 },
  { Icon: User, top: '72%', left: '88%', delay: '1.8s', duration: '7s', size: 17 },
  { Icon: Settings, top: '82%', left: '12%', delay: '3.2s', duration: '8s', size: 19 },
  { Icon: Shield, top: '6%', left: '55%', delay: '0.9s', duration: '7s', size: 21 },
  { Icon: Database, top: '42%', left: '2%', delay: '2.8s', duration: '6s', size: 15 },
  { Icon: Globe, top: '25%', left: '92%', delay: '1.5s', duration: '9s', size: 20 },
  { Icon: Fingerprint, top: '88%', left: '72%', delay: '0.3s', duration: '8s', size: 18 },
  { Icon: Key, top: '48%', left: '94%', delay: '2.1s', duration: '7s', size: 16 },
  { Icon: Server, top: '78%', left: '38%', delay: '1.6s', duration: '6s', size: 17 },
  { Icon: Eye, top: '32%', left: '8%', delay: '3.5s', duration: '9s', size: 15 },
  { Icon: MonitorSmartphone, top: '65%', left: '55%', delay: '0.7s', duration: '7s', size: 19 },
]

interface FloatingIconsProps {
  className?: string
}

export default function FloatingIcons({ className = '' }: FloatingIconsProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {icons.map((item, i) => (
        <div
          key={i}
          className="absolute cyber-float"
          style={{
            top: item.top,
            left: item.left,
            animationDelay: item.delay,
            animationDuration: item.duration,
          }}
        >
          <item.Icon
            style={{ width: item.size, height: item.size }}
            className="text-cyan-400/15 drop-shadow-[0_0_8px_rgba(0,229,255,0.15)]"
          />
        </div>
      ))}
    </div>
  )
}
