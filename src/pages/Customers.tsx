import { useState, useMemo, useRef } from "react";
import { useAppStore } from "@/stores/appStore";
import { useDataStore } from "@/stores/dataStore";
import { cn } from "@/utils/cn";
import { formatCurrency, formatDate, generateCustomerCode } from "@/utils/format";
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import {
  Users, Search, Plus, Download, Upload, Eye, Edit3, Trash2, X, Check,
  Phone, Mail, MapPin, Globe, Building2, CreditCard, Banknote, Briefcase, FileText,
  Copy, MoreVertical, Archive, ArrowRight, Tag, Percent
} from "lucide-react";
import type { Customer } from "@/types";

const PRIORITY_DOTS: Record<string, { color: string; label: string }> = {
  high: { color: "bg-danger-500", label: "High Priority" },
  medium: { color: "bg-warning-500", label: "Medium Priority" },
  low: { color: "bg-success-500", label: "Low Priority" },
};

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-success-50 dark:bg-success-500/10", text: "text-success-700 dark:text-success-400", label: "Active" },
  inactive: { bg: "bg-surface-light-tertiary dark:bg-surface-dark-tertiary", text: "text-text-light-tertiary dark:text-text-dark-tertiary", label: "Inactive" },
  draft: { bg: "bg-warning-50 dark:bg-warning-500/10", text: "text-warning-700 dark:text-warning-400", label: "Draft" },
  lead: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", label: "Lead" },
};

const MOCK_CUSTOMERS: Customer[] = [
  {
    id: "mock-1", code: "OUP-001", name: "Oxford University Press", contactPerson: "James Smith", email: "james@oup.com", phone: "+44 1865 556767", alternatePhone: "",
    website: "www.oup.com", industry: "Publishing", companyRegNumber: "CRN123456", leadSource: "Direct", socialLinks: [],
    defaultDiscount: 10, defaultMargin: 25, defaultTaxRate: 0, preferredCurrency: "GBP", preferredBank: "", accountManager: "Alice", creditLimit: 500000, paymentTerms: "Net 60",
    address: "Walton Street", city: "Oxford", state: "Oxfordshire", country: "United Kingdom", pincode: "OX2 6DP", gstNumber: "", panNumber: "",
    shippingAddress: { address: "Walton Street", city: "Oxford", state: "Oxfordshire", country: "United Kingdom", pincode: "OX2 6DP" },
    priority: "high", category: "Education", notes: "Premium account.", status: "active",
    totalOrders: 45, totalRevenue: 28500000, createdAt: "2024-01-15T10:00:00Z", updatedAt: "2024-01-15T10:00:00Z"
  }
];

const EMPTY_FORM: Omit<Customer, "id" | "createdAt" | "updatedAt" | "totalOrders" | "totalRevenue"> = {
  name: "", code: "", contactPerson: "", email: "", phone: "", alternatePhone: "",
  website: "", industry: "", companyRegNumber: "", leadSource: "", socialLinks: [],
  defaultDiscount: 0, defaultMargin: 20, defaultTaxRate: 0, preferredCurrency: "INR", preferredBank: "", accountManager: "", creditLimit: 0, paymentTerms: "Net 30",
  address: "", city: "", state: "", country: "", pincode: "", gstNumber: "", panNumber: "",
  shippingAddress: { address: "", city: "", state: "", country: "", pincode: "" },
  priority: "medium", category: "", notes: "", status: "active"
};

