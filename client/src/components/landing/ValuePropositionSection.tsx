import { Settings2, CreditCard, Lock, ShieldCheck } from 'lucide-react'

const propositions = [
  {
    icon: Settings2,
    text: 'State-of-the-art software that prevents infection from fraud and scams.',
  },
  {
    icon: CreditCard,
    text: 'Creates a safer, more inclusive financial ecosystem.',
  },
  {
    icon: Lock,
    text: 'Provides a scalable and cost-effective choice when it comes to real-time transaction monitoring.',
  },
  {
    icon: ShieldCheck,
    text: 'Executes transactions safely and expediently with reduced risk.',
  },
]

export default function ValuePropositionSection() {
  return (
    <section className="relative bg-gradient-to-b from-teal-50 to-emerald-50 dark:from-[#071a1a] dark:to-[#0a1f18] py-20 sm:py-28">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-400/20 to-transparent" />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {propositions.map((item, index) => (
            <div
              key={index}
              className="group flex items-start gap-5 rounded-2xl border border-teal-200/60 dark:border-teal-400/10 bg-white/70 dark:bg-white/3 backdrop-blur-sm px-6 py-5 transition-all duration-300 hover:border-teal-400/40 dark:hover:border-teal-400/25 hover:shadow-lg hover:shadow-teal-500/5"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-500/10 border border-teal-300/60 dark:border-teal-400/20 group-hover:bg-teal-200 dark:group-hover:bg-teal-500/15 transition-colors">
                <item.icon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              </div>
              <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300 pt-1">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
