import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu, X, Shield, Download } from 'lucide-react'
import { usePWAInstall } from '@/hooks/usePWAInstall'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Dashboard', href: '#dashboard' },
  { label: 'Why Us', href: '#why-us' },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { isInstallable, install } = usePWAInstall()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#020a18]/95 backdrop-blur-md shadow-lg shadow-black/20 border-b border-cyan-400/5'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between md:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-400/20 group-hover:bg-cyan-500/20 transition-colors">
              <Shield className="h-5 w-5 text-cyan-400" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              Sacco<span className="text-cyan-400">FraudGuard</span>
            </span>
          </a>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white hover:bg-white/5"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 md:flex">
            {isInstallable && (
              <button
                onClick={install}
                className="flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-400 transition-all hover:bg-cyan-500/20 hover:border-cyan-400/50 active:scale-[0.98]"
              >
                <Download className="h-4 w-4" />
                Install App
              </button>
            )}
            <Link
              to="/login"
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              Admin Login
            </Link>
            <Link
              to="/signup"
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:from-cyan-400 hover:to-teal-500 hover:shadow-cyan-500/40 active:scale-[0.98]"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-lg p-2 text-slate-300 transition-colors hover:text-white hover:bg-white/5 md:hidden"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`overflow-hidden transition-all duration-300 md:hidden ${
          isOpen ? 'max-h-96 border-t border-white/5' : 'max-h-0'
        }`}
      >
        <div className="bg-slate-950/98 backdrop-blur-xl px-4 py-4 space-y-1">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:text-white hover:bg-white/5"
            >
              {link.label}
            </a>
          ))}
          {isInstallable && (
            <button
              onClick={() => { install(); setIsOpen(false); }}
              className="flex items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-400 transition-all hover:bg-cyan-500/20 mt-2"
            >
              <Download className="h-4 w-4" />
              Install App
            </button>
          )}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5 mt-3">
            <Link
              to="/login"
              className="rounded-xl border border-white/10 px-4 py-2.5 text-center text-sm font-medium text-slate-300 hover:text-white hover:border-white/20 transition-colors"
            >
              Admin Login
            </Link>
            <Link
              to="/signup"
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-teal-500 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
