import { Shield, Github, Mail, ExternalLink } from 'lucide-react'

const footerLinks = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Dashboard', href: '#dashboard' },
      { label: 'Security', href: '#why-us' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '#' },
      { label: 'API Reference', href: '#' },
      { label: 'Status Page', href: '#' },
      { label: 'Changelog', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Data Processing', href: '#' },
      { label: 'Cookie Policy', href: '#' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="relative bg-[#010812] border-t border-cyan-400/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-5 lg:gap-8">
          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-2">
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-400/20">
                <Shield className="h-5 w-5 text-cyan-400" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Sacco<span className="text-cyan-400">FraudGuard</span>
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              An intelligent transaction monitoring and fraud risk detection
              platform built specifically for SACCOs and Chamas in Kenya.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://github.com/NbrMx3/saccofraudguard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                aria-label="GitHub"
              >
                <Github className="h-4.5 w-4.5" />
              </a>
              <a
                href="mailto:contact@saccofraudguard.co.ke"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                aria-label="Email"
              >
                <Mail className="h-4.5 w-4.5" />
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                aria-label="Website"
              >
                <ExternalLink className="h-4.5 w-4.5" />
              </a>
            </div>
          </div>

          {/* Link Columns */}
          {footerLinks.map((column) => (
            <div key={column.title}>
              <p className="text-sm font-semibold text-white mb-4">
                {column.title}
              </p>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 py-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} SaccoFraudGuard. All rights reserved.
          </p>
          <p className="text-xs text-slate-600">
            Built with care for Kenyan cooperatives
          </p>
        </div>
      </div>
    </footer>
  )
}
