import { useState, useEffect } from "react";
import { fetchSystemConfig, updateSystemConfig } from "@/services/adminService";
import { Settings, Save } from "lucide-react";
import { toast } from "sonner";

interface Config {
  id: string;
  key: string;
  value: string;
  label: string;
  group: string;
}

// Default configs to seed if none exist
const defaultConfigs = [
  { key: "max_daily_transaction_limit", value: "1000000", label: "Max Daily Transaction Limit (KES)", group: "transactions" },
  { key: "large_deposit_threshold", value: "500000", label: "Large Deposit Threshold (KES)", group: "fraud" },
  { key: "large_withdrawal_threshold", value: "200000", label: "Large Withdrawal Threshold (KES)", group: "fraud" },
  { key: "rapid_transaction_window_minutes", value: "60", label: "Rapid Transaction Window (minutes)", group: "fraud" },
  { key: "rapid_transaction_count", value: "5", label: "Rapid Transaction Count", group: "fraud" },
  { key: "max_loan_amount", value: "5000000", label: "Max Loan Amount (KES)", group: "loans" },
  { key: "default_interest_rate", value: "12", label: "Default Interest Rate (%)", group: "loans" },
  { key: "session_timeout_minutes", value: "30", label: "Session Timeout (minutes)", group: "security" },
  { key: "password_min_length", value: "8", label: "Minimum Password Length", group: "security" },
  { key: "maintenance_mode", value: "false", label: "Maintenance Mode", group: "general" },
];

export default function SystemConfiguration() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchSystemConfig();
        if (data.configs.length === 0) {
          // Seed defaults
          await updateSystemConfig(defaultConfigs.map(c => ({ key: c.key, value: c.value })));
          const fresh = await fetchSystemConfig();
          setConfigs(fresh.configs.length > 0 ? fresh.configs : defaultConfigs.map((c, i) => ({ ...c, id: String(i) })));
        } else {
          setConfigs(data.configs);
        }
      } catch {
        // Use defaults for display
        setConfigs(defaultConfigs.map((c, i) => ({ ...c, id: String(i) })));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasChanges = Object.keys(editedValues).length > 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(editedValues).map(([key, value]) => ({ key, value }));
      await updateSystemConfig(updates);
      toast.success("Configuration saved");
      setEditedValues({});
      // Refresh
      const data = await fetchSystemConfig();
      setConfigs(data.configs);
    } catch {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  // Group configs
  const groups: Record<string, Config[]> = {};
  for (const cfg of configs) {
    const g = cfg.group || "general";
    if (!groups[g]) groups[g] = [];
    groups[g].push(cfg);
  }

  const groupLabels: Record<string, string> = {
    general: "General",
    transactions: "Transactions",
    fraud: "Fraud Detection",
    loans: "Loans",
    security: "Security",
  };

  if (loading) return <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">Loading configuration...</div>;

  return (
    <div className="space-y-6">
      {hasChanges && (
        <div className="flex items-center justify-between rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
          <p className="text-sm text-sky-500 dark:text-sky-400">You have unsaved changes</p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {Object.entries(groups).map(([group, cfgs]) => (
        <div key={group} className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Settings className="h-4 w-4 text-sky-500 dark:text-sky-400" />
            {groupLabels[group] || group}
          </h3>
          <div className="space-y-3">
            {cfgs.map((cfg) => {
              const currentValue = editedValues[cfg.key] ?? cfg.value;
              const isBoolean = cfg.value === "true" || cfg.value === "false";
              return (
                <div key={cfg.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="flex-1 text-sm text-muted-foreground">{cfg.label}</label>
                  {isBoolean ? (
                    <button
                      onClick={() => {
                        const newVal = currentValue === "true" ? "false" : "true";
                        setEditedValues({ ...editedValues, [cfg.key]: newVal });
                      }}
                      className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                        currentValue === "true"
                          ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-500/10 text-slate-400 border border-border"
                      }`}
                    >
                      {currentValue === "true" ? "Enabled" : "Disabled"}
                    </button>
                  ) : (
                    <input
                      type="text"
                      value={currentValue}
                      onChange={(e) => setEditedValues({ ...editedValues, [cfg.key]: e.target.value })}
                      className="w-full sm:w-48 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground text-right focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
