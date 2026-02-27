import { useState, useMemo } from "react";
import { cn } from "@/utils/cn";
import { useAppStore } from "@/stores/appStore";
import { formatCurrency, formatDate, getRelativeTime } from "@/utils/format";
import {
  FileCheck, Search, Filter, Plus, Eye, Check, X,
  MessageSquare, Download, Clock, AlertCircle, Send,
  ChevronDown, FileText
} from "lucide-react";

interface QuotationEntry {
  id: string;
  quotationNumber: string;
  jobTitle: string;
  customerName: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired" | "revised";
  totalValue: number;
  currency: string;
  validUntil: string;
  revisionNumber: number;
  comments: number;
  createdAt: string;
}

const MOCK_QUOTATIONS: QuotationEntry[] = [
  { id: "1", quotationNumber: "QTN-2507-0001", jobTitle: "Oxford English Dictionary 14th Ed", customerName: "Oxford University Press", status: "sent", totalValue: 2850000, currency: "GBP", validUntil: "2025-07-25", revisionNumber: 1, comments: 2, createdAt: "2025-07-10T10:00:00Z" },
  { id: "2", quotationNumber: "QTN-2507-0002", jobTitle: "Cambridge Mathematics Grade 10", customerName: "Cambridge University Press", status: "accepted", totalValue: 1420000, currency: "GBP", validUntil: "2025-07-20", revisionNumber: 2, comments: 5, createdAt: "2025-07-08T11:00:00Z" },
  { id: "3", quotationNumber: "QTN-2507-0003", jobTitle: "Penguin Classics Collection", customerName: "Penguin Random House", status: "draft", totalValue: 980000, currency: "USD", validUntil: "2025-07-30", revisionNumber: 0, comments: 0, createdAt: "2025-07-12T14:00:00Z" },
  { id: "4", quotationNumber: "QTN-2506-0020", jobTitle: "National Geographic Atlas", customerName: "National Geographic", status: "accepted", totalValue: 8900000, currency: "USD", validUntil: "2025-07-05", revisionNumber: 3, comments: 8, createdAt: "2025-06-20T09:00:00Z" },
  { id: "5", quotationNumber: "QTN-2507-0004", jobTitle: "Wiley Professional Handbook", customerName: "John Wiley & Sons", status: "rejected", totalValue: 320000, currency: "USD", validUntil: "2025-07-15", revisionNumber: 1, comments: 3, createdAt: "2025-07-05T16:00:00Z" },
  { id: "6", quotationNumber: "QTN-2507-0005", jobTitle: "Harper Collins Novel", customerName: "HarperCollins", status: "expired", totalValue: 560000, currency: "GBP", validUntil: "2025-07-01", revisionNumber: 0, comments: 0, createdAt: "2025-06-15T08:00:00Z" },
];

