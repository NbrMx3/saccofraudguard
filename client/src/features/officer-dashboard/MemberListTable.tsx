import { useEffect, useState, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  MoreHorizontal,
  Eye,
  ShieldOff,
  UserX,
  UserCheck,
  Trash2,
  Flag,
  Wallet,
  Landmark,
} from "lucide-react";
import {
  fetchMembers,
  updateMemberStatus,
  deleteMember,
  type Member,
  type PaginationMeta,
} from "@/services/memberService";
import { toast } from "sonner";

interface MemberListTableProps {
  refreshKey: number;
  onViewMember: (member: Member) => void;
  onViewSavings: (member: Member) => void;
  onViewLoans: (member: Member) => void;
}

type StatusFilter = "" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "FLAGGED";

export default function MemberListTable({
  refreshKey,
  onViewMember,
  onViewSavings,
  onViewLoans,
}: MemberListTableProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [loading, setLoading] = useState(true);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadMembers = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const data = await fetchMembers(page, search, statusFilter || undefined);
        setMembers(data.members);
        setPagination(data.pagination);
      } catch (err) {
        console.error("Failed to load members:", err);
        toast.error("Failed to load members");
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter]
  );

  useEffect(() => {
    loadMembers(1);
  }, [loadMembers, refreshKey]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadMembers(1);
  }

  async function handleStatusChange(
    member: Member,
    newStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "FLAGGED"
  ) {
    setActionLoading(member.id);
    setActionMenuId(null);
    try {
      await updateMemberStatus(member.id, newStatus);
      toast.success(`${member.fullName} marked as ${newStatus.toLowerCase()}`);
      loadMembers(pagination.page);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error ?? "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(member: Member) {
    if (!confirm(`Delete member ${member.fullName}? This cannot be undone.`)) return;
    setActionLoading(member.id);
    setActionMenuId(null);
    try {
      await deleteMember(member.id);
      toast.success(`${member.fullName} deleted`);
      loadMembers(pagination.page);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error ?? "Failed to delete member");
    } finally {
      setActionLoading(null);
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-400">
            <CheckCircle className="h-3 w-3" />
            Active
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400">
            <XCircle className="h-3 w-3" />
            Suspended
          </span>
        );
      case "INACTIVE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            Inactive
          </span>
        );
      case "FLAGGED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-400">
            <Flag className="h-3 w-3" />
            Flagged
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-slate-900/50 p-6 backdrop-blur-sm">
      {/* Header with search & filter */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-white">Member Accounts</h3>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 outline-none transition-colors focus:border-sky-400/50"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="FLAGGED">Flagged</option>
          </select>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, email…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 outline-none transition-colors focus:border-sky-400/50 sm:w-64"
            />
          </form>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center text-slate-500">
          <UserX className="mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">No members found</p>
          <p className="text-xs">
            {search || statusFilter
              ? "Try adjusting your search or filter"
              : "Add your first member to get started"}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Member ID", "Name", "Email", "Phone", "Status", "Joined", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {members.map((m) => (
                  <tr key={m.id} className="group text-sm">
                    <td className="py-3 font-mono text-xs text-slate-300">
                      {m.memberId}
                    </td>
                    <td className="py-3 text-white">{m.fullName}</td>
                    <td className="py-3 text-slate-400 text-xs">{m.email}</td>
                    <td className="py-3 text-slate-400 text-xs">{m.phoneNumber}</td>
                    <td className="py-3">{statusBadge(m.status)}</td>
                    <td className="py-3 text-xs text-slate-400">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <div className="relative">
                        {actionLoading === m.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        ) : (
                          <button
                            onClick={() =>
                              setActionMenuId(actionMenuId === m.id ? null : m.id)
                            }
                            className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        )}

                        {actionMenuId === m.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActionMenuId(null)}
                            />
                            <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-white/10 bg-slate-800 py-1 shadow-xl">
                              <button
                                onClick={() => {
                                  setActionMenuId(null);
                                  onViewMember(m);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View Details
                              </button>

                              {m.status !== "ACTIVE" && (
                                <button
                                  onClick={() => handleStatusChange(m, "ACTIVE")}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-sky-400 hover:bg-white/5"
                                >
                                  <UserCheck className="h-3.5 w-3.5" />
                                  Set Active
                                </button>
                              )}

                              {m.status !== "INACTIVE" && (
                                <button
                                  onClick={() => handleStatusChange(m, "INACTIVE")}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-amber-400 hover:bg-white/5"
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                  Set Inactive
                                </button>
                              )}

                              {m.status !== "SUSPENDED" && (
                                <button
                                  onClick={() => handleStatusChange(m, "SUSPENDED")}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-white/5"
                                >
                                  <ShieldOff className="h-3.5 w-3.5" />
                                  Suspend
                                </button>
                              )}

                              {m.status !== "FLAGGED" && (
                                <button
                                  onClick={() => handleStatusChange(m, "FLAGGED")}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-orange-400 hover:bg-white/5"
                                >
                                  <Flag className="h-3.5 w-3.5" />
                                  Flag Member
                                </button>
                              )}

                              <div className="my-1 border-t border-white/[0.06]" />

                              <button
                                onClick={() => {
                                  setActionMenuId(null);
                                  onViewSavings(m);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-emerald-400 hover:bg-white/5"
                              >
                                <Wallet className="h-3.5 w-3.5" />
                                Savings History
                              </button>

                              <button
                                onClick={() => {
                                  setActionMenuId(null);
                                  onViewLoans(m);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-violet-400 hover:bg-white/5"
                              >
                                <Landmark className="h-3.5 w-3.5" />
                                Loan History
                              </button>

                              <div className="my-1 border-t border-white/[0.06]" />

                              <button
                                onClick={() => handleDelete(m)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-white/5"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete Member
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
              <p className="text-xs text-slate-500">
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total}{" "}
                total members)
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => loadMembers(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 transition-colors hover:text-white disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => loadMembers(pageNum)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                        pageNum === pagination.page
                          ? "bg-sky-500/10 text-sky-400 border border-sky-400/20"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => loadMembers(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 transition-colors hover:text-white disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
