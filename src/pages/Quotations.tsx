import { useState, useMemo } from "react";
import { cn } from "@/utils/cn";
import { useAppStore } from "@/stores/appStore";
import { useDataStore } from "@/stores/dataStore";
import { apiClient } from "@/api/client";
import { formatCurrency, formatDate, getRelativeTime } from "@/utils/format";
import {
  FileCheck, Search, Eye, Check, X,
  Download, Clock, AlertCircle, Send,
  FileText, Copy, Trash2, Edit3, Banknote
} from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile, writeFile } from "@tauri-apps/plugin-fs";
import { Quotation } from "@/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  results: any[];
}

const QTN_STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-success-50 dark:bg-success-500/10", text: "text-success-700 dark:text-success-400", label: "Active" },
  draft: { bg: "bg-warning-50 dark:bg-warning-500/10", text: "text-warning-700 dark:text-warning-400", label: "Draft" },
  sent: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", label: "Sent" },
  accepted: { bg: "bg-success-50 dark:bg-success-500/10", text: "text-success-700 dark:text-success-400", label: "Accepted" },
  rejected: { bg: "bg-danger-50 dark:bg-danger-500/10", text: "text-danger-700 dark:text-danger-400", label: "Rejected" },
  expired: { bg: "bg-surface-light-tertiary dark:bg-surface-dark-tertiary", text: "text-text-light-tertiary dark:text-text-dark-tertiary", label: "Expired" },
  revised: { bg: "bg-purple-50 dark:bg-purple-500/10", text: "text-purple-700 dark:text-purple-400", label: "Revised" },
};

