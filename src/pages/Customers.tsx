import { useState, useMemo } from "react";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import { formatCurrency, formatDate, generateCustomerCode } from "@/utils/format";
import {
  Users, Search, Plus, Download, Upload, Eye, Edit3,
  Trash2, X, Check, Phone, Mail, MapPin, Star
} from "lucide-react";
import type { Customer } from "@/types";

const PRIORITY_DOTS: Record<string, { color: string; label: string }> = {
  high: { color: "bg-danger-500", label: "High Priority" },
  medium: { color: "bg-warning-500", label: "Medium Priority" },
  low: { color: "bg-success-500", label: "Low Priority" },
};

const MOCK_CUSTOMERS: Partial<Customer>[] = [
  { id: "1", code: "OUP-001", name: "Oxford University Press", contactPerson: "James Smith", email: "james@oup.com", phone: "+44 1865 556767", city: "Oxford", country: "United Kingdom", priority: "high", isActive: true, totalOrders: 45, totalRevenue: 28500000, createdAt: "2024-01-15T10:00:00Z" },
  { id: "2", code: "CUP-002", name: "Cambridge University Press", contactPerson: "Sarah Johnson", email: "sarah@cup.org", phone: "+44 1223 358331", city: "Cambridge", country: "United Kingdom", priority: "high", isActive: true, totalOrders: 38, totalRevenue: 19200000, createdAt: "2024-02-20T09:00:00Z" },
  { id: "3", code: "PEN-003", name: "Penguin Random House", contactPerson: "Mike Wilson", email: "mike@penguin.com", phone: "+1 212 782 9000", city: "New York", country: "United States", priority: "medium", isActive: true, totalOrders: 22, totalRevenue: 12800000, createdAt: "2024-03-10T11:00:00Z" },
  { id: "4", code: "NGS-004", name: "National Geographic Society", contactPerson: "Emily Davis", email: "emily@natgeo.com", phone: "+1 202 857 7000", city: "Washington DC", country: "United States", priority: "medium", isActive: true, totalOrders: 8, totalRevenue: 8900000, createdAt: "2024-05-01T14:00:00Z" },
  { id: "5", code: "HAR-005", name: "HarperCollins Publishers", contactPerson: "Tom Brown", email: "tom@harpercollins.com", phone: "+1 212 207 7000", city: "New York", country: "United States", priority: "low", isActive: true, totalOrders: 15, totalRevenue: 7600000, createdAt: "2024-04-15T08:00:00Z" },
  { id: "6", code: "WIL-006", name: "John Wiley & Sons", contactPerson: "Anna White", email: "anna@wiley.com", phone: "+1 201 748 6000", city: "Hoboken", country: "United States", priority: "low", isActive: false, totalOrders: 5, totalRevenue: 1600000, createdAt: "2024-06-01T10:00:00Z" },
];

