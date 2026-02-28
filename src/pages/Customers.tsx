import { useState, useMemo } from "react";
import { useAppStore } from "@/stores/appStore";
import { useDataStore } from "@/stores/dataStore";
import { cn } from "@/utils/cn";
import { formatCurrency, formatDate, generateCustomerCode } from "@/utils/format";
import { downloadTextFile } from "@/utils/export";
import {
  Users, Search, Plus, Download, Upload, Eye, Edit3,
  Trash2, X, Check, Phone, Mail, MapPin, Star, ArrowLeft
} from "lucide-react";
import type { Customer } from "@/types";

const PRIORITY_DOTS: Record<string, { color: string; label: string }> = {
  high: { color: "bg-danger-500", label: "High Priority" },
  medium: { color: "bg-warning-500", label: "Medium Priority" },
  low: { color: "bg-success-500", label: "Low Priority" },
};

const MOCK_CUSTOMERS: Customer[] = [
  { id: "mock-1", code: "OUP-001", name: "Oxford University Press", contactPerson: "James Smith", email: "james@oup.com", phone: "+44 1865 556767", alternatePhone: "", city: "Oxford", country: "United Kingdom", priority: "high", isActive: true, totalOrders: 45, totalRevenue: 28500000, createdAt: "2024-01-15T10:00:00Z", updatedAt: "2024-01-15T10:00:00Z", gstNumber: "", panNumber: "", address: "", state: "", pincode: "", category: "", creditLimit: 0, paymentTerms: "", notes: "" },
  { id: "mock-2", code: "CUP-002", name: "Cambridge University Press", contactPerson: "Sarah Johnson", email: "sarah@cup.org", phone: "+44 1223 358331", alternatePhone: "", city: "Cambridge", country: "United Kingdom", priority: "high", isActive: true, totalOrders: 38, totalRevenue: 19200000, createdAt: "2024-02-20T09:00:00Z", updatedAt: "2024-02-20T09:00:00Z", gstNumber: "", panNumber: "", address: "", state: "", pincode: "", category: "", creditLimit: 0, paymentTerms: "", notes: "" },
  { id: "mock-3", code: "PEN-003", name: "Penguin Random House", contactPerson: "Mike Wilson", email: "mike@penguin.com", phone: "+1 212 782 9000", alternatePhone: "", city: "New York", country: "United States", priority: "medium", isActive: true, totalOrders: 22, totalRevenue: 12800000, createdAt: "2024-03-10T11:00:00Z", updatedAt: "2024-03-10T11:00:00Z", gstNumber: "", panNumber: "", address: "", state: "", pincode: "", category: "", creditLimit: 0, paymentTerms: "", notes: "" },
  { id: "mock-4", code: "NGS-004", name: "National Geographic Society", contactPerson: "Emily Davis", email: "emily@natgeo.com", phone: "+1 202 857 7000", alternatePhone: "", city: "Washington DC", country: "United States", priority: "medium", isActive: true, totalOrders: 8, totalRevenue: 8900000, createdAt: "2024-05-01T14:00:00Z", updatedAt: "2024-05-01T14:00:00Z", gstNumber: "", panNumber: "", address: "", state: "", pincode: "", category: "", creditLimit: 0, paymentTerms: "", notes: "" },
  { id: "mock-5", code: "HAR-005", name: "HarperCollins Publishers", contactPerson: "Tom Brown", email: "tom@harpercollins.com", phone: "+1 212 207 7000", alternatePhone: "", city: "New York", country: "United States", priority: "low", isActive: true, totalOrders: 15, totalRevenue: 7600000, createdAt: "2024-04-15T08:00:00Z", updatedAt: "2024-04-15T08:00:00Z", gstNumber: "", panNumber: "", address: "", state: "", pincode: "", category: "", creditLimit: 0, paymentTerms: "", notes: "" },
  { id: "mock-6", code: "WIL-006", name: "John Wiley & Sons", contactPerson: "Anna White", email: "anna@wiley.com", phone: "+1 201 748 6000", alternatePhone: "", city: "Hoboken", country: "United States", priority: "low", isActive: false, totalOrders: 5, totalRevenue: 1600000, createdAt: "2024-06-01T10:00:00Z", updatedAt: "2024-06-01T10:00:00Z", gstNumber: "", panNumber: "", address: "", state: "", pincode: "", category: "", creditLimit: 0, paymentTerms: "", notes: "" },
];

type CustomerFormData = {
  name: string; code: string; contactPerson: string; email: string; phone: string;
  city: string; country: string; priority: "high" | "medium" | "low";
  address: string; state: string; pincode: string; gstNumber: string;
};

const EMPTY_FORM: CustomerFormData = {
  name: "", code: "", contactPerson: "", email: "", phone: "",
  city: "", country: "", priority: "medium",
  address: "", state: "", pincode: "", gstNumber: "",
};