const QTN_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400", icon: <FileText className="w-3.5 h-3.5" /> },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400", icon: <Send className="w-3.5 h-3.5" /> },
  accepted: { label: "Accepted", color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400", icon: <Check className="w-3.5 h-3.5" /> },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400", icon: <X className="w-3.5 h-3.5" /> },
  expired: { label: "Expired", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400", icon: <Clock className="w-3.5 h-3.5" /> },
  revised: { label: "Revised", color: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400", icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

export function Quotations() {
  const { addNotification } = useAppStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedQtn, setSelectedQtn] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  const filtered = useMemo(() => {
    let items = [...MOCK_QUOTATIONS];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(qt => qt.jobTitle.toLowerCase().includes(q) || qt.customerName.toLowerCase().includes(q) || qt.quotationNumber.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") items = items.filter(qt => qt.status === statusFilter);
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [search, statusFilter]);

  const handleStatusChange = (id: string, newStatus: string) => {
    addNotification({
      type: "success",
      title: "Quotation Updated",
      message: `Quotation status changed to ${newStatus}`,
      category: "quotation",
    });
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
            <FileCheck className="w-6 h-6" /> Quotations
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            {MOCK_QUOTATIONS.length} total • {MOCK_QUOTATIONS.filter(q => q.status === "sent").length} pending response
          </p>
        </div>
        <button className="btn-secondary flex items-center gap-1.5 text-sm">
          <Download className="w-4 h-4" /> Export All
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light-tertiary" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search quotations..." className="input-field pl-9" />
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-lg">
          {["all", ...Object.keys(QTN_STATUS_CONFIG)].map(key => (
            <button key={key} onClick={() => setStatusFilter(key)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize", statusFilter === key ? "bg-white dark:bg-surface-dark-secondary shadow-sm" : "text-text-light-secondary dark:text-text-dark-secondary")}>
              {key === "all" ? "All" : QTN_STATUS_CONFIG[key]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quotation Cards */}
      <div className="space-y-3">
        {filtered.map(qtn => {
          const cfg = QTN_STATUS_CONFIG[qtn.status];
          const isExpired = new Date(qtn.validUntil) < new Date() && qtn.status !== "accepted" && qtn.status !== "rejected";
          const isSelected = selectedQtn === qtn.id;

          return (
            <div key={qtn.id} className="card overflow-hidden">
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-surface-light-secondary dark:hover:bg-surface-dark-tertiary transition-colors"
                onClick={() => setSelectedQtn(isSelected ? null : qtn.id)}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-text-light-tertiary dark:text-text-dark-tertiary">{qtn.quotationNumber}</span>
                      <span className={cn("badge text-[10px] flex items-center gap-1", cfg?.color)}>
                        {cfg?.icon}
                        {cfg?.label}
                      </span>
                      {qtn.revisionNumber > 0 && (
                        <span className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">Rev.{qtn.revisionNumber}</span>
                      )}
                      {isExpired && <span className="badge-danger text-[10px]">Expired</span>}
                    </div>
                    <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mt-1 truncate">{qtn.jobTitle}</h3>
                    <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">{qtn.customerName} • Valid until {formatDate(qtn.validUntil)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">{formatCurrency(qtn.totalValue)}</p>
                    <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">{getRelativeTime(qtn.createdAt)}</p>
                  </div>
                  {qtn.comments > 0 && (
                    <div className="flex items-center gap-1 text-text-light-tertiary dark:text-text-dark-tertiary">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span className="text-xs">{qtn.comments}</span>
                    </div>
                  )}
                  <ChevronDown className={cn("w-4 h-4 text-text-light-tertiary transition-transform", isSelected && "rotate-180")} />
                </div>
              </div>

              {/* Expanded Actions */}
              {isSelected && (
                <div className="px-4 pb-4 pt-2 border-t border-surface-light-border dark:border-surface-dark-border space-y-4 animate-in">
                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {qtn.status === "draft" && (
                      <>
                        <button onClick={() => handleStatusChange(qtn.id, "sent")} className="btn-primary text-xs flex items-center gap-1">
                          <Send className="w-3.5 h-3.5" /> Mark as Sent
                        </button>
                        <button className="btn-secondary text-xs">Edit</button>
                      </>
                    )}
                    {qtn.status === "sent" && (
                      <>
                        <button onClick={() => handleStatusChange(qtn.id, "accepted")} className="btn-primary text-xs flex items-center gap-1 bg-success-600 hover:bg-success-700">
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button onClick={() => handleStatusChange(qtn.id, "rejected")} className="btn-danger text-xs flex items-center gap-1">
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                        <button className="btn-secondary text-xs">Revise</button>
                      </>
                    )}
                    <button className="btn-secondary text-xs flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </button>
                    <button className="btn-ghost text-xs">View Details</button>
                  </div>

                  {/* Add Comment */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="input-field flex-1 text-sm"
                    />
                    <button
                      onClick={() => {
                        if (commentText.trim()) {
                          addNotification({ type: "info", title: "Comment Added", message: commentText, category: "quotation" });
                          setCommentText("");
                        }
                      }}
                      disabled={!commentText.trim()}
                      className="btn-secondary text-sm disabled:opacity-40"
                    >
                      Post
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}