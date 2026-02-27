import { ArrowRight, Shield, Activity } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import CyberBackground from '@/components/ui/CyberBackground'
import FloatingIcons from '@/components/ui/FloatingIcons'
import GlowingShield from '@/components/ui/GlowingShield'

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#020a18]">
      {/* Deep navy gradient base matching screenshot */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#010812] via-[#041428] to-[#020a18]" />
        {/* Radial cyan glow (matching screenshot center glow) */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[800px] bg-cyan-500/[0.04] rounded-full blur-[160px]" />
        <div className="absolute top-1/2 right-1/3 w-[500px] h-[500px] bg-cyan-400/[0.03] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/15 to-transparent" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,229,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.15) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Canvas particle network + binary rain */}
      <CyberBackground particleCount={50} connectionDistance={150} color={[0, 229, 255]} opacity={0.6} showBinary={true} binaryColumns={35} />

      {/* Floating tech icons */}
      <FloatingIcons />

      {/* Scan line effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent cyber-scanline" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 pb-20 md:pt-40 md:pb-28 z-10">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-1.5 mb-8 backdrop-blur-sm">
              <Activity className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-medium text-cyan-400 tracking-wide uppercase">
                Real-Time Fraud Detection
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.1]">
              Intelligent Fraud Detection for{' '}
              <span className="relative">
                <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-500 bg-clip-text text-transparent">
                  SACCOs & Chamas
                </span>
              </span>
            </h1>

            {/* Subtext */}
            <p className="mt-6 text-lg leading-relaxed text-slate-400 sm:text-xl max-w-xl">
              Monitor transactions, detect suspicious activity in real-time, and
              protect member funds with rule-based risk intelligence.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/signup"
                className="group inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-600 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-cyan-500/20 transition-all hover:shadow-cyan-500/40 hover:from-cyan-400 hover:to-teal-500 active:scale-[0.98]"
              >
                Get Started
                <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/login"
                className="group inline-flex items-center justify-center gap-2.5 rounded-2xl border border-cyan-400/20 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:border-cyan-400/40 hover:bg-white/10 active:scale-[0.98]"
              >
                <Shield className="h-4.5 w-4.5 text-cyan-400" />
                Admin Login
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 flex items-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50 animate-pulse" />
                <span>AML Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50 animate-pulse" />
                <span>256-bit Encryption</span>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50 animate-pulse" />
                <span>SACCO Focused</span>
              </div>
            </div>
          </div>

          {/* Right – Glowing Padlock with concentric arcs */}
          <div className="hidden lg:flex items-center justify-center">
            <GlowingShield size="lg" />
          </div>
        </div>

        {/* Live stats bar */}
        <div className="mt-16 lg:mt-24">
          <div className="rounded-2xl border border-cyan-400/10 bg-white/[0.02] backdrop-blur-sm p-1">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
              {[
                { label: 'Transactions Monitored', value: '12,847', change: '+12%' },
                { label: 'Threats Blocked', value: '23', change: '-8% this week' },
                { label: 'System Accuracy', value: '94.2%', change: '+2.1%' },
                { label: 'Active Monitoring', value: '24/7', change: 'Always On' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl p-4 sm:p-5 hover:bg-white/[0.03] transition-colors">
                  <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs font-medium mt-1 text-cyan-400">{stat.change}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
