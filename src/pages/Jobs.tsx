import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDataStore } from "@/stores/dataStore";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import { formatCurrency, formatDate, getRelativeTime, formatNumber } from "@/utils/format";
import {
  Briefcase, Search, Filter, SortAsc, SortDesc, Plus,
  Eye, Copy, Trash2, MoreHorizontal, Download, Calendar,
  ChevronDown, X
} from "lucide-react";

interface JobEntry {
  id: string;
  jobNumber: string;
  title: string;
  customerName: string;
  status: "draft" | "estimated" | "quoted" | "in_production" | "completed" | "cancelled";
  quantities: number[];
  totalValue: number;
  currency: string;
  binding: string;
  createdAt: string;
  updatedAt: string;
  isMock?: boolean;
}

const MOCK_JOBS: JobEntry[] = [
  { id: "mock-1", jobNumber: "JOB-2507-0001", title: "Oxford English Dictionary 14th Ed", customerName: "Oxford University Press", status: "in_production", quantities: [5000, 10000], totalValue: 2850000, currency: "GBP", binding: "section_sewn_hardcase", createdAt: "2025-07-01T10:30:00Z", updatedAt: "2025-07-10T14:20:00Z", isMock: true },
  { id: "mock-2", jobNumber: "JOB-2507-0002", title: "Cambridge Mathematics Grade 10", customerName: "Cambridge University Press", status: "quoted", quantities: [8000], totalValue: 1420000, currency: "GBP", binding: "perfect_binding", createdAt: "2025-07-03T09:00:00Z", updatedAt: "2025-07-08T11:00:00Z", isMock: true },
  { id: "mock-3", jobNumber: "JOB-2507-0003", title: "Penguin Classics — Wuthering Heights", customerName: "Penguin Random House", status: "estimated", quantities: [3000, 5000, 10000], totalValue: 980000, currency: "USD", binding: "perfect_binding", createdAt: "2025-07-05T15:00:00Z", updatedAt: "2025-07-05T15:00:00Z", isMock: true },
  { id: "mock-4", jobNumber: "JOB-2506-0045", title: "National Geographic World Atlas", customerName: "National Geographic", status: "completed", quantities: [15000], totalValue: 8900000, currency: "USD", binding: "section_sewn_hardcase", createdAt: "2025-06-15T08:00:00Z", updatedAt: "2025-07-01T16:00:00Z", isMock: true },
  { id: "mock-5", jobNumber: "JOB-2507-0004", title: "Harper Collins Children's Collection", customerName: "HarperCollins", status: "draft", quantities: [2000], totalValue: 560000, currency: "GBP", binding: "saddle_stitching", createdAt: "2025-07-10T12:00:00Z", updatedAt: "2025-07-10T12:00:00Z", isMock: true },
  { id: "mock-6", jobNumber: "JOB-2507-0005", title: "Wiley Professional Handbook", customerName: "John Wiley & Sons", status: "cancelled", quantities: [1000], totalValue: 320000, currency: "USD", binding: "wire_o", createdAt: "2025-07-02T07:00:00Z", updatedAt: "2025-07-06T09:30:00Z", isMock: true },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400" },
  estimated: { label: "Estimated", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  quoted: { label: "Quoted", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" },
  in_production: { label: "In Production", color: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
};

export function Jobs() {
  const navigate = useNavigate();
  const { jobs, duplicateJob, deleteJob } = useDataStore();
  const { addNotification, addActivityLog } = useAppStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"createdAt" | "title" | "totalValue">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const allJobEntries: JobEntry[] = useMemo(() => {
    if (jobs.length > 0) {
      return jobs.map((j) => ({
        id: j.id,
        jobNumber: j.jobNumber,
        title: j.title,
        customerName: j.customerName,
        status: j.status,
        quantities: j.quantities,
        totalValue: j.totalValue,
        currency: j.currency,
        binding: "saved",
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
        isMock: false,
      }));
    }
    return MOCK_JOBS;
  }, [jobs]);

  const filtered = useMemo(() => {
    let items = [...allJobEntries];

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.customerName.toLowerCase().includes(q) ||
        j.jobNumber.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      items = items.filter(j => j.status === statusFilter);
    }

    items.sort((a, b) => {
      let cmp = 0;
      if (sortField === "createdAt") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortField === "title") cmp = a.title.localeCompare(b.title);
      else if (sortField === "totalValue") cmp = a.totalValue - b.totalValue;
      return sortDir === "desc" ? -cmp : cmp;
    });

    return items;
  }, [search, statusFilter, sortField, sortDir, allJobEntries]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const handleDuplicate = (job: JobEntry) => {
    if (job.isMock) {
      addNotification({ type: "info", title: "Demo Data", message: "Cannot duplicate demo data. Create a real estimate first.", category: "job" });
      return;
    }
    const dup = duplicateJob(job.id);
    if (dup) {
      addNotification({ type: "success", title: "Job Duplicated", message: `"${dup.title}" created as ${dup.jobNumber}`, category: "job" });
      addActivityLog({ action: "JOB_DUPLICATED", category: "job", description: `Duplicated job: ${job.title} → ${dup.jobNumber}`, user: "Current User", entityType: "job", entityId: dup.id, level: "info" });
    }
  };

  const handleDelete = (job: JobEntry) => {
    if (job.isMock) {
      addNotification({ type: "info", title: "Demo Data", message: "Cannot delete demo data.", category: "job" });
      setShowDeleteConfirm(null);
      return;
    }
    deleteJob(job.id);
    addNotification({ type: "warning", title: "Job Deleted", message: `"${job.title}" has been removed.`, category: "job" });
    addActivityLog({ action: "JOB_DELETED", category: "job", description: `Deleted job: ${job.title} (${job.jobNumber})`, user: "Current User", entityType: "job", entityId: job.id, level: "warning" });
    setShowDeleteConfirm(null);
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
            <Briefcase className="w-6 h-6" /> Jobs
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            {allJobEntries.length} total jobs • {allJobEntries.filter(j => j.status === "in_production").length} in production
          </p>
        </div>
        <button onClick={() => navigate("/estimate/new")} className="btn-primary flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Estimate
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs..."
            className="input-field pl-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-text-light-tertiary" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-lg">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              statusFilter === "all" ? "bg-white dark:bg-surface-dark-secondary shadow-sm text-text-light-primary dark:text-text-dark-primary" : "text-text-light-secondary dark:text-text-dark-secondary"
            )}
          >
            All
          </button>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                statusFilter === key ? "bg-white dark:bg-surface-dark-secondary shadow-sm text-text-light-primary dark:text-text-dark-primary" : "text-text-light-secondary dark:text-text-dark-secondary"
              )}
            >
              {cfg.label}
            </button>
          ))}
        </div>

        <button onClick={() => toggleSort("createdAt")} className="btn-secondary text-xs flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          Date
          {sortField === "createdAt" && (sortDir === "desc" ? <SortDesc className="w-3 h-3" /> : <SortAsc className="w-3 h-3" />)}
        </button>
        <button onClick={() => toggleSort("totalValue")} className="btn-secondary text-xs flex items-center gap-1">
          Value
          {sortField === "totalValue" && (sortDir === "desc" ? <SortDesc className="w-3 h-3" /> : <SortAsc className="w-3 h-3" />)}
        </button>
      </div>

      {/* Jobs List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <Briefcase className="w-12 h-12 text-text-light-tertiary dark:text-text-dark-tertiary mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">No jobs found</h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
              {search ? `No results for "${search}"` : "Create your first estimate to get started."}
            </p>
          </div>
        ) : (
          filtered.map(job => (
            <div
              key={job.id}
              className="card p-4 hover:shadow-elevated-light dark:hover:shadow-elevated-dark transition-shadow cursor-pointer group"
              onClick={() => !job.isMock && navigate(`/estimate/${job.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-text-light-tertiary dark:text-text-dark-tertiary">{job.jobNumber}</span>
                      <span className={cn("badge text-[10px]", STATUS_CONFIG[job.status]?.color)}>{STATUS_CONFIG[job.status]?.label}</span>
                      {job.isMock && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-light-tertiary dark:bg-surface-dark-tertiary text-text-light-tertiary dark:text-text-dark-tertiary">Demo</span>}
                    </div>
                    <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mt-1 truncate">{job.title}</h3>
                    <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
                      {job.customerName} • {job.quantities.map(q => formatNumber(q)).join(", ")} copies • {job.binding.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">
                      {formatCurrency(job.totalValue)}
                    </p>
                    <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">
                      {getRelativeTime(job.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => !job.isMock && navigate(`/estimate/${job.id}`)}
                      className="p-1.5 rounded-lg hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary"
                      title="View"
                    >
                      <Eye className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(job)}
                      className="p-1.5 rounded-lg hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(job.id)}
                      className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-danger-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary text-center">
        Showing {filtered.length} of {allJobEntries.length} jobs
      </p>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative card p-6 w-full max-w-sm animate-scale-in text-center">
            <Trash2 className="w-12 h-12 text-danger-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">Delete Job?</h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-2">
              This will permanently remove this job and all associated data.
            </p>
            <div className="flex justify-center gap-3 mt-5">
              <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => {
                  const job = allJobEntries.find(j => j.id === showDeleteConfirm);
                  if (job) handleDelete(job);
                }}
                className="btn-danger flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
