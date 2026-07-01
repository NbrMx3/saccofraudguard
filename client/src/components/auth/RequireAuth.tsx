import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldX } from "lucide-react";
import { useAuth, type User } from "@/context/AuthContext";

interface RequireAuthProps {
  children: ReactNode;
  allowedRoles?: readonly User["role"][];
}

function AuthLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a1628]">
      <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
    </div>
  );
}

function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a1628] px-4">
      <div className="w-full max-w-sm rounded-xl border border-red-400/20 bg-[#0d1f3c]/90 p-6 text-center shadow-2xl shadow-red-500/10">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <ShieldX className="h-6 w-6 text-red-300" />
        </div>
        <h1 className="text-lg font-semibold text-white">Access denied</h1>
        <p className="mt-2 text-sm text-slate-400">
          Your account does not have permission to view this page.
        </p>
        <button
          type="button"
          onClick={() => navigate({ to: "/dashboard" })}
          className="mt-5 w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-400"
        >
          Go to dashboard
        </button>
      </div>
    </div>
  );
}

export default function RequireAuth({
  children,
  allowedRoles,
}: RequireAuthProps) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [isLoading, navigate, user]);

  if (isLoading || !user) {
    return <AuthLoader />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
