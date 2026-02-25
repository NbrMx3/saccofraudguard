import { useEffect, useState } from "react";
import { Users, UserX, ShieldOff } from "lucide-react";
import { fetchMemberStats, type MemberStats } from "@/services/memberService";

export default function MemberStatsCards() {
  const [stats, setStats] = useState<MemberStats>({ active: 0, inactive: 0, suspended: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchMemberStats();
        if (!cancelled) setStats(data);
      } catch (err) {
        console.error("Failed to load member stats:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const cards = [
    {
      label: "Active Members",
      value: stats.active,
      icon: Users,
      colors: "bg-sky-500/10 text-sky-400",
    },
    {
      label: "Inactive Members",
      value: stats.inactive,
      icon: UserX,
      colors: "bg-amber-500/10 text-amber-400",
    },
    {
      label: "Suspended Members",
      value: stats.suspended,
      icon: ShieldOff,
      colors: "bg-red-500/10 text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-2xl border border-white/[0.06] bg-slate-900/50 p-5 backdrop-blur-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {loading ? "—" : card.value}
                </p>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.colors}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
