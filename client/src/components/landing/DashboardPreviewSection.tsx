import {
  Shield,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

export default function DashboardPreviewSection() {
  return (
    <section id="dashboard" className="relative bg-[#020a18] py-24 sm:py-32 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent" />
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-cyan-500/[0.04] rounded-full blur-[100px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400 mb-3">
            Dashboard Preview
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Powerful analytics at your{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-500 bg-clip-text text-transparent">
              fingertips
            </span>
          </h2>
          <p className="mt-5 text-lg text-slate-400 leading-relaxed">
            A comprehensive risk monitoring dashboard built for SACCO compliance
            officers and financial administrators.
          </p>
        </div>

        {/* Dashboard Mockup */}
        <div className="relative mx-auto max-w-5xl">
          {/* Outer glow */}
          <div className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-cyan-500/5 to-teal-500/5 blur-2xl" />

          <div className="relative rounded-2xl border border-white/[0.08] bg-slate-900/70 shadow-2xl backdrop-blur-sm overflow-hidden">
            {/* Titlebar */}
            <div className="flex items-center gap-2 border-b border-white/5 px-6 py-3">
              <div className="flex gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-amber-500/60" />
                <div className="h-3 w-3 rounded-full bg-cyan-500/60" />
              </div>
              <div className="flex-1 text-center">
                <span className="text-xs text-slate-500 font-medium">
                  SaccoFraudGuard — Risk Dashboard
                </span>
              </div>
            </div>

            <div className="p-6">
              {/* Top Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  {
                    label: 'Total Transactions',
                    value: '24,513',
                    change: '+18.2%',
                    up: true,
                    icon: TrendingUp,
                  },
                  {
                    label: 'Flagged Alerts',
                    value: '47',
                    change: '-12.5%',
                    up: false,
                    icon: AlertTriangle,
                  },
                  {
                    label: 'System Accuracy',
                    value: '97.8%',
                    change: '+1.4%',
                    up: true,
                    icon: Shield,
                  },
                  {
                    label: 'Risk Coverage',
                    value: '100%',
                    change: 'Stable',
                    up: true,
                    icon: BarChart3,
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <stat.icon className="h-4 w-4 text-slate-500" />
                      <div className={`flex items-center gap-1 text-xs font-medium ${stat.up ? 'text-cyan-400' : 'text-amber-400'}`}>
                        {stat.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {stat.change}
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Chart + Table */}
              <div className="grid gap-6 lg:grid-cols-5">
                {/* Chart Area */}
                <div className="lg:col-span-3 rounded-xl border border-white/5 bg-white/[0.02] p-5">
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-sm font-semibold text-white">
                      Transaction Volume
                    </p>
                    <div className="flex gap-3 text-xs text-slate-500">
                      <span className="text-cyan-400 font-medium">7D</span>
                      <span className="hover:text-slate-300 cursor-pointer">30D</span>
                      <span className="hover:text-slate-300 cursor-pointer">90D</span>
                    </div>
                  </div>
                  {/* Mock chart bars */}
                  <div className="flex items-end gap-2 h-40">
                    {[40, 65, 55, 80, 45, 70, 90, 60, 75, 85, 50, 95].map(
                      (h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-md bg-gradient-to-t from-cyan-500/30 to-cyan-500/60 transition-all hover:from-cyan-500/40 hover:to-cyan-400/80"
                          style={{ height: `${h}%` }}
                        />
                      )
                    )}
                  </div>
                  <div className="flex justify-between mt-3 text-xs text-slate-600">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                  </div>
                </div>

                {/* Fraud Alerts Table */}
                <div className="lg:col-span-2 rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5">
                    <p className="text-sm font-semibold text-white">
                      Fraud Alerts
                    </p>
                  </div>
                  <div className="divide-y divide-white/5">
                    {[
                      {
                        member: 'John Mwangi',
                        type: 'Withdrawal',
                        amount: 'KES 890,000',
                        risk: 'Critical',
                        riskColor: 'text-red-400 bg-red-500/10',
                      },
                      {
                        member: 'Grace Wanjiku',
                        type: 'Transfer',
                        amount: 'KES 350,000',
                        risk: 'High',
                        riskColor: 'text-orange-400 bg-orange-500/10',
                      },
                      {
                        member: 'Peter Ochieng',
                        type: 'Deposit',
                        amount: 'KES 200,000',
                        risk: 'Medium',
                        riskColor: 'text-amber-400 bg-amber-500/10',
                      },
                      {
                        member: 'Mary Akinyi',
                        type: 'Loan',
                        amount: 'KES 1,200,000',
                        risk: 'High',
                        riskColor: 'text-orange-400 bg-orange-500/10',
                      },
                    ].map((alert, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {alert.member}
                          </p>
                          <p className="text-xs text-slate-500">
                            {alert.type} · {alert.amount}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${alert.riskColor}`}
                        >
                          {alert.risk}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
