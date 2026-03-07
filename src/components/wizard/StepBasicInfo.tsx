import React from "react";
import { useEstimationStore } from "@/stores/estimationStore";
import { useDataStore } from "@/stores/dataStore";
import { useAppStore } from "@/stores/appStore";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { User, BookOpen, Hash, Calendar, FileText, Building2 } from "lucide-react";
import { cn } from "@/utils/cn";

export function StepBasicInfo() {
  const { estimation, updateEstimation, updatePricing } = useEstimationStore();
  const { customers } = useDataStore();
  const { user } = useAppStore();

  const customerOptions = [
    { value: "", label: "Select Customer..." },
    ...customers
      .filter(c => c.status === "active" || c.status === "lead")
      .map((c) => ({ value: c.id, label: `${c.name} (${c.code})` })),
  ];

  function handleCustomerChange(customerId: string) {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      // Auto-fill customer info AND pricing defaults from customer record
      updateEstimation({
        customerId,
        customerName: customer.name,
      });

      // Apply customer-specific pricing defaults if they have them set
      const pricingUpdates: Record<string, any> = {};
      if (customer.defaultMargin > 0) {
        pricingUpdates.marginPercent = customer.defaultMargin;
      }
      if (customer.defaultTaxRate > 0) {
        pricingUpdates.taxRate = customer.defaultTaxRate;
      }
      if (customer.defaultDiscount > 0) {
        pricingUpdates.volumeDiscount = customer.defaultDiscount;
      }
      if (customer.preferredCurrency && customer.preferredCurrency !== "") {
        pricingUpdates.currency = customer.preferredCurrency;
      }
      if (customer.paymentTerms && customer.paymentTerms !== "") {
        pricingUpdates.paymentTerms = customer.paymentTerms;
      }

      if (Object.keys(pricingUpdates).length > 0) {
        updatePricing(pricingUpdates);
      }
    } else {
      updateEstimation({
        customerId: "",
        customerName: "",
      });
    }
  }

  // Get selected customer details for display
  const selectedCustomer = estimation.customerId ? customers.find(c => c.id === estimation.customerId) : null;

  return (
    <div className="space-y-6 max-w-2xl animate-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Select
          label="Customer"
          value={estimation.customerId || ""}
          onChange={handleCustomerChange}
          options={customerOptions}
          tip="Select existing customer — pricing defaults will auto-fill"
        />
        <Input
          label="Customer Name"
          value={estimation.customerName}
          onChange={(e) => updateEstimation({ customerName: e.target.value })}
          placeholder="e.g., Penguin Random House"
          icon={<User className="w-4 h-4" />}
          required
          tip="Name that appears on the quotation"
        />
      </div>

      {/* Customer Defaults Applied Banner */}
      {selectedCustomer && (
        <div className="p-3.5 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
          <div className="flex items-start gap-2.5">
            <Building2 className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-green-800 dark:text-green-300">Customer Defaults Applied</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-0.5 mt-1.5 text-xs text-green-700 dark:text-green-400">
                {selectedCustomer.defaultMargin > 0 && (
                  <span>Margin: {selectedCustomer.defaultMargin}%</span>
                )}
                {selectedCustomer.defaultDiscount > 0 && (
                  <span>Discount: {selectedCustomer.defaultDiscount}%</span>
                )}
                {selectedCustomer.defaultTaxRate > 0 && (
                  <span>Tax: {selectedCustomer.defaultTaxRate}%</span>
                )}
                {selectedCustomer.preferredCurrency && (
                  <span>Currency: {selectedCustomer.preferredCurrency}</span>
                )}
                {selectedCustomer.paymentTerms && (
                  <span>Terms: {selectedCustomer.paymentTerms}</span>
                )}
                {selectedCustomer.priority && (
                  <span className={cn(
                    "capitalize font-medium",
                    selectedCustomer.priority === "high" ? "text-red-600 dark:text-red-400" :
                      selectedCustomer.priority === "medium" ? "text-amber-600 dark:text-amber-400" :
                        "text-text-light-tertiary dark:text-text-dark-tertiary"
                  )}>
                    Priority: {selectedCustomer.priority}
                  </span>
                )}
              </div>
              {(selectedCustomer.gstNumber || selectedCustomer.city) && (
                <div className="mt-1 text-[10px] text-green-600/70 dark:text-green-400/70">
                  {selectedCustomer.city && <span>{selectedCustomer.city}, {selectedCustomer.country}</span>}
                  {selectedCustomer.gstNumber && <span> • GST: {selectedCustomer.gstNumber}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Input
        label="Book / Job Title"
        value={estimation.jobTitle}
        onChange={(e) => updateEstimation({ jobTitle: e.target.value })}
        placeholder="e.g., The Complete Guide to Typography"
        icon={<BookOpen className="w-4 h-4" />}
        required
        tip="Full title of the publication"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Input
          label="Reference / PO Number"
          value={estimation.referenceNumber}
          onChange={(e) => updateEstimation({ referenceNumber: e.target.value })}
          placeholder="e.g., PO-2025-001234"
          icon={<Hash className="w-4 h-4" />}
          tip="Client's purchase order or reference"
        />
        <Input
          label="PO Number"
          value={estimation.poNumber}
          onChange={(e) => updateEstimation({ poNumber: e.target.value })}
          placeholder="Internal PO"
          icon={<FileText className="w-4 h-4" />}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Input
          label="Estimated By"
          value={estimation.estimatedBy}
          onChange={(e) => updateEstimation({ estimatedBy: e.target.value })}
          placeholder={user?.name || "Your Name"}
          icon={<User className="w-4 h-4" />}
          required
        />
        <Input
          label="Date"
          type="date"
          value={estimation.estimationDate}
          onChange={(e) => updateEstimation({ estimationDate: e.target.value })}
          icon={<Calendar className="w-4 h-4" />}
        />
      </div>
    </div>
  );
}
