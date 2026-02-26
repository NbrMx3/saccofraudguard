import { useState } from "react";
import { exportData } from "@/services/auditorService";
import { Download, FileSpreadsheet, Loader2, AlertTriangle, History, FileText, ClipboardCheck, Users } from "lucide-react";
import { toast } from "sonner";

const EXPORT_OPTIONS = [
  { entity: "audit-reviews", label: "Audit Reviews", description: "All audit review records with findings and status", icon: FileText },
  { entity: "fraud-alerts", label: "Fraud Alerts", description: "All fraud alert records with member and transaction details", icon: AlertTriangle },
  { entity: "transactions", label: "Transactions", description: "All transaction records (up to 5,000)", icon: FileSpreadsheet },
  { entity: "investigations", label: "Investigations", description: "Case investigation records with assignments", icon: ClipboardCheck },
  { entity: "audit-trail", label: "Audit Trail", description: "System activity logs (up to 5,000)", icon: History },
  { entity: "compliance-reports", label: "Compliance Reports", description: "Generated compliance reports", icon: FileText },
  { entity: "members", label: "Members", description: "All member records with status and balance", icon: Users },
];

export default function ExportDataPage() {
  const [loadingEntity, setLoadingEntity] = useState<string | null>(null);

  const handleExport = async (entity: string) => {
    setLoadingEntity(entity);
    try {
      await exportData(entity);
      toast.success(`${entity.replace("-", " ")} exported successfully`);
    } catch {
      toast.error(`Failed to export ${entity}`);
    } finally {
      setLoadingEntity(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Export Data</h2>
        <p className="text-sm text-muted-foreground">Download system data as CSV files for external analysis and reporting</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXPORT_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isLoading = loadingEntity === opt.entity;
          return (
            <div key={opt.entity} className="rounded-2xl border border-border bg-card p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{opt.label}</h3>
              </div>
              <p className="text-xs text-muted-foreground flex-1 mb-4">{opt.description}</p>
              <button
                onClick={() => handleExport(opt.entity)}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isLoading ? "Exporting..." : "Download CSV"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-2">Export Notes</h3>
        <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>Files are exported in CSV (comma-separated values) format compatible with Excel, Google Sheets, and other tools.</li>
          <li>Large datasets (transactions, audit trail) are limited to 5,000 rows per export.</li>
          <li>All exports are logged in the audit trail for compliance tracking.</li>
          <li>Data is exported as-is from the database. Sensitive fields are not redacted.</li>
        </ul>
      </div>
    </div>
  );
}
