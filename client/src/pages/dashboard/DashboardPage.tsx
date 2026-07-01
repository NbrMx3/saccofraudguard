import { useAuth } from "@/context/AuthContext";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const AdminDashboard = lazy(() => import("./AdminDashboard"));
const OfficerDashboard = lazy(() => import("./OfficerDashboard"));
const AuditorDashboard = lazy(() => import("./AuditorDashboard"));

function DashboardLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a1628]">
      <Loader2 className="h-10 w-10 text-sky-500 animate-spin" />
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <DashboardLoader />;
  }

  if (!user) return null;

  const Dashboard =
    user.role === "OFFICER"
      ? OfficerDashboard
      : user.role === "AUDITOR"
        ? AuditorDashboard
        : AdminDashboard;

  return (
    <Suspense fallback={<DashboardLoader />}>
      <Dashboard />
    </Suspense>
  );
}
