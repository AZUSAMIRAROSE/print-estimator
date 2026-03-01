import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDataStore } from "@/stores/dataStore";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import { formatCurrency, getRelativeTime, formatNumber } from "@/utils/format";
import {
  Briefcase, Search, X, Plus, Calendar, SortDesc, SortAsc,
  Download, Eye, Copy, Trash2, LayoutGrid, List, CheckCircle, Clock
} from "lucide-react";
import { saveTextFilePortable } from "@/utils/fileSave";
import { JobDetailsSlider } from "@/components/jobs/JobDetailsSlider";
import type { Job } from "@/types";

interface JobEntry extends Job {
  isMock?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; indicator: string }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", indicator: "bg-gray-400" },
  estimated: { label: "Estimated", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", indicator: "bg-blue-500" },
  quoted: { label: "Quoted", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", indicator: "bg-amber-500" },
  in_production: { label: "In Production", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", indicator: "bg-purple-500" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", indicator: "bg-green-500" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", indicator: "bg-red-500" },
};

export function Jobs() {
  const navigate = useNavigate();
  const { jobs, duplicateJob, deleteJob, updateJob } = useDataStore();
  const { addNotification, addActivityLog } = useAppStore();

  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"createdAt" | "title" | "totalValue">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const allJobEntries: JobEntry[] = useMemo(
    () => jobs.map((job) => ({ ...job, isMock: false })),
    [jobs]
  );

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

    if (statusFilter !== "all") items = items.filter(j => j.status === statusFilter);

    items.sort((a, b) => {
      let cmp = 0;
      if (sortField === "createdAt") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortField === "title") cmp = a.title.localeCompare(b.title);
      else if (sortField === "totalValue") cmp = a.totalValue - b.totalValue;
      return sortDir === "desc" ? -cmp : cmp;
    });

    return items;
  }, [search, statusFilter, sortField, sortDir, allJobEntries]);

  // Metrics Info
  const metrics = useMemo(() => {
    const total = allJobEntries.length;
    const value = allJobEntries.reduce((acc, job) => acc + job.totalValue, 0);
    const inProd = allJobEntries.filter(j => j.status === "in_production").length;
    const completed = allJobEntries.filter(j => j.status === "completed").length;
    return { total, value, inProd, completed };
  }, [allJobEntries]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const handleDuplicate = (e: React.MouseEvent, job: JobEntry) => {
    e.stopPropagation();
    if (job.isMock) {
      addNotification({ type: "info", title: "Demo Data", message: "Cannot duplicate demo data.", category: "job" });
      return;
    }
    const dup = duplicateJob(job.id);
    if (dup) {
      addNotification({ type: "success", title: "Job Duplicated", message: `"${dup.title}" created as ${dup.jobNumber}`, category: "job" });
      addActivityLog({ action: "JOB_DUPLICATED", category: "job", description: `Duplicated job: ${job.title} → ${dup.jobNumber}`, user: "Current User", entityType: "job", entityId: dup.id, level: "info" });
    }
  };

  const promptDelete = (e: React.MouseEvent, job: JobEntry) => {
    e.stopPropagation();
    setShowDeleteConfirm(job.id);
  };

  const handleDelete = () => {
    if (!showDeleteConfirm) return;
    const job = allJobEntries.find(j => j.id === showDeleteConfirm);
    if (job?.isMock) {
      addNotification({ type: "info", title: "Demo Data", message: "Cannot delete demo data.", category: "job" });
    } else if (job) {
      deleteJob(job.id);
      addNotification({ type: "warning", title: "Job Deleted", message: `"${job.title}" has been removed.`, category: "job" });
      addActivityLog({ action: "JOB_DELETED", category: "job", description: `Deleted job: ${job.title}`, user: "Current User", entityType: "job", entityId: job.id, level: "warning" });
    }
    setShowDeleteConfirm(null);
  };

  const handleExportCSV = async () => {
    if (filtered.length === 0) {
      addNotification({ type: "warning", title: "No Data", message: "No jobs available to export.", category: "export" });
      return;
    }

    setIsExporting(true);
    try {
      const headers = ["Job Number", "Title", "Customer Name", "Status", "Total Value", "Currency", "Due Date", "Created At"];
      const rows = filtered.map(job => [
        job.jobNumber,
        `"${job.title.replace(/"/g, '""')}"`,
        `"${job.customerName.replace(/"/g, '""')}"`,
        job.status,
        job.totalValue.toString(),
        job.currency,
        job.dueDate || "",
        job.createdAt
      ].join(","));

      const csvContent = [headers.join(","), ...rows].join("\n");
      const savedPath = await saveTextFilePortable(
        {
          filters: [{ name: "CSV", extensions: ["csv"] }],
          defaultPath: `jobs_export_${new Date().toISOString().split('T')[0]}.csv`,
        },
        csvContent
      );
      if (!savedPath) return;

      addNotification({ type: "success", title: "Export Successful", message: `Jobs exported successfully.`, category: "export" });
    } catch (error) {
      console.error(error);
      addNotification({ type: "error", title: "Export Failed", message: "Failed to export jobs.", category: "export" });
    } finally {
      setIsExporting(false);
    }
  };

  const renderKanbanCard = (job: JobEntry) => (
    <div
      key={job.id}
      onClick={() => setSelectedJobId(job.id)}
      className="bg-white dark:bg-surface-dark-secondary p-3.5 rounded-xl border border-border-light dark:border-border-dark shadow-sm hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] font-mono font-bold text-text-light-tertiary dark:text-text-dark-tertiary">{job.jobNumber}</span>
        {job.isMock && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-light-tertiary dark:bg-surface-dark-tertiary text-text-light-tertiary">DEMO</span>}
      </div>
      <h4 className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary leading-snug mb-1 line-clamp-2">{job.title}</h4>
      <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-3">{job.customerName}</p>

      <div className="flex items-center justify-between pt-3 border-t border-border-light/60 dark:border-border-dark/60">
        <span className="text-sm font-black text-brand-600 dark:text-brand-400">{formatCurrency(job.totalValue, job.currency)}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => handleDuplicate(e, job)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"><Copy className="w-3.5 h-3.5 text-text-light-tertiary" /></button>
          <button onClick={(e) => promptDelete(e, job)} className="p-1 hover:bg-danger-50 dark:hover:bg-danger-500/10 rounded transition-colors"><Trash2 className="w-3.5 h-3.5 text-danger-500" /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in">

      {/* Top Header & Metrics */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-light-primary dark:text-text-dark-primary tracking-tight flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-brand-500" /> Print Jobs Management
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Track, manage, and refine estimating jobs from draft to completion.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} disabled={isExporting} className="btn-secondary h-10 flex items-center gap-2 px-4 shadow-sm bg-white dark:bg-surface-dark-secondary font-semibold">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => navigate("/estimate/new")} className="btn-primary h-10 flex items-center gap-2 px-4 shadow-md font-bold">
            <Plus className="w-4 h-4" /> New Estimate
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5 bg-gradient-to-br from-white to-gray-50 dark:from-surface-dark-secondary dark:to-surface-dark-tertiary border border-border-light dark:border-border-dark shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wider">Total Jobs</span>
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><Briefcase className="w-4 h-4 text-gray-500 dark:text-gray-400" /></div>
          </div>
          <span className="text-3xl font-black text-text-light-primary dark:text-text-dark-primary">{metrics.total}</span>
        </div>
        <div className="card p-5 bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/10 dark:to-surface-dark-secondary border border-brand-100 dark:border-brand-900/30 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Briefcase className="w-24 h-24" /></div>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-xs font-bold text-brand-700 dark:text-brand-400 uppercase tracking-wider">Cum. Pipeline Value</span>
            <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center"><Download className="w-4 h-4 text-brand-600 dark:text-brand-400 rotate-180" /></div>
          </div>
          <span className="text-3xl font-black text-brand-700 dark:text-brand-300 relative z-10">{formatCurrency(metrics.value, "USD").split('.')[0]}</span>
        </div>
        <div className="card p-5 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/10 dark:to-surface-dark-secondary border border-purple-100 dark:border-purple-900/30 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">In Production</span>
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center"><Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" /></div>
          </div>
          <span className="text-3xl font-black text-purple-700 dark:text-purple-300">{metrics.inProd}</span>
        </div>
        <div className="card p-5 bg-gradient-to-br from-green-50 to-white dark:from-green-900/10 dark:to-surface-dark-secondary border border-green-100 dark:border-green-900/30 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">Completed</span>
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" /></div>
          </div>
          <span className="text-3xl font-black text-green-700 dark:text-green-300">{metrics.completed}</span>
        </div>
      </div>

      {/* Toolbox */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 bg-surface-light-secondary dark:bg-surface-dark-tertiary rounded-xl border border-border-light dark:border-border-dark">
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs..."
              className="w-full bg-white dark:bg-surface-dark-secondary border border-border-light dark:border-border-dark rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-shadow text-text-light-primary dark:text-text-dark-primary font-medium"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light-tertiary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center p-1 bg-white dark:bg-surface-dark-secondary rounded-lg border border-border-light dark:border-border-dark shadow-sm">
            <button onClick={() => setViewMode("list")} className={cn("p-1.5 rounded-md transition-colors", viewMode === "list" ? "bg-surface-light-tertiary dark:bg-surface-dark-tertiary text-brand-600 dark:text-brand-400" : "text-text-light-tertiary hover:text-text-light-secondary dark:hover:text-text-dark-secondary")}><List className="w-4 h-4" /></button>
            <button onClick={() => setViewMode("kanban")} className={cn("p-1.5 rounded-md transition-colors", viewMode === "kanban" ? "bg-surface-light-tertiary dark:bg-surface-dark-tertiary text-brand-600 dark:text-brand-400" : "text-text-light-tertiary hover:text-text-light-secondary dark:hover:text-text-dark-secondary")}><LayoutGrid className="w-4 h-4" /></button>
          </div>
        </div>

        {viewMode === "list" && (
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 hide-scrollbar">
            <div className="flex items-center gap-1 p-1 bg-white dark:bg-surface-dark-secondary rounded-lg border border-border-light dark:border-border-dark">
              <button onClick={() => setStatusFilter("all")} className={cn("px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap", statusFilter === "all" ? "bg-surface-light-tertiary dark:bg-surface-dark-tertiary text-text-light-primary dark:text-text-dark-primary" : "text-text-light-secondary dark:text-text-dark-secondary hover:bg-black/5 dark:hover:bg-white/5")}>All</button>
              {Object.keys(STATUS_CONFIG).map((key) => (
                <button key={key} onClick={() => setStatusFilter(key)} className={cn("px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap", statusFilter === key ? "bg-surface-light-tertiary dark:bg-surface-dark-tertiary text-text-light-primary dark:text-text-dark-primary" : "text-text-light-secondary dark:text-text-dark-secondary hover:bg-black/5 dark:hover:bg-white/5")}>
                  {STATUS_CONFIG[key].label}
                </button>
              ))}
            </div>

            <div className="flex gap-1 border-l border-border-light dark:border-border-dark pl-2">
              <button onClick={() => toggleSort("createdAt")} className="btn-secondary h-8 px-2.5 text-xs font-bold bg-white dark:bg-surface-dark-secondary shadow-sm">
                <Calendar className="w-3.5 h-3.5 mr-1" />
                Date
                {sortField === "createdAt" && (sortDir === "desc" ? <SortDesc className="w-3 h-3 ml-1" /> : <SortAsc className="w-3 h-3 ml-1" />)}
              </button>
              <button onClick={() => toggleSort("totalValue")} className="btn-secondary h-8 px-2.5 text-xs font-bold bg-white dark:bg-surface-dark-secondary shadow-sm">
                Value
                {sortField === "totalValue" && (sortDir === "desc" ? <SortDesc className="w-3 h-3 ml-1" /> : <SortAsc className="w-3 h-3 ml-1" />)}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {viewMode === "list" ? (
        <div className="space-y-3 pb-8">
          {filtered.length === 0 ? (
            <div className="card p-16 text-center border-dashed border-2 bg-surface-light-tertiary dark:bg-surface-dark-tertiary/20">
              <Briefcase className="w-12 h-12 text-text-light-tertiary dark:text-text-dark-tertiary mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-black text-text-light-primary dark:text-text-dark-primary">No jobs found</h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-2 max-w-sm mx-auto">
                {search ? `Your search for "${search}" did not match any jobs. Try adjusting your filters.` : "Create your first detailed estimate to populate this list."}
              </p>
              {!search && (
                <button onClick={() => navigate("/estimate/new")} className="btn-primary mt-6 font-bold shadow-md">
                  <Plus className="w-4 h-4 mr-2" /> Create Estimate
                </button>
              )}
            </div>
          ) : (
            filtered.map(job => (
              <div
                key={job.id}
                onClick={() => setSelectedJobId(job.id)}
                className="bg-white dark:bg-surface-dark-secondary rounded-xl p-4 border border-border-light dark:border-border-dark shadow-sm hover:shadow-md dark:hover:shadow-elevated-dark hover:border-brand-200 dark:hover:border-brand-500/30 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-mono font-bold text-text-light-secondary dark:text-text-dark-secondary mr-1">{job.jobNumber}</span>
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase", STATUS_CONFIG[job.status]?.color)}>
                        {STATUS_CONFIG[job.status]?.label}
                      </span>
                      {job.isMock && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-light-tertiary dark:bg-surface-dark-tertiary text-text-light-tertiary">DEMO</span>}
                    </div>
                    <h3 className="text-base font-bold text-text-light-primary dark:text-text-dark-primary truncate">{job.title}</h3>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-text-light-secondary dark:text-text-dark-secondary flex-wrap">
                      <span className="flex items-center gap-1 font-medium"><Briefcase className="w-3.5 h-3.5 text-text-light-tertiary" /> {job.customerName}</span>
                      <span className="w-1 h-1 rounded-full bg-border-dark/30"></span>
                      <span className="font-semibold text-brand-600 dark:text-brand-400">{formatNumber(job.quantities[0] || 0)} copies</span>
                      {job.dueDate && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-border-dark/30"></span>
                          <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-medium"><Calendar className="w-3.5 h-3.5" /> {job.dueDate.split('T')[0]}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-5 ml-4">
                  <div className="text-right">
                    <p className="text-lg font-black text-text-light-primary dark:text-text-dark-primary">
                      {formatCurrency(job.totalValue, job.currency)}
                    </p>
                    <p className="text-[10px] font-medium text-text-light-tertiary dark:text-text-dark-tertiary mt-0.5">
                      {getRelativeTime(job.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedJobId(job.id)}
                      className="p-2 rounded-lg hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10 dark:hover:text-brand-400 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDuplicate(e, job)}
                      className="p-2 rounded-lg hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4 text-text-light-tertiary" />
                    </button>
                    <button
                      onClick={(e) => promptDelete(e, job)}
                      className="p-2 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-danger-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Kanban View */
        <div className="flex gap-4 overflow-x-auto pb-6 hide-scrollbar">
          {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => {
            const columnJobs = filtered.filter(j => j.status === statusKey);
            return (
              <div key={statusKey} className="min-w-[300px] w-[300px] flex flex-col bg-surface-light-secondary/50 dark:bg-surface-dark-secondary/50 rounded-2xl border border-border-light dark:border-border-dark p-3">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
                    <span className={cn("w-2.5 h-2.5 rounded-full", config.indicator)}></span>
                    {config.label}
                  </h3>
                  <span className="text-xs font-bold bg-white dark:bg-surface-dark-tertiary px-2 py-0.5 rounded-full text-text-light-secondary border border-border-light dark:border-border-dark">
                    {columnJobs.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {columnJobs.map(job => renderKanbanCard(job))}
                  {columnJobs.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-border-light dark:border-border-dark rounded-xl flex items-center justify-center text-xs font-bold text-text-light-tertiary dark:text-text-dark-tertiary">
                      Drop Here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative card p-6 w-full max-w-sm animate-scale-in text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-danger-50 dark:bg-danger-500/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-danger-500" />
            </div>
            <h3 className="text-xl font-black text-text-light-primary dark:text-text-dark-primary">Delete Job?</h3>
            <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mt-2">
              This action cannot be undone. This will permanently remove the job and all associated estimate data.
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary flex-1 font-bold h-10">Cancel</button>
              <button
                onClick={handleDelete}
                className="btn-danger flex-1 font-bold h-10 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extreme Detail Slider */}
      {selectedJobId && (
        <JobDetailsSlider
          jobId={selectedJobId}
          isOpen={!!selectedJobId}
          onClose={() => setSelectedJobId(null)}
          onEditJob={updateJob}
        />
      )}
    </div>
  );
}