export function Customers() {
  const { addNotification } = useAppStore();
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "", code: "", contactPerson: "", email: "", phone: "",
    city: "", country: "", priority: "medium" as "high" | "medium" | "low",
  });

  const filtered = useMemo(() => {
    let items = [...MOCK_CUSTOMERS];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(c => c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q) || c.contactPerson?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
    }
    if (priorityFilter !== "all") items = items.filter(c => c.priority === priorityFilter);
    return items;
  }, [search, priorityFilter]);

  const handleExport = () => {
    addNotification({ type: "success", title: "Customers Exported", message: "Customer data exported as CSV.", category: "export" });
  };

  const handleAddCustomer = () => {
    if (!newCustomer.name.trim()) return;
    const code = newCustomer.code.trim() || generateCustomerCode(newCustomer.name);
    addNotification({ type: "success", title: "Customer Added", message: `${newCustomer.name} (${code}) has been added.`, category: "customer" });
    setShowAddModal(false);
    setNewCustomer({ name: "", code: "", contactPerson: "", email: "", phone: "", city: "", country: "", priority: "medium" });
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
            <Users className="w-6 h-6" /> Customers
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            {MOCK_CUSTOMERS.length} customers • {MOCK_CUSTOMERS.filter(c => c.isActive).length} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary text-sm flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light-tertiary" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." className="input-field pl-9" />
        </div>
        <div className="flex items-center gap-1.5">
          {["all", "high", "medium", "low"].map(p => (
            <button key={p} onClick={() => setPriorityFilter(p)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize flex items-center gap-1.5", priorityFilter === p ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400" : "border-surface-light-border dark:border-surface-dark-border")}>
              {p !== "all" && <div className={cn("w-2 h-2 rounded-full", PRIORITY_DOTS[p]?.color)} />}
              {p === "all" ? "All" : p}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(customer => (
          <div key={customer.id} className="card p-5 hover:shadow-elevated-light dark:hover:shadow-elevated-dark transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold">
                  {customer.name?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">{customer.name}</h3>
                  <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary font-mono">{customer.code}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={cn("w-2.5 h-2.5 rounded-full", PRIORITY_DOTS[customer.priority || "medium"]?.color)} title={PRIORITY_DOTS[customer.priority || "medium"]?.label} />
                {!customer.isActive && <span className="badge-danger text-[9px]">Inactive</span>}
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-text-light-secondary dark:text-text-dark-secondary mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-text-light-tertiary dark:text-text-dark-tertiary shrink-0" />
                {customer.contactPerson}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-text-light-tertiary dark:text-text-dark-tertiary shrink-0" />
                {customer.email}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-text-light-tertiary dark:text-text-dark-tertiary shrink-0" />
                {customer.city}, {customer.country}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-surface-light-border dark:border-surface-dark-border">
              <div>
                <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">Total Revenue</p>
                <p className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">{formatCurrency(customer.totalRevenue || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">Orders</p>
                <p className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">{customer.totalOrders}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 rounded-lg hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary"><Eye className="w-3.5 h-3.5" /></button>
                <button className="p-1.5 rounded-lg hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary"><Edit3 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="relative card p-6 w-full max-w-lg animate-scale-in">
            <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-4">Add Customer</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Customer Name <span className="text-danger-500">*</span></label>
                  <input type="text" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} className="input-field" placeholder="Company name" />
                </div>
                <div>
                  <label className="label">Customer Code</label>
                  <input type="text" value={newCustomer.code} onChange={(e) => setNewCustomer({ ...newCustomer, code: e.target.value })} className="input-field" placeholder="Auto-generated if empty" />
                  <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary mt-1">Leave empty for auto code</p>
                </div>
              </div>
              <div><label className="label">Contact Person</label><input type="text" value={newCustomer.contactPerson} onChange={(e) => setNewCustomer({ ...newCustomer, contactPerson: e.target.value })} className="input-field" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Email</label><input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} className="input-field" /></div>
                <div><label className="label">Phone</label><input type="tel" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">City</label><input type="text" value={newCustomer.city} onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })} className="input-field" /></div>
                <div><label className="label">Country</label><input type="text" value={newCustomer.country} onChange={(e) => setNewCustomer({ ...newCustomer, country: e.target.value })} className="input-field" /></div>
              </div>
              <div>
                <label className="label">Priority</label>
                <div className="flex gap-3">
                  {(["high", "medium", "low"] as const).map(p => (
                    <button key={p} onClick={() => setNewCustomer({ ...newCustomer, priority: p })} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm capitalize transition-all", newCustomer.priority === p ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10" : "border-surface-light-border dark:border-surface-dark-border")}>
                      <div className={cn("w-3 h-3 rounded-full", PRIORITY_DOTS[p].color)} />
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-surface-light-border dark:border-surface-dark-border">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleAddCustomer} disabled={!newCustomer.name.trim()} className="btn-primary disabled:opacity-40">Save Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}