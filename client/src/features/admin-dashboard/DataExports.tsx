import { useState } from "react";
import { exportData } from "@/services/adminService";
import { Database, Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

const entities = [
  { key: "users", label: "Users", description: "All system users with roles and status", icon: "👥" },
  { key: "members", label: "Members", description: "SACCO members with balances and status", icon: "🏦" },
  { key: "transactions", label: "Transactions", description: "All transaction records with references", icon: "💰" },
  { key: "fraud-alerts", label: "Fraud Alerts", description: "Fraud detection alerts and resolutions", icon: "🚨" },
  { key: "audit-logs", label: "Audit Logs", description: "System audit trail", icon: "📋" },
  { key: "loans", label: "Loans", description: "Loan records with repayment data", icon: "📊" },
];

export default function DataExports() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ entity: string; data: unknown[]; count: number } | null>(null);

  const handleExport = async (entity: string, format: "json" | "csv") => {
    setDownloading(`${entity}-${format}`);
    try {
      if (format === "csv") {
        await exportData(entity, "csv");
        toast.success(`${entity} exported as CSV`);
      } else {
        const result = await exportData(entity, "json");
        // Download as JSON file
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${entity}-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`${entity} exported as JSON (${result.count} records)`);
      }
    } catch {
      toast.error(`Failed to export ${entity}`);
    } finally {
      setDownloading(null);
    }
  };

  const handlePreview = async (entity: string) => {
    try {
      const result = await exportData(entity, "json");
      setPreviewData({ entity, data: result.data.slice(0, 5), count: result.count });
    } catch {
      toast.error("Failed to preview data");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {entities.map((e) => (
          <div key={e.key} className="rounded-2xl border border-border bg-card p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{e.icon}</span>
              <div>
                <h4 className="text-sm font-semibold text-foreground">{e.label}</h4>
                <p className="text-xs text-muted-foreground">{e.description}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-auto pt-3">
              <button
                disabled={downloading !== null}
                onClick={() => handleExport(e.key, "json")}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                {downloading === `${e.key}-json` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileJson className="h-3.5 w-3.5" />}
                JSON
              </button>
              <button
                disabled={downloading !== null}
                onClick={() => handleExport(e.key, "csv")}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                {downloading === `${e.key}-csv` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                CSV
              </button>
              <button
                onClick={() => handlePreview(e.key)}
                className="inline-flex items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs font-medium text-sky-500 dark:text-sky-400 hover:bg-sky-500/10 transition-colors"
              >
                Preview
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview */}
      {previewData && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Database className="h-4 w-4 text-sky-500 dark:text-sky-400" />
              Preview: {previewData.entity} ({previewData.count} total records, showing first 5)
            </h3>
            <button
              onClick={() => setPreviewData(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          <div className="overflow-x-auto">
            <pre className="text-xs text-foreground bg-background rounded-xl p-4 border border-border overflow-x-auto">
              {JSON.stringify(previewData.data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
