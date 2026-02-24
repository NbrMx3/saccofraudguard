import { FileText, Cpu, BellRing, ArrowRight } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: FileText,
    title: 'Record Transaction',
    description:
      'Members or clerks record daily transactions — deposits, withdrawals, and loan disbursements — through the secure portal.',
  },
  {
    number: '02',
    icon: Cpu,
    title: 'Risk Evaluation',
    description:
      'The engine instantly evaluates each transaction against behavioural baselines, thresholds, and pattern-matching rules.',
  },
  {
    number: '03',
    icon: BellRing,
    title: 'Alert & Review',
    description:
      'Flagged transactions are surfaced to compliance officers with risk scores, context, and recommended actions.',
  },
]

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative bg-[#081426]/50 py-24 sm:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-transparent to-[#0a1628]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 sm:mb-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-sky-400 mb-3">
            How It Works
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Three steps to{' '}
            <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
              secure operations
            </span>
          </h2>
          <p className="mt-5 text-lg text-slate-400 leading-relaxed">
            From transaction input to actionable alerts — a streamlined workflow
            designed for SACCO compliance teams.
          </p>
        </div>

        {/* Steps */}
        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              {/* Connector line (desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden md:flex absolute top-14 -right-4 lg:-right-4 z-10 items-center justify-center w-8 h-8">
                  <ArrowRight className="h-5 w-5 text-sky-500/30" />
                </div>
              )}
              <div className="group rounded-2xl border border-white/[0.06] bg-[#0a1628]/60 p-8 backdrop-blur-sm transition-all duration-300 hover:border-sky-400/20 hover:bg-[#0a1628]/80 h-full">
                {/* Step number */}
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-4xl font-black text-sky-500/20 group-hover:text-sky-500/30 transition-colors">
                    {step.number}
                  </span>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-400/20 group-hover:bg-sky-500/15 transition-colors">
                    <step.icon className="h-6 w-6 text-sky-400" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-400">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
