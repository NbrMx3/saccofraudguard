import { Lock, UserCheck, Eye, MapPin } from 'lucide-react'

const reasons = [
  {
    icon: Lock,
    title: 'Role-Based Security',
    description:
      'Granular access controls ensure that only authorised personnel view and manage sensitive financial data.',
  },
  {
    icon: UserCheck,
    title: 'Secure Authentication',
    description:
      'Industry-standard authentication protocols protect user accounts with encrypted credentials and session management.',
  },
  {
    icon: Eye,
    title: 'Transparent Governance',
    description:
      'Every action is logged and auditable, promoting accountability and trust within your cooperative structure.',
  },
  {
    icon: MapPin,
    title: 'Kenyan SACCO Focus',
    description:
      'Built specifically for the regulatory, cultural, and operational realities of SACCOs and Chamas in Kenya.',
  },
]

export default function WhyChooseUsSection() {
  return (
    <section id="why-us" className="relative bg-[#020a18] py-24 sm:py-32">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-20 items-center">
          {/* Left Content */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400 mb-3">
              Why Choose Us
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Built for{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-500 bg-clip-text text-transparent">
                trust & security
              </span>
            </h2>
            <p className="mt-5 text-lg text-slate-400 leading-relaxed max-w-lg">
              SaccoFraudGuard is designed with the highest security standards to
              protect your financial cooperative from internal and external
              threats.
            </p>

            {/* Trust stats */}
            <div className="mt-10 grid grid-cols-3 gap-6">
              {[
                { value: '99.9%', label: 'Uptime' },
                { value: '< 200ms', label: 'Detection Speed' },
                { value: '24/7', label: 'Monitoring' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right – Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {reasons.map((reason) => (
              <div
                key={reason.title}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-cyan-400/20 hover:bg-white/[0.04]"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-400/20 group-hover:bg-cyan-500/15 transition-colors">
                  <reason.icon className="h-5 w-5 text-cyan-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">
                  {reason.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-400">
                  {reason.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
