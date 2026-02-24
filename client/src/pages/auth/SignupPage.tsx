import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { Shield, Eye, EyeOff, UserPlus, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import CyberBackground from "@/components/ui/CyberBackground";
import FloatingIcons from "@/components/ui/FloatingIcons";

const passwordRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  { label: "One special character (@$!%*?&#)", test: (p: string) => /[@$!%*?&#]/.test(p) },
];

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nationalId: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const msg = await signup(form);
      toast.success(msg);
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a1628] px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#06101f] via-[#0b1d3a] to-[#0a1628]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-sky-500/[0.05] rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-blue-500/[0.04] rounded-full blur-[80px]" />
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
            Create your account to get started
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-sky-400/10 bg-[#0d1f3c]/80 p-8 backdrop-blur-xl shadow-2xl shadow-sky-500/5"
        >
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                User ID
              </label>
              <input
                type="text"
                value={form.nationalId}
                onChange={(e) => update("nationalId", e.target.value)}
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
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full rounded-xl border border-sky-400/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="Create a strong password"
                  required
                  className="w-full rounded-xl border border-sky-400/15 bg-white/5 px-4 py-3 pr-12 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Password strength indicators */}
              {form.password && (
                <div className="mt-3 space-y-1.5">
                  {passwordRules.map((rule) => {
                    const pass = rule.test(form.password);
                    return (
                      <div key={rule.label} className="flex items-center gap-2 text-xs">
                        {pass ? (
                          <Check className="h-3 w-3 text-sky-400" />
                        ) : (
                          <X className="h-3 w-3 text-red-400" />
                        )}
                        <span className={pass ? "text-sky-400" : "text-slate-500"}>
                          {rule.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className="w-full rounded-xl border border-sky-400/15 bg-white/5 px-4 py-3 pr-12 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="mt-2 text-xs text-red-400">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-all hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-sky-400 hover:text-sky-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
