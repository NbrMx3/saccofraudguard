import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import AdminDashboard from "./AdminDashboard";
import OfficerDashboard from "./OfficerDashboard";
import AuditorDashboard from "./AuditorDashboard";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a1628]">
        <Loader2 className="h-10 w-10 text-sky-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  switch (user.role) {
    case "ADMIN":
      return <AdminDashboard />;
    case "OFFICER":
      return <OfficerDashboard />;
    case "AUDITOR":
      return <AuditorDashboard />;
    default:
      return <AdminDashboard />;
  }
}