export function Customers() {
  const { addNotification, addActivityLog } = useAppStore();
  const { customers, addCustomer, updateCustomer, deleteCustomer, exportCustomersCSV } = useDataStore();
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>({ ...EMPTY_FORM });

  // Merge real customers with mock data (real first)
  const allCustomers = useMemo(() => {
    if (customers.length > 0) return customers;
    return MOCK_CUSTOMERS;
  }, [customers]);

  const filtered = useMemo(() => {
    let items = [...allCustomers];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(c => c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q) || c.contactPerson?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
    }
    if (priorityFilter !== "all") items = items.filter(c => c.priority === priorityFilter);
    return items;
  }, [search, priorityFilter, allCustomers]);

  const handleExport = () => {
    const csv = exportCustomersCSV();
    downloadTextFile("customers-export.csv", csv, "text/csv;charset=utf-8");
    addNotification({ type: "success", title: "Customers Exported", message: `${allCustomers.length} customers exported as CSV.`, category: "export" });
    addActivityLog({ action: "CUSTOMERS_EXPORTED", category: "customer", description: `Exported ${allCustomers.length} customers as CSV`, user: "Current User", entityType: "customer", entityId: "", level: "info" });
  };

  const handleAddCustomer = () => {
    if (!formData.name.trim()) return;
    const newCustomer = addCustomer({
      name: formData.name.trim(),
      code: formData.code.trim() || generateCustomerCode(formData.name),
      contactPerson: formData.contactPerson.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      alternatePhone: "",
      city: formData.city.trim(),
      country: formData.country.trim(),
      priority: formData.priority,
      address: formData.address.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      gstNumber: formData.gstNumber.trim(),
      panNumber: "",
      category: "",
      creditLimit: 0,
      paymentTerms: "",
      notes: "",
      isActive: true,
    });
    addNotification({ type: "success", title: "Customer Added", message: `${newCustomer.name} (${newCustomer.code}) has been added successfully.`, category: "customer" });
    addActivityLog({ action: "CUSTOMER_CREATED", category: "customer", description: `Created customer: ${newCustomer.name} (${newCustomer.code})`, user: "Current User", entityType: "customer", entityId: newCustomer.id, level: "info" });
    setShowAddModal(false);
    setFormData({ ...EMPTY_FORM });
  };

  const handleEditCustomer = () => {
    if (!editingCustomerId || !formData.name.trim()) return;
    updateCustomer(editingCustomerId, {
      name: formData.name.trim(),
      code: formData.code.trim(),
      contactPerson: formData.contactPerson.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      city: formData.city.trim(),
      country: formData.country.trim(),
      priority: formData.priority,
      address: formData.address.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      gstNumber: formData.gstNumber.trim(),
    });
    addNotification({ type: "success", title: "Customer Updated", message: `${formData.name} has been updated.`, category: "customer" });
    addActivityLog({ action: "CUSTOMER_UPDATED", category: "customer", description: `Updated customer: ${formData.name}`, user: "Current User", entityType: "customer", entityId: editingCustomerId, level: "info" });
    setShowEditModal(false);
    setEditingCustomerId(null);
    setFormData({ ...EMPTY_FORM });
  };

  const handleDeleteCustomer = (id: string) => {
    const customer = allCustomers.find(c => c.id === id);
    if (!customer) return;
    deleteCustomer(id);
    addNotification({ type: "warning", title: "Customer Deleted", message: `${customer.name} has been removed.`, category: "customer" });
    addActivityLog({ action: "CUSTOMER_DELETED", category: "customer", description: `Deleted customer: ${customer.name}`, user: "Current User", entityType: "customer", entityId: id, level: "warning" });
    setShowDeleteConfirm(null);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomerId(customer.id);
    setFormData({
      name: customer.name, code: customer.code, contactPerson: customer.contactPerson || "",
      email: customer.email || "", phone: customer.phone || "", city: customer.city || "",
      country: customer.country || "", priority: customer.priority || "medium",
      address: customer.address || "", state: customer.state || "",
      pincode: customer.pincode || "", gstNumber: customer.gstNumber || "",
    });
    setShowEditModal(true);
  };

  const openView = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowViewModal(true);
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
            <Users className="w-6 h-6" /> Customers
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            {allCustomers.length} customers • {allCustomers.filter(c => c.isActive).length} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary text-sm flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => { setFormData({ ...EMPTY_FORM }); setShowAddModal(true); }} className="btn-primary text-sm flex items-center gap-1.5">
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
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 text-text-light-tertiary dark:text-text-dark-tertiary mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">No customers found</h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            {search ? `No results for "${search}"` : "Add your first customer to get started."}
          </p>
        </div>
      ) : (
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
                {customer.contactPerson && (
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-text-light-tertiary dark:text-text-dark-tertiary shrink-0" />
                    {customer.contactPerson}
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-text-light-tertiary dark:text-text-dark-tertiary shrink-0" />
                    {customer.email}
                  </div>
                )}
                {(customer.city || customer.country) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-text-light-tertiary dark:text-text-dark-tertiary shrink-0" />
                    {[customer.city, customer.country].filter(Boolean).join(", ")}
                  </div>
                )}
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
                  <button onClick={() => openView(customer)} className="p-1.5 rounded-lg hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary" title="View Details">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => openEdit(customer)} className="p-1.5 rounded-lg hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary" title="Edit">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setShowDeleteConfirm(customer.id)} className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10" title="Delete">
                    <Trash2 className="w-3.5 h-3.5 text-danger-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <CustomerFormModal
          title="Add Customer"
          formData={formData}
          setFormData={setFormData}
          onSave={handleAddCustomer}
          onClose={() => setShowAddModal(false)}
          saveLabel="Add Customer"
        />
      )}

      {/* Edit Customer Modal */}
      {showEditModal && (
        <CustomerFormModal
          title="Edit Customer"
          formData={formData}
          setFormData={setFormData}
          onSave={handleEditCustomer}
          onClose={() => { setShowEditModal(false); setEditingCustomerId(null); }}
          saveLabel="Save Changes"
        />
      )}

      {/* View Customer Modal */}
      {showViewModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowViewModal(false)} />
          <div className="relative card p-6 w-full max-w-lg animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">Customer Details</h2>
              <button onClick={() => setShowViewModal(false)} className="p-1 hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 pb-3 border-b border-surface-light-border dark:border-surface-dark-border">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">
                  {selectedCustomer.name?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-text-light-primary dark:text-text-dark-primary text-lg">{selectedCustomer.name}</h3>
                  <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary font-mono">{selectedCustomer.code}</p>
                </div>
              </div>
              <DetailRow label="Contact Person" value={selectedCustomer.contactPerson || "—"} />
              <DetailRow label="Email" value={selectedCustomer.email || "—"} />
              <DetailRow label="Phone" value={selectedCustomer.phone || "—"} />
              <DetailRow label="Address" value={selectedCustomer.address || "—"} />
              <DetailRow label="City" value={selectedCustomer.city || "—"} />
              <DetailRow label="Country" value={selectedCustomer.country || "—"} />
              <DetailRow label="GST Number" value={selectedCustomer.gstNumber || "—"} />
              <DetailRow label="Priority" value={selectedCustomer.priority || "medium"} />
              <DetailRow label="Total Orders" value={String(selectedCustomer.totalOrders || 0)} />
              <DetailRow label="Total Revenue" value={formatCurrency(selectedCustomer.totalRevenue || 0)} />
              <DetailRow label="Created" value={formatDate(selectedCustomer.createdAt)} />
              <DetailRow label="Status" value={selectedCustomer.isActive ? "Active" : "Inactive"} />
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-surface-light-border dark:border-surface-dark-border">
              <button onClick={() => { setShowViewModal(false); openEdit(selectedCustomer); }} className="btn-secondary flex items-center gap-1.5">
                <Edit3 className="w-4 h-4" /> Edit
              </button>
              <button onClick={() => setShowViewModal(false)} className="btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative card p-6 w-full max-w-sm animate-scale-in text-center">
            <Trash2 className="w-12 h-12 text-danger-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">Delete Customer?</h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-2">
              This action cannot be undone. The customer "{allCustomers.find(c => c.id === showDeleteConfirm)?.name}" will be permanently removed.
            </p>
            <div className="flex justify-center gap-3 mt-5">
              <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleDeleteCustomer(showDeleteConfirm)} className="btn-danger flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerFormModal({ title, formData, setFormData, onSave, onClose, saveLabel }: {
  title: string;
  formData: CustomerFormData;
  setFormData: (data: CustomerFormData) => void;
  onSave: () => void;
  onClose: () => void;
  saveLabel: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative card p-6 w-full max-w-lg animate-scale-in max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-4">{title}</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Customer Name <span className="text-danger-500">*</span></label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" placeholder="Company name" />
            </div>
            <div>
              <label className="label">Customer Code</label>
              <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="input-field" placeholder="Auto-generated if empty" />
              <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary mt-1">Leave empty for auto code</p>
            </div>
          </div>
          <div><label className="label">Contact Person</label><input type="text" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} className="input-field" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input-field" /></div>
            <div><label className="label">Phone</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input-field" /></div>
          </div>
          <div><label className="label">Address</label><input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input-field" /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">City</label><input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="input-field" /></div>
            <div><label className="label">State</label><input type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="input-field" /></div>
            <div><label className="label">Country</label><input type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="input-field" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">GST Number</label><input type="text" value={formData.gstNumber} onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })} className="input-field" /></div>
            <div><label className="label">Pincode</label><input type="text" value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} className="input-field" /></div>
          </div>
          <div>
            <label className="label">Priority</label>
            <div className="flex gap-3">
              {(["high", "medium", "low"] as const).map(p => (
                <button key={p} onClick={() => setFormData({ ...formData, priority: p })} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm capitalize transition-all", formData.priority === p ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10" : "border-surface-light-border dark:border-surface-dark-border")}>
                  <div className={cn("w-3 h-3 rounded-full", PRIORITY_DOTS[p].color)} />
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-surface-light-border dark:border-surface-dark-border">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={onSave} disabled={!formData.name.trim()} className="btn-primary disabled:opacity-40">{saveLabel}</button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-text-light-tertiary dark:text-text-dark-tertiary">{label}</span>
      <span className="font-medium text-text-light-primary dark:text-text-dark-primary capitalize">{value}</span>
    </div>
  );
}