import {
  X,
  Mail,
  Phone,
  Calendar,
  Hash,
  UserCheck,
  UserX,
  ShieldOff,
  Loader2,
} from "lucide-react";
import { updateMemberStatus, type Member } from "@/services/memberService";
import { toast } from "sonner";
import { useState } from "react";

interface MemberDetailModalProps {
  member: Member;
  onClose: () => void;
  onUpdated: () => void;
}

export default function MemberDetailModal({
  member,
  onClose,
  onUpdated,
}: MemberDetailModalProps) {
  const [loading, setLoading] = useState(false);

  async function handleStatusChange(newStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED") {
    setLoading(true);
    try {
      await updateMemberStatus(member.id, newStatus);
      toast.success(`${member.fullName} marked as ${newStatus.toLowerCase()}`);
      onUpdated();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error ?? "Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    INACTIVE: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    SUSPENDED: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.06] bg-[#0d1a30] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{member.fullName}</h2>
            <p className="mt-0.5 font-mono text-xs text-slate-500">{member.memberId}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status badge */}
        <div className="mb-6">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusColors[member.status]}`}
          >
            {member.status === "ACTIVE" && <UserCheck className="h-3.5 w-3.5" />}
            {member.status === "INACTIVE" && <UserX className="h-3.5 w-3.5" />}
            {member.status === "SUSPENDED" && <ShieldOff className="h-3.5 w-3.5" />}
            {member.status}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
            <Mail className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Email</p>
              <p className="text-sm text-white">{member.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
            <Phone className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Phone</p>
              <p className="text-sm text-white">{member.phoneNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
            <Hash className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Member ID</p>
              <p className="text-sm font-mono text-white">{member.memberId}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
            <Calendar className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Joined</p>
              <p className="text-sm text-white">
                {new Date(member.createdAt).toLocaleDateString("en-KE", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Status Actions */}
        <div className="mt-6 border-t border-white/[0.06] pt-5">
          <p className="mb-3 text-xs font-medium text-slate-400">Change Status</p>
          <div className="flex gap-2">
            {member.status !== "ACTIVE" && (
              <button
                onClick={() => handleStatusChange("ACTIVE")}
                disabled={loading}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-400 transition-colors hover:bg-sky-500/20 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5" />
                )}
                Activate
              </button>
            )}

            {member.status !== "INACTIVE" && (
              <button
                onClick={() => handleStatusChange("INACTIVE")}
                disabled={loading}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserX className="h-3.5 w-3.5" />
                )}
                Deactivate
              </button>
            )}

            {member.status !== "SUSPENDED" && (
              <button
                onClick={() => handleStatusChange("SUSPENDED")}
                disabled={loading}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldOff className="h-3.5 w-3.5" />
                )}
                Suspend
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