export function Quotations() {
  const { addNotification, addActivityLog } = useAppStore();
  const { quotations, updateQuotation, deleteQuotation, duplicateQuotation } = useDataStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [viewDetailsQtn, setViewDetailsQtn] = useState<QuotationEntry | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<QuotationEntry | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQtn, setEditingQtn] = useState<Partial<Quotation> | null>(null);

  const handleDownloadPDF = async (qtn: QuotationEntry) => {
    try {
      const filePath = await save({
        filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
        defaultPath: `${qtn.quotationNumber}.pdf`,
      });

      if (!filePath) return;

      let finalPath = filePath;
      if (!finalPath.toLowerCase().endsWith('.pdf')) {
        finalPath += '.pdf';
      }

      const doc = new jsPDF();

      // Header Letthead
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59); // Slate 800
      doc.text("PRINT QUOTATION", 14, 22);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // Slate 500
      doc.text(`Date Issued: ${formatDate(qtn.createdAt)}`, 14, 30);
      doc.text(`Valid Until: ${formatDate(qtn.validUntil)}`, 14, 35);
      doc.text(`Quote Reference: ${qtn.quotationNumber} (Rev. ${qtn.revisionNumber})`, 14, 40);

      // Customer Block
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42); // Slate 900
      doc.text("Bill To:", 14, 52);
      doc.setFontSize(11);
      doc.text(qtn.customerName, 14, 58);

      // Job Detials
      doc.setFontSize(11);
      doc.text(`Job description: ${qtn.jobTitle}`, 14, 68);

      autoTable(doc, {
        startY: 75,
        head: [['S.No', 'Item Description', 'Status', 'Total Value']],
        body: [
          ['1', qtn.jobTitle, qtn.status.toUpperCase(), `${qtn.currency} ${qtn.totalValue.toLocaleString()}`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 6, textColor: [30, 41, 59] }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 75;

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`Grand Total: ${qtn.currency} ${qtn.totalValue.toLocaleString()}`, 14, finalY + 15);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Thank you for your business. This quotation is subject to our standard terms and conditions.", 14, finalY + 30);

      const pdfArrayBuffer = doc.output('arraybuffer');
      const uint8Array = new Uint8Array(pdfArrayBuffer);

      await writeFile(finalPath, uint8Array);

      addNotification({ type: 'success', title: 'PDF Exported', message: `Saved successfully to ${finalPath}`, category: 'export' });
      addActivityLog({ action: 'QUOTATION_EXPORTED', category: 'export', description: `Exported quotation ${qtn.quotationNumber} to PDF`, user: 'Current User', entityType: 'quotation', entityId: qtn.id, level: 'info' });
    } catch (err: any) {
      console.error(err);
      addNotification({ type: 'error', title: 'Export Failed', message: err?.message || 'Failed to generate and save the PDF.', category: 'export' });
    }
  };

  const filtered = useMemo(() => {
    let items = quotations.map((q) => ({
      ...q,
      totalValue: q.results?.[0]?.grandTotal ?? 0,
      comments: q.comments?.length || 0,
    }));

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(qt => qt.jobTitle.toLowerCase().includes(q) || qt.customerName.toLowerCase().includes(q) || qt.quotationNumber.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") items = items.filter(qt => qt.status === statusFilter);
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [search, statusFilter, quotations]);

  const handleExportAll = async () => {
    const rows = filtered.map((q) => [
      q.quotationNumber, q.jobTitle, q.customerName, q.status, q.totalValue, q.currency, q.validUntil, q.revisionNumber, q.comments,
    ]);
    const csv = [
      ["Quote #", "Job", "Customer", "Status", "Value", "Currency", "Valid Until", "Revision", "Comments"].join(","),
      ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    try {
      const filePath = await save({ filters: [{ name: 'CSV Document', extensions: ['csv'] }], defaultPath: "quotations-history.csv" });
      if (filePath) {
        await writeTextFile(filePath, csv);
        addNotification({ type: "success", title: "Exported", message: `Quotation history saved to ${filePath}`, category: "export" });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      deleteQuotation(showDeleteConfirm.id);
      addNotification({ type: 'success', title: 'Quotation Deleted', message: `Quotation ${showDeleteConfirm.quotationNumber} has been removed.`, category: 'quotation' });
      setShowDeleteConfirm(null);
    }
  };

  const handleDuplicate = (id: string) => {
    const newQtn = duplicateQuotation(id);
    if (newQtn) {
      addNotification({ type: 'success', title: 'Duplicated', message: `Created draft revision ${newQtn.quotationNumber}.`, category: 'quotation' });
    }
  };

  const openEditor = (id: string) => {
    const original = quotations.find((q) => q.id === id);
    if (original) {
      setEditingQtn({ ...original });
      setIsEditModalOpen(true);
    }
  };

  const saveEdit = () => {
    if (editingQtn && editingQtn.id) {
      updateQuotation(editingQtn.id, editingQtn);
      addNotification({ type: 'success', title: 'Updates Saved', message: 'Details updated successfully.', category: 'quotation' });
      setIsEditModalOpen(false);
      setEditingQtn(null);
    }
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header aligned with standard UI */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg">
              <FileCheck className="w-5 h-5" />
            </div>
            Quotations
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            {filtered.length} quotations • {filtered.filter(q => q.status === "sent").length} pending responses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportAll} className="btn-secondary text-sm flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters (Standard style) */}
      <div className="flex items-center gap-3 bg-surface-light-primary dark:bg-surface-dark-primary p-3 rounded-2xl border border-surface-light-border dark:border-surface-dark-border shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light-tertiary" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search quotations..." className="input-field pl-9 bg-surface-light-secondary dark:bg-surface-dark-secondary border-none" />
        </div>
        <div className="h-8 w-px bg-surface-light-border dark:bg-surface-dark-border mx-2" />
        <div className="flex items-center gap-1.5 border border-surface-light-border dark:border-surface-dark-border p-1 rounded-xl overflow-x-auto">
          {["all", ...Object.keys(QTN_STATUS_CONFIG)].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize whitespace-nowrap", statusFilter === s ? "bg-white dark:bg-surface-dark-secondary text-primary-600 dark:text-primary-400 shadow-sm" : "text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary")}>
              {s === "all" ? "All" : QTN_STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table (Standard Data Grid Style) */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center border-dashed">
          <FileCheck className="w-12 h-12 text-text-light-tertiary dark:text-text-dark-tertiary mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">No quotations found</h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">Adjust filters or create a new quote via jobs.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden border border-surface-light-border dark:border-surface-dark-border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-light-secondary dark:bg-surface-dark-secondary border-b border-surface-light-border dark:border-surface-dark-border text-xs font-semibold text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wider">
                  <th className="p-4 font-medium">Quote Information</th>
                  <th className="p-4 font-medium">Customer & Job</th>
                  <th className="p-4 font-medium hidden md:table-cell">Dates</th>
                  <th className="p-4 font-medium text-right sm:text-left">Value</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-light-border dark:divide-surface-dark-border">
                {filtered.map(qtn => {
                  const statusStyle = QTN_STATUS_CONFIG[qtn.status];
                  const isExpired = new Date(qtn.validUntil) < new Date() && qtn.status !== "accepted" && qtn.status !== "rejected";
                  return (
                    <tr key={qtn.id} className="hover:bg-surface-light-secondary/30 dark:hover:bg-surface-dark-secondary/30 transition-colors group">
                      <td className="p-4">
                        <div className="flex flex-col min-w-0">
                          <h3 className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary font-mono">{qtn.quotationNumber}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            {qtn.revisionNumber > 0 && <span className="text-xs text-text-light-tertiary">Rev. {qtn.revisionNumber}</span>}
                            {isExpired && <span className="text-[10px] text-danger-500 font-medium">Expired</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 max-w-[200px]">
                        <div className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary truncate" title={qtn.customerName}>{qtn.customerName}</div>
                        <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary truncate mt-0.5" title={qtn.jobTitle}>{qtn.jobTitle}</div>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary space-y-1">
                          <div>Created: {formatDate(qtn.createdAt)}</div>
                          <div>Valid: <span className={cn(isExpired ? "text-danger-500 font-medium" : "")}>{formatDate(qtn.validUntil)}</span></div>
                        </div>
                      </td>
                      <td className="p-4 text-right sm:text-left">
                        <div className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">{formatCurrency(qtn.totalValue)}</div>
                        <div className="text-xs text-text-light-tertiary uppercase mt-0.5">{qtn.currency}</div>
                      </td>
                      <td className="p-4">
                        <div className={cn("inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", statusStyle?.bg, statusStyle?.text)}>
                          {statusStyle?.label || qtn.status}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setViewDetailsQtn(qtn)} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-surface-dark-tertiary text-text-light-tertiary hover:text-primary-600 transition-colors shadow-sm lg:shadow-none bg-surface-light-primary lg:bg-transparent" title="View Breakdowns"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => openEditor(qtn.id)} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-surface-dark-tertiary text-text-light-tertiary hover:text-blue-600 transition-colors shadow-sm lg:shadow-none bg-surface-light-primary lg:bg-transparent" title="Edit Quote Details"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => handleDuplicate(qtn.id)} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-surface-dark-tertiary text-text-light-tertiary hover:text-amber-600 transition-colors shadow-sm lg:shadow-none bg-surface-light-primary lg:bg-transparent" title="Duplicate"><Copy className="w-4 h-4" /></button>
                          <button onClick={() => handleDownloadPDF(qtn as QuotationEntry)} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-surface-dark-tertiary text-text-light-tertiary hover:text-blue-600 transition-colors shadow-sm lg:shadow-none bg-surface-light-primary lg:bg-transparent" title="Download PDF"><Download className="w-4 h-4" /></button>
                          <button onClick={() => setShowDeleteConfirm(qtn as QuotationEntry)} className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10 text-text-light-tertiary hover:text-danger-600 transition-colors shadow-sm lg:shadow-none bg-surface-light-primary lg:bg-transparent" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Modals Section --- */}

      {/* Edit Modal (Standard Clean Style) */}
      {isEditModalOpen && editingQtn && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative card w-full max-w-2xl flex flex-col max-h-[90vh] animate-scale-in border border-surface-light-border dark:border-surface-dark-border shadow-2xl p-0 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-surface-light-border dark:border-surface-dark-border bg-surface-light-secondary dark:bg-surface-dark-secondary text-left">
              <div className="flex items-center justify-start gap-3 w-full">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-lg">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary capitalize text-left w-full block">Edit Quotation</h2>
                  <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary font-mono w-full text-left">{editingQtn.quotationNumber}</p>
                </div>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-surface-light-border dark:hover:bg-surface-dark-border rounded-xl transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-light-tertiary text-left w-full">Quote Configuration</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="label">Validity Period (Days)</label>
                    <input type="number" value={editingQtn.validityDays || 0} onChange={(e) => setEditingQtn({ ...editingQtn, validityDays: parseInt(e.target.value) || 0 })} className="input-field" />
                  </div>
                  <div>
                    <label className="label">Valid Until</label>
                    <input type="date" value={editingQtn.validUntil?.split('T')[0] || ''} onChange={(e) => setEditingQtn({ ...editingQtn, validUntil: new Date(e.target.value).toISOString() })} className="input-field" />
                  </div>
                  <div>
                    <label className="label">Payment Terms</label>
                    <input type="text" value={editingQtn.paymentTerms || ''} onChange={(e) => setEditingQtn({ ...editingQtn, paymentTerms: e.target.value })} className="input-field" placeholder="e.g. 100% Adv." />
                  </div>
                  <div>
                    <label className="label">Delivery Terms</label>
                    <input type="text" value={editingQtn.deliveryTerms || ''} onChange={(e) => setEditingQtn({ ...editingQtn, deliveryTerms: e.target.value })} className="input-field" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-surface-light-border dark:border-surface-dark-border">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-light-tertiary text-left w-full">Terms & Notes</h3>
                <div>
                  <label className="label">Public Terms & Conditions</label>
                  <textarea value={editingQtn.termsAndConditions || ''} onChange={(e) => setEditingQtn({ ...editingQtn, termsAndConditions: e.target.value })} className="input-field min-h-[100px] resize-none" placeholder="These terms show on the PDF..." />
                </div>
                <div>
                  <label className="label">Private Internal Notes</label>
                  <textarea value={editingQtn.notes || ''} onChange={(e) => setEditingQtn({ ...editingQtn, notes: e.target.value })} className="input-field min-h-[80px] resize-none" placeholder="Only visible internally..." />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-surface-light-border dark:border-surface-dark-border bg-surface-light-secondary dark:bg-surface-dark-secondary flex justify-between items-center text-left">
              <div />
              <div className="flex gap-3">
                <button onClick={() => setIsEditModalOpen(false)} className="btn-secondary">Cancel</button>
                <button onClick={saveEdit} className="btn-primary flex items-center gap-2"><Check className="w-4 h-4" /> Update Quote</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative card p-8 w-full max-w-sm animate-scale-in text-center shadow-2xl border-danger-500/30">
            <div className="w-16 h-16 rounded-full bg-danger-50 dark:bg-danger-500/10 flex items-center justify-center mx-auto mb-4 border-4 border-danger-100 dark:border-danger-500/20">
              <Trash2 className="w-8 h-8 text-danger-500" />
            </div>
            <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">Delete Quotation?</h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-2">
              You are about to permanently delete quotation <strong>{showDeleteConfirm.quotationNumber}</strong>. This action cannot be undone.
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleDelete} className="btn-danger flex-1 flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deep View Modal */}
      {viewDetailsQtn && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setViewDetailsQtn(null)} />
          <div className="relative card w-full max-w-2xl flex flex-col max-h-[90vh] animate-scale-in border border-surface-light-border shadow-2xl p-0 overflow-hidden text-left">
            <div className="flex items-center justify-between p-5 border-b border-surface-light-border bg-surface-light-secondary dark:bg-surface-dark-secondary text-left">
              <div className="flex items-center gap-3 w-full justify-start">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-lg">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary"><span className="font-mono">{viewDetailsQtn.quotationNumber}</span> Cost Breakdown</h2>
                  <p className="text-xs text-text-light-secondary truncate max-w-md">{viewDetailsQtn.jobTitle} - {viewDetailsQtn.customerName}</p>
                </div>
              </div>
              <button onClick={() => setViewDetailsQtn(null)} className="p-2 hover:bg-surface-light-border dark:hover:bg-surface-dark-border rounded-xl transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left bg-surface-light-primary dark:bg-surface-dark-primary">
              {viewDetailsQtn.results?.[0] ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-light-secondary dark:bg-surface-dark-secondary border border-surface-light-border p-4 rounded-xl">
                      <p className="text-xs text-text-light-tertiary uppercase font-medium">Production Cost Margin</p>
                      <p className="text-xl font-black text-danger-600 dark:text-danger-400 mt-1">{formatCurrency(viewDetailsQtn.results[0].totalProductionCost || 0)}</p>
                    </div>
                    <div className="bg-surface-light-secondary dark:bg-surface-dark-secondary border border-surface-light-border p-4 rounded-xl">
                      <p className="text-xs text-text-light-tertiary uppercase font-medium">Profit Margin</p>
                      <p className="text-xl font-black text-success-600 dark:text-success-400 mt-1">{formatCurrency(viewDetailsQtn.results[0].marginAmount || 0)}</p>
                    </div>
                    <div className="bg-surface-light-secondary dark:bg-surface-dark-secondary border border-surface-light-border p-4 rounded-xl">
                      <p className="text-xs text-text-light-tertiary uppercase font-medium">Est. Tax Amounts</p>
                      <p className="text-xl font-black text-text-light-primary dark:text-text-dark-primary mt-1">{formatCurrency(viewDetailsQtn.results[0].taxAmount || 0)}</p>
                    </div>
                    <div className="bg-primary-50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800 p-4 rounded-xl">
                      <p className="text-xs text-primary-700 dark:text-primary-300 uppercase font-medium">Grand Final Total</p>
                      <p className="text-2xl font-black text-primary-700 dark:text-primary-300 mt-1">{formatCurrency(viewDetailsQtn.results[0].grandTotal || 0)}</p>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold uppercase tracking-wider text-text-light-tertiary mt-6 text-left">Detailed Info</h3>
                  <div className="border border-surface-light-border rounded-xl overflow-hidden text-sm bg-white dark:bg-surface-dark-secondary">
                    <div className="flex border-b border-surface-light-border last:border-0"><div className="w-1/3 bg-surface-light-secondary dark:bg-surface-dark-tertiary p-3 font-medium text-text-light-secondary">Cost per unit ({viewDetailsQtn.results[0].quantity} copies)</div><div className="w-2/3 p-3 font-bold">{formatCurrency(viewDetailsQtn.results[0].totalCostPerCopy || 0)}</div></div>
                    <div className="flex border-b border-surface-light-border last:border-0"><div className="w-1/3 bg-surface-light-secondary dark:bg-surface-dark-tertiary p-3 font-medium text-text-light-secondary">Calculated Weight</div><div className="w-2/3 p-3 font-bold">{viewDetailsQtn.results[0].totalWeight?.toFixed(2) || 0} Kg</div></div>
                    <div className="flex border-b border-surface-light-border last:border-0"><div className="w-1/3 bg-surface-light-secondary dark:bg-surface-dark-tertiary p-3 font-medium text-text-light-secondary">Created By</div><div className="w-2/3 p-3 font-bold">{formatDate(viewDetailsQtn.createdAt)}</div></div>
                  </div>
                </>
              ) : (
                <div className="text-center py-10 text-text-light-tertiary">No technical results generated for this quotation.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
