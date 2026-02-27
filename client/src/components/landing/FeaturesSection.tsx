import {
  Activity,
  ShieldCheck,
  Brain,
  FileSearch,
} from 'lucide-react'

const features = [
  {
    icon: Activity,
    title: 'Real-Time Transaction Monitoring',
    description:
      'Track every transaction as it happens with live dashboards and instant anomaly detection across all SACCO operations.',
  },
  {
    icon: ShieldCheck,
    title: 'Risk Scoring Engine',
    description:
      'Automatically assign risk scores to transactions using configurable rule-based algorithms tailored for Kenyan SACCOs.',
  },
  {
    icon: Brain,
    title: 'Behavioral Pattern Analysis',
    description:
      'Detect unusual member activity by analyzing spending patterns, frequency anomalies, and deviation from historical behaviour.',
  },
  {
    icon: FileSearch,
    title: 'Secure Audit Trail',
    description:
      'Maintain tamper-proof logs of every action, transaction, and system event for full regulatory compliance and accountability.',
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="relative bg-[#020a18] py-24 sm:py-32">
      {/* Subtle top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 sm:mb-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400 mb-3">
            Features
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Everything you need to{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-500 bg-clip-text text-transparent">
              detect fraud
            </span>
          </h2>
          <p className="mt-5 text-lg text-slate-400 leading-relaxed">
            Purpose-built tools for SACCO and Chama financial security, from
            transaction monitoring to behavioural intelligence.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 transition-all duration-300 hover:bg-white/[0.04] hover:border-cyan-400/20 hover:shadow-xl hover:shadow-cyan-500/[0.03] cyber-card-glow"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Icon */}
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-400/20 group-hover:bg-cyan-500/15 transition-colors">
                <feature.icon className="h-6 w-6 text-cyan-400" />
              </div>

              {/* Content */}
              <h3 className="text-base font-semibold text-white mb-2.5">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-400">
                {feature.description}
              </p>

              {/* Hover corner accent */}
              <div className="absolute top-0 right-0 h-16 w-16 rounded-tr-2xl bg-gradient-to-bl from-cyan-500/[0.06] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
