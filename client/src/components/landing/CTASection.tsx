import { ArrowRight, Shield } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export default function CTASection() {
  return (
    <section className="relative bg-[#0a1628] py-24 sm:py-32 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/10 to-transparent" />

      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-sky-500/[0.06] rounded-full blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-slate-900/80 to-slate-800/40 p-10 sm:p-16 text-center backdrop-blur-sm shadow-2xl">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/10 border border-sky-400/20">
            <Shield className="h-8 w-8 text-sky-400" />
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Protect Your Financial
            <br />
            <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
              Operations Today
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-400 leading-relaxed">
            Join SACCOs across Kenya using intelligent fraud detection to
            safeguard member funds and ensure operational integrity.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/login"
              className="group inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-sky-500/20 transition-all hover:shadow-sky-500/30 hover:from-sky-400 hover:to-blue-500 active:scale-[0.98]"
            >
              Access System
              <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-400/20 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:border-sky-400/40 hover:bg-white/10 active:scale-[0.98]"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
