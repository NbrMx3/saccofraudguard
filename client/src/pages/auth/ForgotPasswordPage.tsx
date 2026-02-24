import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { Shield, Mail, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import CyberBackground from "@/components/ui/CyberBackground";
import FloatingIcons from "@/components/ui/FloatingIcons";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [nationalId, setNationalId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const msg = await forgotPassword(nationalId, email);
      toast.success(msg);
      setSent(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a1628] px-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#06101f] via-[#0b1d3a] to-[#0a1628]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-sky-500/[0.05] rounded-full blur-[100px]" />
      </div>

      <CyberBackground particleCount={35} connectionDistance={120} color={[56, 189, 248]} opacity={0.4} />
      <FloatingIcons />

      <div className="relative w-full max-w-md z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-400/20">
              <Shield className="h-5 w-5 text-sky-400" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Sacco<span className="text-sky-400">FraudGuard</span>
            </span>
          </Link>
          <p className="mt-3 text-sm text-slate-400">
            Reset your password
          </p>
        </div>

        <div className="rounded-2xl border border-sky-400/10 bg-[#0d1f3c]/80 p-8 backdrop-blur-xl shadow-2xl shadow-sky-500/5">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-500/10 border border-sky-400/20">
                <Mail className="h-7 w-7 text-sky-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Check your email</h3>
              <p className="text-sm text-slate-400">
                If an account with that User ID and email exists, we've sent a password reset link.
                Please check your inbox and spam folder.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 transition-colors font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm text-slate-400 mb-2">
                Enter your User ID and the email address associated with your account. We'll send you a reset link.
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  User ID
                </label>
                <input
                  type="text"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="Enter your User ID"
                  required
                  className="w-full rounded-xl border border-sky-400/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full rounded-xl border border-sky-400/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-all hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                {loading ? "Sending..." : "Send Reset Link"}
              </button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 transition-colors font-medium"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
