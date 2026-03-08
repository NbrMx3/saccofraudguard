import {
  Zap,
  Globe,
  Puzzle,
  Settings,
} from 'lucide-react'

const features = [
  {
    icon: Zap,
    title: 'Real-Time',
    description:
      'Transactions are evaluated before they are completed, detecting fraudulent activity in real time without degrading system performance.',
  },
  {
    icon: Globe,
    title: 'API-Driven',
    description:
      'Standardised messages are submitted to a dedicated fraud-detection API, delivering fraud screening as-a-Service for any SACCO integration.',
  },
  {
    icon: Puzzle,
    title: 'Rules-Based',
    description:
      'Discrete rule modules each perform a single evaluation task, delivering clear and explainable assessments for every transaction behaviour.',
  },
  {
    icon: Settings,
    title: 'Configurable',
    description:
      'Detection behaviour is defined through configuration managed by administrators, changeable through the dashboard without touching code.',
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="relative bg-[#020a18] py-24 sm:py-32">
      {/* Subtle top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-cyan-400/10 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 sm:mb-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400 mb-3">
            Features
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Everything you need to{' '}
            <span className="bg-linear-to-r from-cyan-400 via-teal-300 to-cyan-500 bg-clip-text text-transparent">
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
              className="group relative rounded-2xl border border-white/6 bg-white/2 p-7 transition-all duration-300 hover:bg-white/4 hover:border-cyan-400/20 hover:shadow-xl hover:shadow-cyan-500/3 cyber-card-glow"
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
              <div className="absolute top-0 right-0 h-16 w-16 rounded-tr-2xl bg-linear-to-bl from-cyan-500/6 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
