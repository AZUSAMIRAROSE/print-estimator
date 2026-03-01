import React from "react";
import { useEstimationStore } from "@/stores/estimationStore";
import { useDataStore } from "@/stores/dataStore";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { User, BookOpen, Hash, Calendar, FileText } from "lucide-react";

export function StepBasicInfo() {
  const { estimation, updateEstimation } = useEstimationStore();
  const { customers } = useDataStore();

  const customerOptions = [
    { value: "", label: "Select Customer..." },
    ...customers.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` })),
  ];

  function handleCustomerChange(customerId: string) {
    const customer = customers.find((c) => c.id === customerId);
    updateEstimation({
      customerId,
      customerName: customer?.name || "",
    });
  }

  return (
    <div className="space-y-6 max-w-2xl animate-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Select
          label="Customer"
          value={estimation.customerId || ""}
          onChange={handleCustomerChange}
          options={customerOptions}
          tip="Select existing customer or type a new name"
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
          placeholder="Your Name"
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
