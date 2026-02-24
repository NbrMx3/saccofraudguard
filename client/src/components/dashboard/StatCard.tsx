import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor: string;
}

export default function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor,
}: StatCardProps) {
  const changeColors = {
    positive: "text-sky-400",
    negative: "text-red-400",
    neutral: "text-slate-400",
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-slate-900/50 p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-white">{value}</p>
          {change && (
            <p className={`mt-1 text-xs font-medium ${changeColors[changeType]}`}>
              {change}
            </p>
          )}
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconColor}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
