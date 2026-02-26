import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
  type DocumentMeta,
} from "@/services/officerService";
import {
  Upload,
  FileText,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  File,
  Image,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { toast } from "sonner";

const categoryOptions = [
  { value: "general", label: "General" },
  { value: "evidence", label: "Evidence" },
  { value: "kyc", label: "KYC Documents" },
  { value: "report", label: "Reports" },
  { value: "policy", label: "Policies" },
  { value: "correspondence", label: "Correspondence" },
];

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.includes("spreadsheet") || mimeType.includes("csv") || mimeType.includes("excel")) return FileSpreadsheet;
  if (mimeType.includes("pdf") || mimeType.includes("document")) return FileText;
  return File;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function DocumentUploadPage() {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Upload form
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState("general");
  const [docDescription, setDocDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDocuments({
        page,
        category: category !== "all" ? category : undefined,
      });
      setDocuments(data.documents);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [page, category]);

  useEffect(() => { load(); }, [load]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be under 10 MB");
        return;
      }
      setSelectedFile(file);
      if (!docName) setDocName(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", docName || selectedFile.name);
      formData.append("category", docCategory);
      if (docDescription) formData.append("description", docDescription);

      await uploadDocument(formData);
      toast.success("Document uploaded");
      setShowUpload(false);
      setSelectedFile(null);
      setDocName("");
      setDocDescription("");
      setDocCategory("general");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: DocumentMeta) => {
    try {
      await downloadDocument(doc.id, doc.fileName);
      toast.success("Download started");
    } catch {
      toast.error("Download failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    setDeleting(id);
    try {
      await deleteDocument(id);
      toast.success("Document deleted");
      load();
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Document Upload</h2>
          <p className="text-sm text-muted-foreground">{total} document{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
          >
            <option value="all">All Categories</option>
            {categoryOptions.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
        </div>
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowUpload(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Upload Document</h3>
              <button onClick={() => setShowUpload(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-accent/30 p-8 text-center hover:border-sky-500/50 transition-colors"
              >
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(selectedFile.size)}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground">Click to select a file</p>
                    <p className="text-xs text-muted-foreground mt-1">Max 10 MB</p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.txt"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Document Name</label>
                <input
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="Enter document name"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-sky-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
                  >
                    {categoryOptions.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Description (optional)</label>
                <textarea
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="Brief description..."
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
                />
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading..." : "Upload Document"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FileText className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {documents.map((doc) => {
            const Icon = fileIcon(doc.mimeType);
            return (
              <div
                key={doc.id}
                className="rounded-xl border border-border bg-card p-4 hover:bg-accent/20 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20 shrink-0">
                    <Icon className="h-5 w-5 text-sky-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center rounded-full bg-accent border border-border px-1.5 py-0.5 capitalize">
                        {doc.category}
                      </span>
                      <span>{formatSize(doc.fileSize)}</span>
                    </div>
                    {doc.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{doc.description}</p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      By {doc.uploadedBy.firstName} {doc.uploadedBy.lastName} · {new Date(doc.createdAt).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deleting === doc.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 px-2.5 py-1 text-xs text-red-500 dark:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    {deleting === doc.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
