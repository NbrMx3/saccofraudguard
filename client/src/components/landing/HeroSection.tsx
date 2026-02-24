import { ArrowRight, Shield, Activity, ChevronRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-slate-950">
      {/* Background Effects */}
      <div className="absolute inset-0">
        {/* Main gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
        {/* Radial glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-emerald-500/[0.07] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 mb-8">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400 tracking-wide uppercase">
                Real-Time Fraud Detection
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.1]">
              Intelligent Fraud Detection for{' '}
              <span className="relative">
                <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
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
                className="group inline-flex items-center justify-center gap-2.5 rounded-2xl bg-emerald-500 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/30 active:scale-[0.98]"
              >
                Get Started
                <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/login"
                className="group inline-flex items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 active:scale-[0.98]"
              >
                <Shield className="h-4.5 w-4.5 text-emerald-400" />
                Admin Login
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 flex items-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                <span>AML Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                <span>256-bit Encryption</span>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                <span>SACCO Focused</span>
              </div>
            </div>
          </div>

          {/* Right – Dashboard Preview Card */}
          <div className="hidden lg:block">
            <div className="relative">
              {/* Glow behind card */}
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-emerald-500/10 to-teal-500/5 blur-2xl" />

              <div className="relative rounded-2xl border border-white/[0.08] bg-slate-900/80 p-6 shadow-2xl backdrop-blur-sm">
                {/* Card header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <Shield className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Risk Dashboard</p>
                      <p className="text-xs text-slate-500">Live Monitoring</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-400">Active</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { label: 'Transactions', value: '12,847', change: '+12%', up: true },
                    { label: 'Flagged', value: '23', change: '-8%', up: false },
                    { label: 'Risk Score', value: '94.2%', change: '+2%', up: true },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
                    >
                      <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                      <p className="text-lg font-bold text-white">{stat.value}</p>
                      <p className={`text-xs font-medium mt-1 ${stat.up ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {stat.change}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Mock Transaction List */}
                <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                    <p className="text-xs font-semibold text-white">Recent Alerts</p>
                    <a href="#" className="flex items-center text-xs text-emerald-400 hover:text-emerald-300">
                      View all <ChevronRight className="h-3 w-3 ml-0.5" />
                    </a>
                  </div>
                  {[
                    { id: 'TX-4821', amount: 'KES 450,000', risk: 'High', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
                    { id: 'TX-4819', amount: 'KES 120,000', risk: 'Medium', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                    { id: 'TX-4815', amount: 'KES 89,500', risk: 'Low', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                  ].map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{tx.id}</p>
                        <p className="text-xs text-slate-500">{tx.amount}</p>
                      </div>
                      <span className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${tx.color}`}>
                        {tx.risk}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