export function Customers() {
  const { addNotification, addActivityLog } = useAppStore();
  const { customers, addCustomer, updateCustomer, deleteCustomer, duplicateCustomer } = useDataStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const allCustomers = useMemo(() => {
    if (customers.length > 0) return customers;
    return MOCK_CUSTOMERS;
  }, [customers]);

  const filtered = useMemo(() => {
    let items = [...allCustomers];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(c => c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") items = items.filter(c => c.status === statusFilter);
    if (priorityFilter !== "all") items = items.filter(c => c.priority === priorityFilter);
    return items;
  }, [search, statusFilter, priorityFilter, allCustomers]);

  const handleExport = async () => {
    try {
      const headers = [
        "Code", "Name", "Status", "Contact", "Email", "Phone", "City", "Country",
        "Priority", "Default Discount %", "Default Margin %"
      ];
      const rows = allCustomers.map((c) =>
        [c.code, c.name, c.status, c.contactPerson, c.email, c.phone, c.city, c.country, c.priority, c.defaultDiscount, c.defaultMargin]
          .map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`)
          .join(",")
      );
      const csvContent = [headers.join(","), ...rows].join("\n");

      const filePath = await save({
        filters: [{ name: 'CSV', extensions: ['csv'] }],
        defaultPath: 'customers-export.csv',
      });

      if (filePath) {
        await writeTextFile(filePath, csvContent);
        addNotification({ type: "success", title: "Export Successful", message: `Customers exported to ${filePath}`, category: "export" });
        addActivityLog({ action: "CUSTOMERS_EXPORTED", category: "customer", description: `Exported ${allCustomers.length} customers to CSV`, user: "Current User", entityType: "customer", entityId: "", level: "info" });
      }
    } catch (error) {
      console.error("Export failed", error);
      addNotification({ type: "error", title: "Export Failed", message: "Failed to export customers CSV.", category: "export" });
    }
  };

  const importFileRef = useRef<HTMLInputElement>(null);
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return;
      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        // Advanced import logic would go here, simplified for brevity
        imported++;
      }
      addNotification({ type: "success", title: "Import Failed", message: "Advanced import not fully implemented in UI snippet.", category: "import" });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSave = (statusOverride?: "active" | "draft") => {
    if (!formData.name.trim()) return;
    const finalData = { ...formData, status: statusOverride || formData.status };

    if (modalMode === "add") {
      const newC = addCustomer(finalData);
      addNotification({ type: "success", title: "Customer Created", message: `${newC.name} has been created.`, category: "customer" });
    } else if (editingId) {
      updateCustomer(editingId, finalData);
      addNotification({ type: "success", title: "Customer Updated", message: `${formData.name} has been updated.`, category: "customer" });
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    deleteCustomer(id);
    addNotification({ type: "warning", title: "Customer Deleted", message: "Customer removed permanently.", category: "customer" });
    setShowDeleteConfirm(null);
  };

  const handleDuplicate = (id: string) => {
    const dup = duplicateCustomer(id);
    if (dup) {
      addNotification({ type: "success", title: "Customer Duplicated", message: `${dup.name} created as draft.`, category: "customer" });
    }
  };

  const openModal = (mode: "add" | "edit" | "view", customer?: Customer) => {
    setModalMode(mode);
    setActiveTab(0);
    if (customer) {
      setEditingId(customer.id);
      setFormData(JSON.parse(JSON.stringify(customer))); // Deep copy
    } else {
      setEditingId(null);
      setFormData({ ...EMPTY_FORM });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg">
              <Users className="w-5 h-5" />
            </div>
            Customer CRM
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            {allCustomers.length} total • {allCustomers.filter(c => c.status === "active").length} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" ref={importFileRef} accept=".csv" onChange={handleImportCSV} className="hidden" />
          <button onClick={() => importFileRef.current?.click()} className="btn-secondary text-sm flex items-center gap-1.5 hidden">
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button onClick={handleExport} className="btn-secondary text-sm flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export Advanced CSV
          </button>
          <button onClick={() => openModal("add")} className="btn-primary flex items-center gap-1.5 shadow-lg shadow-primary-500/20">
            <Plus className="w-4 h-4" /> New Customer
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 bg-surface-light-primary dark:bg-surface-dark-primary p-3 rounded-2xl border border-surface-light-border dark:border-surface-dark-border shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light-tertiary" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." className="input-field pl-9 bg-surface-light-secondary dark:bg-surface-dark-secondary border-none" />
        </div>
        <div className="h-8 w-px bg-surface-light-border dark:bg-surface-dark-border mx-2" />
        <div className="flex items-center gap-1.5 border border-surface-light-border dark:border-surface-dark-border p-1 rounded-xl">
          {["all", "active", "lead", "draft", "inactive"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize", statusFilter === s ? "bg-white dark:bg-surface-dark-secondary text-primary-600 dark:text-primary-400 shadow-sm" : "text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary")}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 border border-surface-light-border dark:border-surface-dark-border p-1 rounded-xl">
          {["all", "high", "medium", "low"].map(p => (
            <button key={p} onClick={() => setPriorityFilter(p)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize flex items-center gap-1.5", priorityFilter === p ? "bg-white dark:bg-surface-dark-secondary text-text-light-primary dark:text-text-dark-primary shadow-sm" : "text-text-light-secondary dark:text-text-dark-secondary")}>
              {p !== "all" && <div className={cn("w-2 h-2 rounded-full", PRIORITY_DOTS[p]?.color)} />}
              {p === "all" ? "All Priorities" : p}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center border-dashed">
          <Users className="w-12 h-12 text-text-light-tertiary dark:text-text-dark-tertiary mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">No customers found</h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">Adjust filters or create a new customer.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden border border-surface-light-border dark:border-surface-dark-border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-light-secondary dark:bg-surface-dark-secondary border-b border-surface-light-border dark:border-surface-dark-border text-xs font-semibold text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wider">
                  <th className="p-4 font-medium">Customer Information</th>
                  <th className="p-4 font-medium">Primary Contact</th>
                  <th className="p-4 font-medium hidden md:table-cell">Location</th>
                  <th className="p-4 font-medium hidden lg:table-cell">Auto-Settings</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-light-border dark:divide-surface-dark-border">
                {filtered.map(customer => {
                  const statusStyle = STATUS_BADGES[customer.status || "active"];
                  return (
                    <tr key={customer.id} className="hover:bg-surface-light-secondary/30 dark:hover:bg-surface-dark-secondary/30 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/20 flex items-center justify-center text-primary-700 dark:text-primary-400 text-sm font-bold shrink-0">
                            {customer.name?.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">{customer.name}</h3>
                              <div className={cn("w-1.5 h-1.5 rounded-full", PRIORITY_DOTS[customer.priority || "medium"]?.color)} title={`Priority: ${customer.priority}`} />
                            </div>
                            <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary font-mono mt-0.5">{customer.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1.5 text-xs">
                          {customer.email ? (
                            <div className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary max-w-[200px] truncate" title={customer.email}>
                              <Mail className="w-3.5 h-3.5 shrink-0 opacity-70" /> {customer.email}
                            </div>
                          ) : (
                            <div className="text-text-light-tertiary italic">- No email -</div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary">
                              <Phone className="w-3.5 h-3.5 shrink-0 opacity-70" /> {customer.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        {(customer.city || customer.country) ? (
                          <div className="flex items-center gap-2 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                            <MapPin className="w-3.5 h-3.5 shrink-0 opacity-70" />
                            <span>{[customer.city, customer.country].filter(Boolean).join(", ")}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-text-light-tertiary">-</span>
                        )}
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        <div className="flex items-center gap-4 text-xs">
                          <div>
                            <span className="text-text-light-tertiary uppercase text-[10px] block mb-0.5 font-medium">Auto-Discount</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{customer.defaultDiscount}%</span>
                          </div>
                          <div>
                            <span className="text-text-light-tertiary uppercase text-[10px] block mb-0.5 font-medium">Margin Tgt</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">{customer.defaultMargin}%</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className={cn("inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", statusStyle?.bg, statusStyle?.text)}>
                          {statusStyle?.label}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openModal("view", customer)} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-surface-dark-tertiary text-text-light-tertiary hover:text-primary-600 transition-colors shadow-sm lg:shadow-none bg-surface-light-primary lg:bg-transparent" title="View Details"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => openModal("edit", customer)} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-surface-dark-tertiary text-text-light-tertiary hover:text-blue-600 transition-colors shadow-sm lg:shadow-none bg-surface-light-primary lg:bg-transparent" title="Edit"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => handleDuplicate(customer.id)} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-surface-dark-tertiary text-text-light-tertiary hover:text-amber-600 transition-colors shadow-sm lg:shadow-none bg-surface-light-primary lg:bg-transparent" title="Duplicate"><Copy className="w-4 h-4" /></button>
                          <button onClick={() => setShowDeleteConfirm(customer.id)} className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10 text-text-light-tertiary hover:text-danger-600 transition-colors shadow-sm lg:shadow-none bg-surface-light-primary lg:bg-transparent" title="Delete"><Trash2 className="w-4 h-4" /></button>
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

      {/* Full Multi-Tab Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={modalMode === "view" ? closeModal : undefined} />
          <div className="relative card w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-in overflow-hidden border border-surface-light-border dark:border-surface-dark-border shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-surface-light-border dark:border-surface-dark-border bg-surface-light-secondary dark:bg-surface-dark-secondary">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-lg">
                  {modalMode === "add" ? <Plus className="w-5 h-5" /> : modalMode === "view" ? <Eye className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary capitalize">
                    {modalMode} Customer
                  </h2>
                  <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary font-mono">{formData.code || "Auto-generated ID"}</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-surface-light-border dark:hover:bg-surface-dark-border rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar Tabs */}
              <div className="w-56 border-r border-surface-light-border dark:border-surface-dark-border bg-surface-light-secondary/50 dark:bg-surface-dark-secondary/50 p-3 space-y-1">
                {[
                  { id: 0, label: "General details", icon: <Building2 className="w-4 h-4" /> },
                  { id: 1, label: "Financials & Prefs", icon: <Percent className="w-4 h-4" /> },
                  { id: 2, label: "Addresses", icon: <MapPin className="w-4 h-4" /> },
                  { id: 3, label: "Other Details", icon: <FileText className="w-4 h-4" /> },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                      activeTab === tab.id
                        ? "bg-white dark:bg-surface-dark-primary text-primary-700 dark:text-primary-400 shadow-sm border border-surface-light-border dark:border-surface-dark-border"
                        : "text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-border/50 dark:hover:bg-surface-dark-border/50 hover:text-text-light-primary"
                    )}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* Form Area */}
              <div className="flex-1 overflow-y-auto p-6 bg-surface-light-primary dark:bg-surface-dark-primary">
                {activeTab === 0 && (
                  <div className="space-y-5 animate-in">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-text-light-tertiary">Company Information</h3>
                    <div className="grid grid-cols-2 gap-5">
                      <FormField label="Company Name *" value={formData.name} onChange={v => setFormData({ ...formData, name: v })} disabled={modalMode === "view"} />
                      <FormField label="Customer Code" value={formData.code} onChange={v => setFormData({ ...formData, code: v })} disabled={modalMode === "view"} hint="Leave empty to auto-generate" />
                      <FormField label="Contact Person" value={formData.contactPerson} onChange={v => setFormData({ ...formData, contactPerson: v })} disabled={modalMode === "view"} />
                      <FormField label="Email Address" type="email" value={formData.email} onChange={v => setFormData({ ...formData, email: v })} disabled={modalMode === "view"} />
                      <FormField label="Primary Phone" value={formData.phone} onChange={v => setFormData({ ...formData, phone: v })} disabled={modalMode === "view"} />
                      <FormField label="Alternate Phone" value={formData.alternatePhone} onChange={v => setFormData({ ...formData, alternatePhone: v })} disabled={modalMode === "view"} />
                      <FormField label="Website" value={formData.website} onChange={v => setFormData({ ...formData, website: v })} disabled={modalMode === "view"} />
                      <FormField label="Industry" value={formData.industry} onChange={v => setFormData({ ...formData, industry: v })} disabled={modalMode === "view"} />
                    </div>
                  </div>
                )}

                {activeTab === 1 && (
                  <div className="space-y-5 animate-in">
                    <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 mb-6">
                      <h4 className="flex items-center gap-2 font-bold text-primary-800 dark:text-primary-300 mb-1 text-sm">
                        <Percent className="w-4 h-4" /> Calculator Automation Settings
                      </h4>
                      <p className="text-xs text-primary-600 dark:text-primary-400">These values will auto-populate and apply when this customer is selected in the Print Calculator.</p>

                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <FormField label="Default Discount (%)" type="number" value={String(formData.defaultDiscount)} onChange={v => setFormData({ ...formData, defaultDiscount: Number(v) })} disabled={modalMode === "view"} inputClassName="text-primary-900 dark:text-primary-100 border-primary-300 dark:border-primary-500/30 bg-white dark:bg-surface-dark-secondary focus:ring-primary-500" />
                        <FormField label="Default Margin Target (%)" type="number" value={String(formData.defaultMargin)} onChange={v => setFormData({ ...formData, defaultMargin: Number(v) })} disabled={modalMode === "view"} inputClassName="text-primary-900 dark:text-primary-100 border-primary-300 dark:border-primary-500/30 bg-white dark:bg-surface-dark-secondary focus:ring-primary-500" />
                        <FormField label="Default Tax Rate (%)" type="number" value={String(formData.defaultTaxRate)} onChange={v => setFormData({ ...formData, defaultTaxRate: Number(v) })} disabled={modalMode === "view"} inputClassName="text-primary-900 dark:text-primary-100 border-primary-300 dark:border-primary-500/30 bg-white dark:bg-surface-dark-secondary focus:ring-primary-500" />
                      </div>
                    </div>

                    <h3 className="text-sm font-bold uppercase tracking-wider text-text-light-tertiary">Financial Details</h3>
                    <div className="grid grid-cols-2 gap-5">
                      <FormField label="Credit Limit" type="number" value={String(formData.creditLimit)} onChange={v => setFormData({ ...formData, creditLimit: Number(v) })} disabled={modalMode === "view"} />
                      <FormField label="Payment Terms" value={formData.paymentTerms} onChange={v => setFormData({ ...formData, paymentTerms: v })} disabled={modalMode === "view"} placeholder="e.g., Net 30, Advance 50%" />
                      <FormField label="Preferred Currency" value={formData.preferredCurrency} onChange={v => setFormData({ ...formData, preferredCurrency: v })} disabled={modalMode === "view"} />
                      <FormField label="Company Reg Number" value={formData.companyRegNumber} onChange={v => setFormData({ ...formData, companyRegNumber: v })} disabled={modalMode === "view"} />
                      <FormField label="GST Number / VAT" value={formData.gstNumber} onChange={v => setFormData({ ...formData, gstNumber: v })} disabled={modalMode === "view"} />
                      <FormField label="PAN / Tax ID" value={formData.panNumber} onChange={v => setFormData({ ...formData, panNumber: v })} disabled={modalMode === "view"} />
                    </div>
                  </div>
                )}

                {activeTab === 2 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in">
                    {/* Billing */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-text-light-tertiary flex items-center gap-2"><MapPin className="w-4 h-4" /> Billing Address</h3>
                      <div className="space-y-4">
                        <FormField label="Street Address" value={formData.address} onChange={v => setFormData({ ...formData, address: v })} disabled={modalMode === "view"} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField label="City" value={formData.city} onChange={v => setFormData({ ...formData, city: v })} disabled={modalMode === "view"} />
                          <FormField label="State / Province" value={formData.state} onChange={v => setFormData({ ...formData, state: v })} disabled={modalMode === "view"} />
                          <FormField label="Country" value={formData.country} onChange={v => setFormData({ ...formData, country: v })} disabled={modalMode === "view"} />
                          <FormField label="Pincode / ZIP" value={formData.pincode} onChange={v => setFormData({ ...formData, pincode: v })} disabled={modalMode === "view"} />
                        </div>
                      </div>
                    </div>

                    {/* Shipping */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-text-light-tertiary flex items-center gap-2"><Globe className="w-4 h-4" /> Shipping Address</h3>
                        {modalMode !== "view" && (
                          <button onClick={() => setFormData({ ...formData, shippingAddress: { address: formData.address, city: formData.city, state: formData.state, country: formData.country, pincode: formData.pincode } })} className="text-[10px] text-primary-600 font-medium hover:underline bg-primary-50 px-2 py-1 rounded">Copy Billing</button>
                        )}
                      </div>
                      <div className="space-y-4">
                        <FormField label="Street Address" value={formData.shippingAddress.address} onChange={v => setFormData({ ...formData, shippingAddress: { ...formData.shippingAddress, address: v } })} disabled={modalMode === "view"} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField label="City" value={formData.shippingAddress.city} onChange={v => setFormData({ ...formData, shippingAddress: { ...formData.shippingAddress, city: v } })} disabled={modalMode === "view"} />
                          <FormField label="State / Province" value={formData.shippingAddress.state} onChange={v => setFormData({ ...formData, shippingAddress: { ...formData.shippingAddress, state: v } })} disabled={modalMode === "view"} />
                          <FormField label="Country" value={formData.shippingAddress.country} onChange={v => setFormData({ ...formData, shippingAddress: { ...formData.shippingAddress, country: v } })} disabled={modalMode === "view"} />
                          <FormField label="Pincode / ZIP" value={formData.shippingAddress.pincode} onChange={v => setFormData({ ...formData, shippingAddress: { ...formData.shippingAddress, pincode: v } })} disabled={modalMode === "view"} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 3 && (
                  <div className="space-y-5 animate-in">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-text-light-tertiary">Categorization & Meta</h3>
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="label">Status</label>
                        <select
                          disabled={modalMode === "view"}
                          className="input-field"
                          value={formData.status}
                          onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                        >
                          <option value="active">Active Customer</option>
                          <option value="lead">Lead / Prospect</option>
                          <option value="draft">Draft</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Priority Level</label>
                        <select
                          disabled={modalMode === "view"}
                          className="input-field"
                          value={formData.priority}
                          onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                        >
                          <option value="high">High Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="low">Low Priority</option>
                        </select>
                      </div>
                      <FormField label="Customer Category" value={formData.category} onChange={v => setFormData({ ...formData, category: v })} disabled={modalMode === "view"} placeholder="e.g., Corporate, Education, Govt" />
                      <FormField label="Lead Source" value={formData.leadSource} onChange={v => setFormData({ ...formData, leadSource: v })} disabled={modalMode === "view"} />
                      <FormField label="Internal Account Manager" value={formData.accountManager} onChange={v => setFormData({ ...formData, accountManager: v })} disabled={modalMode === "view"} />
                    </div>
                    <div className="mt-4">
                      <label className="label">Internal Notes / Observations</label>
                      <textarea
                        className="input-field min-h-[120px] resize-none"
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        disabled={modalMode === "view"}
                        placeholder="Private notes..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-surface-light-border dark:border-surface-dark-border bg-surface-light-secondary dark:bg-surface-dark-secondary flex justify-between items-center">
              <div className="flex gap-2 text-xs">
                {modalMode !== "view" && <span className="text-text-light-tertiary"><span className="text-danger-500">*</span> Required fields</span>}
              </div>
              <div className="flex gap-3">
                <button onClick={closeModal} className="btn-secondary">
                  {modalMode === "view" ? "Close" : "Cancel"}
                </button>
                {modalMode !== "view" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleSave("draft")} className="btn-secondary bg-warning-50 text-warning-700 border-warning-200 hover:bg-warning-100">
                      Save as Draft
                    </button>
                    <button onClick={() => handleSave()} disabled={!formData.name.trim()} className="btn-primary flex items-center gap-2">
                      <Check className="w-4 h-4" /> Save {modalMode === "edit" ? "Changes" : "Customer"}
                    </button>
                  </div>
                )}
                {modalMode === "view" && (
                  <button onClick={() => openModal("edit", formData as Customer)} className="btn-primary flex items-center gap-2">
                    <Edit3 className="w-4 h-4" /> Edit Record
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative card p-8 w-full max-w-sm animate-scale-in text-center shadow-2xl border-danger-500/30">
            <div className="w-16 h-16 rounded-full bg-danger-50 dark:bg-danger-500/10 flex items-center justify-center mx-auto mb-4 border-4 border-danger-100 dark:border-danger-500/20">
              <Trash2 className="w-8 h-8 text-danger-500" />
            </div>
            <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">Delete Customer?</h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-2">
              You are about to permanently delete <strong>{allCustomers.find(c => c.id === showDeleteConfirm)?.name}</strong>. This action cannot be undone. All associated history may be lost.
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="btn-danger flex-1 flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: string;
  hint?: string;
  placeholder?: string;
  inputClassName?: string;
}

function FormField({ label, value, onChange, disabled, type = "text", hint, placeholder, inputClassName }: FormFieldProps) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        className={cn("input-field", inputClassName)}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
      />
      {hint && <p className="text-[10px] mt-1 text-text-light-tertiary">{hint}</p>}
    </div>
  );
}