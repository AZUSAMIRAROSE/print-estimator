import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { useDataStore } from "@/stores/dataStore";
import { cn } from "@/utils/cn";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/format";
import { buildEstimationCsv, downloadTextFile } from "@/utils/export";
import type { EstimationInput, EstimationResult } from "@/types";
import {
  ArrowLeft, Download, FileText, Printer as PrinterIcon, Save,
  FileCheck, BarChart3, PieChart, TrendingUp, Package, Truck,
  BookMarked, Sparkles, Layers, DollarSign, Weight, Box,
  ChevronDown, ChevronUp, ExternalLink, Copy
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RechartsPie, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

interface Props {
  estimation: EstimationInput;
  results: EstimationResult[];
  spineThickness: number;
  onBackToWizard: () => void;
}

const COST_COLORS = [
  "#3b82f6", "#8b5cf6", "#22c55e", "#f59e0b",
  "#ef4444", "#06b6d4", "#ec4899", "#64748b"
];

export function EstimationResults({ estimation, results, spineThickness, onBackToWizard }: Props) {
  const navigate = useNavigate();
  const { addNotification, addActivityLog, theme } = useAppStore();
  const { addJob, addQuotation } = useDataStore();
  const [activeTab, setActiveTab] = useState<"summary" | "breakdown" | "comparison" | "detailed">("summary");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["paper", "printing"]));
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const primaryResult = results[0];
  if (!primaryResult) return null;

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Build pie chart data
  const costBreakdown = [
    { name: "Paper", value: primaryResult.totalPaperCost, color: COST_COLORS[0] },
    { name: "Printing", value: primaryResult.totalPrintingCost, color: COST_COLORS[1] },
    { name: "CTP", value: primaryResult.totalCTPCost, color: COST_COLORS[2] },
    { name: "Binding", value: primaryResult.bindingCost, color: COST_COLORS[3] },
    { name: "Finishing", value: primaryResult.finishingCost, color: COST_COLORS[4] },
    { name: "Packing", value: primaryResult.packingCost, color: COST_COLORS[5] },
    { name: "Freight", value: primaryResult.freightCost, color: COST_COLORS[6] },
    { name: "Other", value: primaryResult.prePressCost + primaryResult.additionalCost, color: COST_COLORS[7] },
  ].filter(c => c.value > 0);

  // Quantity comparison data
  const comparisonData = results.map(r => ({
    quantity: formatNumber(r.quantity),
    totalCost: r.totalProductionCost,
    costPerCopy: r.totalCostPerCopy,
    sellingPrice: r.sellingPricePerCopy,
    foreignPrice: r.sellingPriceForeignCurrency,
  }));

  // Per-copy savings between quantities
  const savingsData = results.map((r, i) => ({
    quantity: formatNumber(r.quantity),
    costPerCopy: r.totalCostPerCopy,
    savings: i > 0 ? ((results[0].totalCostPerCopy - r.totalCostPerCopy) / results[0].totalCostPerCopy * 100) : 0,
  }));

  const handleExport = () => {
    const csv = buildEstimationCsv(estimation, results);
    const title = (estimation.jobTitle || "estimate").replace(/[^a-z0-9-_]/gi, "_").toLowerCase();
    downloadTextFile(`${title}-report.csv`, csv, "text/csv;charset=utf-8");
    setLiveMessage("CSV export generated.");
    addNotification({
      type: "success",
      title: "Export Generated",
      message: "Estimation report has been exported as CSV.",
      category: "export",
    });
  };

  const handlePrint = () => {
    window.print();
    setLiveMessage("Print dialog opened.");
    addActivityLog({
      action: "REPORT_PRINTED",
      category: "estimation",
      description: `Estimation report printed for "${estimation.jobTitle}"`,
      user: "Current User",
      entityType: "estimation",
      entityId: estimation.id,
      level: "info",
    });
  };

  const handleGeneratePDF = () => {
    const html = printRef.current?.innerHTML;
    if (html) {
      const pdfWindow = window.open("", "_blank", "width=1024,height=768");
      if (pdfWindow) {
        pdfWindow.document.write(`
          <html>
            <head>
              <title>${estimation.jobTitle || "Estimate"} - PDF</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 16px; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 6px; font-size: 12px; }
              </style>
            </head>
            <body>${html}</body>
          </html>
        `);
        pdfWindow.document.close();
        pdfWindow.focus();
        pdfWindow.print();
      }
    }
    setLiveMessage("PDF print view opened.");
    addNotification({
      type: "success",
      title: "PDF Generated",
      message: `PDF print view opened for "${estimation.jobTitle}"`,
      category: "export",
    });
  };

  const handleSave = () => {
    const savedJob = addJob({
      title: estimation.jobTitle || "Untitled Job",
      customerId: estimation.customerId || "",
      customerName: estimation.customerName || "Unknown Customer",
      estimationId: estimation.id,
      status: "estimated",
      quantities: results.map((r) => r.quantity),
      results,
      bookSpec: estimation.bookSpec,
      totalValue: primaryResult.grandTotal,
      currency: estimation.pricing.currency,
      assignedTo: estimation.estimatedBy || "Current User",
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      notes: estimation.notes || "",
      tags: [],
    });

    setLiveMessage(`Job ${savedJob.jobNumber} saved.`);
    addNotification({
      type: "success",
      title: "Estimation Saved",
      message: `Job "${savedJob.title}" has been saved successfully.`,
      category: "job",
      actionUrl: "/jobs",
    });
    addActivityLog({
      action: "JOB_SAVED",
      category: "job",
      description: `Job saved: "${estimation.jobTitle}" — ${results.map(r => formatNumber(r.quantity)).join(", ")} copies`,
      user: "Current User",
      entityType: "job",
      entityId: estimation.id,
      level: "info",
    });
  };

  const handleCreateQuotation = () => {
    setShowQuotationModal(true);
  };

  const handleSaveQuotation = () => {
    const newQuotation = addQuotation({
      jobId: estimation.id,
      jobTitle: estimation.jobTitle || "Untitled Job",
      customerId: estimation.customerId || "",
      customerName: estimation.customerName || "Unknown Customer",
      status: "draft",
      quantities: results.map((r) => r.quantity),
      results,
      currency: estimation.pricing.currency,
      exchangeRate: estimation.pricing.exchangeRate,
      validityDays: estimation.pricing.quotationValidity,
      validUntil: new Date(Date.now() + estimation.pricing.quotationValidity * 24 * 60 * 60 * 1000).toISOString(),
      paymentTerms: estimation.pricing.paymentTerms,
      deliveryTerms: `${estimation.delivery.deliveryType.toUpperCase()} ${estimation.delivery.freightMode}`,
      notes: estimation.notes || "",
      termsAndConditions: "Subject to final artwork approval and raw material availability.",
      comments: [],
      revisionNumber: 0,
    });

    setShowQuotationModal(false);
    setLiveMessage(`Quotation ${newQuotation.quotationNumber} created.`);
    addNotification({
      type: "success",
      title: "Quotation Created",
      message: `Quotation ${newQuotation.quotationNumber} created and saved.`,
      category: "quotation",
      actionUrl: "/quotations",
    });
    addActivityLog({
      action: "QUOTATION_CREATED",
      category: "quotation",
      description: `Quotation created for "${estimation.jobTitle}"`,
      user: "Current User",
      entityType: "quotation",
      entityId: estimation.id,
      level: "info",
    });
  };

  return (
    <div className="space-y-6 animate-in" ref={printRef}>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{liveMessage}</div>
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBackToWizard} className="btn-secondary flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back to Wizard
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
              Estimation Results
            </h1>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              {estimation.jobTitle || "Untitled"} — {estimation.customerName || "No customer"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={handleGeneratePDF} className="btn-secondary flex items-center gap-1.5 text-sm">
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button onClick={handlePrint} className="btn-secondary flex items-center gap-1.5 text-sm">
            <PrinterIcon className="w-4 h-4" /> Print
          </button>
          <button onClick={handleSave} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Save className="w-4 h-4" /> Save Job
          </button>
          <button onClick={handleCreateQuotation} className="btn-primary flex items-center gap-1.5 text-sm">
            <FileCheck className="w-4 h-4" /> Create Quotation
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {results.map((r) => (
          <div key={r.quantity} className="card p-4 text-center">
            <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary uppercase font-medium">
              {formatNumber(r.quantity)} copies
            </p>
            <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mt-1">
              {estimation.pricing.currency !== "INR" ? (
                <>
                  {formatCurrency(r.sellingPriceForeignCurrency, estimation.pricing.currency, 3)}
                  <span className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary block">
                    /copy
                  </span>
                </>
              ) : (
                <>
                  {formatCurrency(r.sellingPricePerCopy)}
                  <span className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary block">
                    /copy
                  </span>
                </>
              )}
            </p>
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
              Total: {formatCurrency(r.grandTotal)}
            </p>
          </div>
        ))}
        {/* Spine & Weight */}
        <div className="card p-4 text-center">
          <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary uppercase font-medium">Spine</p>
          <p className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary mt-1">
            {spineThickness.toFixed(2)}mm
          </p>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Book: {(primaryResult.weightPerBook).toFixed(0)}g
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-xl w-fit">
        {([
          { key: "summary", label: "Summary", icon: <BarChart3 className="w-4 h-4" /> },
          { key: "breakdown", label: "Cost Breakdown", icon: <PieChart className="w-4 h-4" /> },
          { key: "comparison", label: "Qty Comparison", icon: <TrendingUp className="w-4 h-4" /> },
          { key: "detailed", label: "Detailed Report", icon: <FileText className="w-4 h-4" /> },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setLiveMessage(`${tab.label} tab selected.`);
            }}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.key
                ? "bg-white dark:bg-surface-dark-secondary text-primary-700 dark:text-primary-400 shadow-sm"
                : "text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "summary" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in">
          {/* Cost Pie Chart */}
          <div className="card p-5 min-w-0">
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
              Cost Distribution — {formatNumber(primaryResult.quantity)} copies
            </h3>
            <div className="h-64 min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                <RechartsPie>
                  <Pie
                    data={costBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {costBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === "dark" ? "#1e293b" : "#fff",
                      border: `1px solid ${theme === "dark" ? "#475569" : "#e2e8f0"}`,
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [formatCurrency(value as number), "Cost"]}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {costBreakdown.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs p-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-text-light-secondary dark:text-text-dark-secondary">{item.name}</span>
                  </div>
                  <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    {formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Figures */}
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
                Key Figures — {formatNumber(primaryResult.quantity)} copies
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Total Production Cost", value: formatCurrency(primaryResult.totalProductionCost), sub: `${formatCurrency(primaryResult.totalCostPerCopy)}/copy` },
                  { label: "Selling Price (INR)", value: formatCurrency(primaryResult.totalSellingPrice), sub: `${formatCurrency(primaryResult.sellingPricePerCopy)}/copy` },
                  ...(estimation.pricing.currency !== "INR" ? [
                    { label: `Selling Price (${estimation.pricing.currency})`, value: formatCurrency(primaryResult.totalSellingPriceForeign, estimation.pricing.currency), sub: `${formatCurrency(primaryResult.sellingPriceForeignCurrency, estimation.pricing.currency, 3)}/copy` },
                  ] : []),
                  { label: "Margin", value: formatCurrency(primaryResult.marginAmount), sub: `${estimation.pricing.marginPercent}%` },
                  { label: "Tax", value: formatCurrency(primaryResult.taxAmount), sub: `${estimation.pricing.taxRate}%` },
                  { label: "Grand Total", value: formatCurrency(primaryResult.grandTotal), sub: "", highlight: true },
                ].map((row) => (
                  <div key={row.label} className={cn(
                    "flex items-center justify-between py-2",
                    row.highlight ? "border-t-2 border-primary-500 pt-3" : "border-t border-surface-light-border dark:border-surface-dark-border"
                  )}>
                    <span className={cn(
                      "text-sm",
                      row.highlight ? "font-bold text-text-light-primary dark:text-text-dark-primary" : "text-text-light-secondary dark:text-text-dark-secondary"
                    )}>
                      {row.label}
                    </span>
                    <div className="text-right">
                      <span className={cn(
                        "text-sm font-semibold",
                        row.highlight ? "text-primary-600 dark:text-primary-400 text-base" : "text-text-light-primary dark:text-text-dark-primary"
                      )}>
                        {row.value}
                      </span>
                      {row.sub && (
                        <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">{row.sub}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Production Metrics */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
                Production Metrics
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <MetricBox label="TPH" value={`₹${formatNumber(primaryResult.tph)}`} sub="Throughput/hr" icon={<TrendingUp className="w-4 h-4" />} />
                <MetricBox label="Machine Hours" value={primaryResult.totalMachineHours.toFixed(1)} sub="hours" icon={<PrinterIcon className="w-4 h-4" />} />
                <MetricBox label="Book Weight" value={`${primaryResult.weightPerBook.toFixed(0)}g`} sub="per copy" icon={<Weight className="w-4 h-4" />} />
                <MetricBox label="Total Weight" value={`${(primaryResult.totalWeight).toFixed(0)}kg`} sub={`${formatNumber(primaryResult.quantity)} copies`} icon={<Package className="w-4 h-4" />} />
                <MetricBox label="Books/Carton" value={formatNumber(primaryResult.booksPerCarton)} sub={`${formatNumber(primaryResult.totalCartons)} cartons`} icon={<Box className="w-4 h-4" />} />
                <MetricBox label="Pallets" value={formatNumber(primaryResult.totalPallets)} sub="total" icon={<Layers className="w-4 h-4" />} />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "breakdown" && (
        <div className="space-y-3 animate-in">
          {/* Collapsible sections */}
          <BreakdownSection
            title="Paper Costs"
            icon={<Layers className="w-4 h-4" />}
            total={primaryResult.totalPaperCost}
            expanded={expandedSections.has("paper")}
            onToggle={() => toggleSection("paper")}
          >
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-surface-light-border dark:border-surface-dark-border">
                  <th className="py-2 text-left font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Section</th>
                  <th className="py-2 text-left font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Paper</th>
                  <th className="py-2 text-right font-medium text-text-light-tertiary dark:text-text-dark-tertiary">GSM</th>
                  <th className="py-2 text-right font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Forms</th>
                  <th className="py-2 text-right font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Ups</th>
                  <th className="py-2 text-right font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Net Sht</th>
                  <th className="py-2 text-right font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Waste</th>
                  <th className="py-2 text-right font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Gross</th>
                  <th className="py-2 text-right font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Reams</th>
                  <th className="py-2 text-right font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Rate/Ream</th>
                  <th className="py-2 text-right font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Cost</th>
                </tr>
              </thead>
              <tbody>
                {primaryResult.paperCosts.map((pc, i) => (
                  <tr key={i} className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50">
                    <td className="py-2 font-medium text-text-light-primary dark:text-text-dark-primary">{pc.sectionName}</td>
                    <td className="py-2 text-text-light-secondary dark:text-text-dark-secondary">{pc.paperType}</td>
                    <td className="py-2 text-right text-text-light-secondary dark:text-text-dark-secondary">{pc.gsm}</td>
                    <td className="py-2 text-right">{pc.numberOfForms}</td>
                    <td className="py-2 text-right">{pc.ups}</td>
                    <td className="py-2 text-right">{formatNumber(pc.netSheets)}</td>
                    <td className="py-2 text-right text-amber-600 dark:text-amber-400">{formatNumber(pc.wastageSheets)}</td>
                    <td className="py-2 text-right font-medium">{formatNumber(pc.grossSheets)}</td>
                    <td className="py-2 text-right">{pc.reams.toFixed(1)}</td>
                    <td className="py-2 text-right">{formatCurrency(pc.ratePerReam)}</td>
                    <td className="py-2 text-right font-semibold text-text-light-primary dark:text-text-dark-primary">{formatCurrency(pc.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={10} className="py-2 text-right text-text-light-primary dark:text-text-dark-primary">Total Paper:</td>
                  <td className="py-2 text-right text-primary-600 dark:text-primary-400">{formatCurrency(primaryResult.totalPaperCost)}</td>
                </tr>
              </tfoot>
            </table>
          </BreakdownSection>

          <BreakdownSection
            title="Printing Costs"
            icon={<PrinterIcon className="w-4 h-4" />}
            total={primaryResult.totalPrintingCost}
            expanded={expandedSections.has("printing")}
            onToggle={() => toggleSection("printing")}
          >
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-surface-light-border dark:border-surface-dark-border">
                  <th className="py-2 text-left font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Section</th>
                  <th className="py-2 text-left font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Machine</th>
                  <th className="py-2 text-right font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Plates</th>
                  <th className="py-2 text-right font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Imp/Form</th>
                  <th className="py-2 text-right font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Total Imp</th>
                  <th className="py-2 text-right font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Rate/1K</th>
                  <th className="py-2 text-right font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Print Cost</th>
                  <th className="py-2 text-right font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Make Ready</th>
                  <th className="py-2 text-right font-medium text-text-light-tertiary dark:text-text-dark-tertiary">Total</th>
                </tr>
              </thead>
              <tbody>
                {primaryResult.printingCosts.map((pc, i) => (
                  <tr key={i} className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50">
                    <td className="py-2 font-medium text-text-light-primary dark:text-text-dark-primary">{pc.sectionName}</td>
                    <td className="py-2 text-text-light-secondary dark:text-text-dark-secondary">{pc.machineName}</td>
                    <td className="py-2 text-right">{pc.totalPlates}</td>
                    <td className="py-2 text-right">{formatNumber(pc.impressionsPerForm)}</td>
                    <td className="py-2 text-right">{formatNumber(pc.totalImpressions)}</td>
                    <td className="py-2 text-right">{formatCurrency(pc.ratePer1000)}</td>
                    <td className="py-2 text-right">{formatCurrency(pc.printingCost)}</td>
                    <td className="py-2 text-right">{formatCurrency(pc.makeReadyCost)}</td>
                    <td className="py-2 text-right font-semibold">{formatCurrency(pc.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={8} className="py-2 text-right">Total Printing:</td>
                  <td className="py-2 text-right text-primary-600 dark:text-primary-400">{formatCurrency(primaryResult.totalPrintingCost)}</td>
                </tr>
              </tfoot>
            </table>
          </BreakdownSection>

          <BreakdownSection
            title="CTP / Plates"
            icon={<Copy className="w-4 h-4" />}
            total={primaryResult.totalCTPCost}
            expanded={expandedSections.has("ctp")}
            onToggle={() => toggleSection("ctp")}
          >
            <div className="space-y-2">
              {primaryResult.ctpCosts.map((c, i) => (
                <div key={i} className="flex justify-between text-sm p-2 bg-surface-light-secondary dark:bg-surface-dark-tertiary rounded-lg">
                  <span>{c.sectionName} — {c.totalPlates} plates × {formatCurrency(c.ratePerPlate)}</span>
                  <span className="font-semibold">{formatCurrency(c.totalCost)}</span>
                </div>
              ))}
            </div>
          </BreakdownSection>

          <BreakdownSection title="Binding" icon={<BookMarked className="w-4 h-4" />} total={primaryResult.bindingCost} expanded={expandedSections.has("binding")} onToggle={() => toggleSection("binding")}>
            <div className="space-y-1.5">
              {Object.entries(primaryResult.bindingBreakdown).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm py-1">
                  <span className="text-text-light-secondary dark:text-text-dark-secondary">{key}</span>
                  <span className="font-medium">{formatCurrency(value)}</span>
                </div>
              ))}
            </div>
          </BreakdownSection>

          <BreakdownSection title="Finishing" icon={<Sparkles className="w-4 h-4" />} total={primaryResult.finishingCost} expanded={expandedSections.has("finishing")} onToggle={() => toggleSection("finishing")}>
            <div className="space-y-1.5">
              {Object.entries(primaryResult.finishingBreakdown).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm py-1">
                  <span className="text-text-light-secondary dark:text-text-dark-secondary">{key}</span>
                  <span className="font-medium">{formatCurrency(value)}</span>
                </div>
              ))}
              {Object.keys(primaryResult.finishingBreakdown).length === 0 && (
                <p className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary italic">No finishing applied</p>
              )}
            </div>
          </BreakdownSection>

          <BreakdownSection title="Packing" icon={<Package className="w-4 h-4" />} total={primaryResult.packingCost} expanded={expandedSections.has("packing")} onToggle={() => toggleSection("packing")}>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-text-light-tertiary dark:text-text-dark-tertiary">Books/Carton:</span> <span className="font-medium">{primaryResult.packingBreakdown.booksPerCarton}</span></div>
              <div><span className="text-text-light-tertiary dark:text-text-dark-tertiary">Total Cartons:</span> <span className="font-medium">{primaryResult.packingBreakdown.totalCartons}</span></div>
              <div><span className="text-text-light-tertiary dark:text-text-dark-tertiary">Carton Cost:</span> <span className="font-medium">{formatCurrency(primaryResult.packingBreakdown.cartonCost)}</span></div>
              <div><span className="text-text-light-tertiary dark:text-text-dark-tertiary">Pallets:</span> <span className="font-medium">{primaryResult.packingBreakdown.totalPallets}</span></div>
              <div><span className="text-text-light-tertiary dark:text-text-dark-tertiary">Pallet Cost:</span> <span className="font-medium">{formatCurrency(primaryResult.packingBreakdown.palletCost)}</span></div>
              <div><span className="text-text-light-tertiary dark:text-text-dark-tertiary">Total Weight:</span> <span className="font-medium">{formatNumber(primaryResult.packingBreakdown.totalWeight)}kg</span></div>
            </div>
          </BreakdownSection>

          <BreakdownSection title="Freight" icon={<Truck className="w-4 h-4" />} total={primaryResult.freightCost} expanded={expandedSections.has("freight")} onToggle={() => toggleSection("freight")}>
            <div className="space-y-1.5">
              {Object.entries(primaryResult.freightBreakdown).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm py-1">
                  <span className="text-text-light-secondary dark:text-text-dark-secondary">{key}</span>
                  <span className="font-medium">{formatCurrency(value)}</span>
                </div>
              ))}
            </div>
          </BreakdownSection>
        </div>
      )}

      {activeTab === "comparison" && results.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in">
          <div className="card p-5 min-w-0">
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
              Cost Per Copy Comparison
            </h3>
            <div className="h-72 min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} />
                  <XAxis dataKey="quantity" tick={{ fontSize: 12, fill: theme === "dark" ? "#94a3b8" : "#64748b" }} />
                  <YAxis tick={{ fontSize: 12, fill: theme === "dark" ? "#94a3b8" : "#64748b" }} />
                  <Tooltip contentStyle={{ backgroundColor: theme === "dark" ? "#1e293b" : "#fff", borderRadius: "8px", fontSize: "12px", border: `1px solid ${theme === "dark" ? "#475569" : "#e2e8f0"}` }} />
                  <Bar dataKey="costPerCopy" name="Cost/Copy" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sellingPrice" name="Sell/Copy" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5 min-w-0">
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
              Volume Savings
            </h3>
            <div className="h-72 min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                <BarChart data={savingsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} />
                  <XAxis dataKey="quantity" tick={{ fontSize: 12, fill: theme === "dark" ? "#94a3b8" : "#64748b" }} />
                  <YAxis tick={{ fontSize: 12, fill: theme === "dark" ? "#94a3b8" : "#64748b" }} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: theme === "dark" ? "#1e293b" : "#fff", borderRadius: "8px", fontSize: "12px", border: `1px solid ${theme === "dark" ? "#475569" : "#e2e8f0"}` }} />
                  <Bar dataKey="savings" name="Savings vs smallest qty" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="lg:col-span-2 card p-5">
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
              Full Quantity Comparison
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-surface-light-border dark:border-surface-dark-border">
                    <th className="py-3 text-left font-semibold text-text-light-primary dark:text-text-dark-primary">Metric</th>
                    {results.map(r => (
                      <th key={r.quantity} className="py-3 text-right font-semibold text-text-light-primary dark:text-text-dark-primary">
                        {formatNumber(r.quantity)} copies
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {[
                    { label: "Total Production Cost", key: "totalProductionCost", format: (v: number) => formatCurrency(v) },
                    { label: "Cost Per Copy", key: "totalCostPerCopy", format: (v: number) => formatCurrency(v) },
                    { label: `Selling Price (${estimation.pricing.currency})`, key: "sellingPriceForeignCurrency", format: (v: number) => formatCurrency(v, estimation.pricing.currency, 3) },
                    { label: "Total Selling", key: "grandTotal", format: (v: number) => formatCurrency(v) },
                    { label: "Margin", key: "marginAmount", format: (v: number) => formatCurrency(v) },
                    { label: "TPH", key: "tph", format: (v: number) => `₹${formatNumber(v)}` },
                    { label: "Machine Hours", key: "totalMachineHours", format: (v: number) => `${v.toFixed(1)}h` },
                    { label: "Total Cartons", key: "totalCartons", format: (v: number) => formatNumber(v) },
                    { label: "Total Pallets", key: "totalPallets", format: (v: number) => formatNumber(v) },
                    { label: "Total Weight", key: "totalWeight", format: (v: number) => `${formatNumber(v)}kg` },
                  ].map(row => (
                    <tr key={row.label} className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50">
                      <td className="py-2.5 text-text-light-secondary dark:text-text-dark-secondary">{row.label}</td>
                      {results.map(r => (
                        <td key={r.quantity} className="py-2.5 text-right font-medium text-text-light-primary dark:text-text-dark-primary">
                          {row.format((r as any)[row.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "comparison" && results.length <= 1 && (
        <div className="card p-12 text-center animate-in">
          <TrendingUp className="w-12 h-12 text-text-light-tertiary dark:text-text-dark-tertiary mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">Single Quantity</h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Add more quantities in Step 2 (Book Spec) to see volume comparison and savings analysis.
          </p>
        </div>
      )}

      {activeTab === "detailed" && (
        <div className="card p-6 animate-in space-y-6">
          <div className="text-center border-b border-surface-light-border dark:border-surface-dark-border pb-6">
            <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
              DETAILED ESTIMATION REPORT
            </h2>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
              {estimation.jobTitle} — {estimation.customerName}
            </p>
            <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-1">
              Generated: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
              {" • "}Estimated by: {estimation.estimatedBy || "—"}
            </p>
          </div>

          {/* Job Specifications */}
          <div>
            <h3 className="text-base font-bold text-text-light-primary dark:text-text-dark-primary border-b-2 border-primary-500 pb-1 mb-3">
              JOB SPECIFICATIONS
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <DetailRow label="Trim Size" value={`${estimation.bookSpec.widthMM} × ${estimation.bookSpec.heightMM} mm`} />
              <DetailRow label="Total Pages" value={`${estimation.textSections.reduce((s, t) => t.enabled ? s + t.pages : s, 0)}pp`} />
              <DetailRow label="Spine Thickness" value={`${spineThickness.toFixed(2)} mm`} />
              <DetailRow label="Binding" value={estimation.binding.primaryBinding.replace(/_/g, " ")} />
              <DetailRow label="Text Paper" value={`${estimation.textSections[0]?.gsm}gsm ${estimation.textSections[0]?.paperTypeName}`} />
              <DetailRow label="Cover Paper" value={`${estimation.cover.gsm}gsm ${estimation.cover.paperTypeName}`} />
              <DetailRow label="Destination" value={estimation.delivery.destinationName} />
              <DetailRow label="Delivery" value={`${estimation.delivery.deliveryType.toUpperCase()} ${estimation.delivery.freightMode}`} />
            </div>
          </div>

          {/* Per-Quantity Results */}
          {results.map((r) => (
            <div key={r.quantity}>
              <h3 className="text-base font-bold text-text-light-primary dark:text-text-dark-primary border-b-2 border-primary-500 pb-1 mb-3">
                COST ANALYSIS — {formatNumber(r.quantity)} COPIES
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary">
                      <th className="py-2 px-3 text-left font-semibold">Cost Category</th>
                      <th className="py-2 px-3 text-right font-semibold">Amount (₹)</th>
                      <th className="py-2 px-3 text-right font-semibold">Per Copy (₹)</th>
                      <th className="py-2 px-3 text-right font-semibold">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { cat: "Paper", cost: r.totalPaperCost },
                      { cat: "Printing", cost: r.totalPrintingCost },
                      { cat: "CTP / Plates", cost: r.totalCTPCost },
                      { cat: "Binding", cost: r.bindingCost },
                      { cat: "Finishing", cost: r.finishingCost },
                      { cat: "Packing", cost: r.packingCost },
                      { cat: "Freight", cost: r.freightCost },
                      { cat: "Pre-Press", cost: r.prePressCost },
                      { cat: "Additional", cost: r.additionalCost },
                    ].filter(c => c.cost > 0).map(c => (
                      <tr key={c.cat} className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50">
                        <td className="py-2 px-3">{c.cat}</td>
                        <td className="py-2 px-3 text-right font-medium">{formatCurrency(c.cost)}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(r.quantity > 0 ? c.cost / r.quantity : 0)}</td>
                        <td className="py-2 px-3 text-right">{formatPercent(r.totalProductionCost > 0 ? (c.cost / r.totalProductionCost) * 100 : 0)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-primary-50 dark:bg-primary-500/10">
                      <td className="py-2 px-3">TOTAL PRODUCTION COST</td>
                      <td className="py-2 px-3 text-right text-primary-600 dark:text-primary-400">{formatCurrency(r.totalProductionCost)}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(r.totalCostPerCopy)}</td>
                      <td className="py-2 px-3 text-right">100%</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3">+ Margin ({estimation.pricing.marginPercent}%)</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(r.marginAmount)}</td>
                      <td colSpan={2} />
                    </tr>
                    <tr className="font-bold text-lg bg-success-50 dark:bg-success-500/10">
                      <td className="py-3 px-3">SELLING PRICE</td>
                      <td className="py-3 px-3 text-right text-success-700 dark:text-success-400">{formatCurrency(r.totalSellingPrice)}</td>
                      <td className="py-3 px-3 text-right text-success-700 dark:text-success-400">
                        {formatCurrency(r.sellingPriceForeignCurrency, estimation.pricing.currency, 3)}/copy
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quotation Modal */}
      {showQuotationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowQuotationModal(false)} />
          <div className="relative card p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto animate-scale-in">
            <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-4">
              Create Quotation
            </h2>
            <div className="space-y-4">
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                The following quantities will be included in the quotation:
              </p>
              {results.map(r => (
                <div key={r.quantity} className="flex items-center justify-between p-3 bg-surface-light-secondary dark:bg-surface-dark-tertiary rounded-lg text-sm">
                  <span className="font-medium">{formatNumber(r.quantity)} copies</span>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(r.sellingPriceForeignCurrency, estimation.pricing.currency, 3)}/copy</p>
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                      Total: {formatCurrency(r.grandTotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-surface-light-border dark:border-surface-dark-border">
              <button onClick={() => setShowQuotationModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveQuotation} className="btn-primary">Save Quotation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricBox({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg bg-surface-light-secondary dark:bg-surface-dark-tertiary">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-text-light-tertiary dark:text-text-dark-tertiary">{icon}</span>
        <span className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">{label}</span>
      </div>
      <p className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">{value}</p>
      <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">{sub}</p>
    </div>
  );
}

function BreakdownSection({ title, icon, total, expanded, onToggle, children }: {
  title: string; icon: React.ReactNode; total: number; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-light-secondary dark:hover:bg-surface-dark-tertiary transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-primary-600 dark:text-primary-400">{icon}</span>
          <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">{title}</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{formatCurrency(total)}</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-surface-light-border dark:border-surface-dark-border animate-in">
          {children}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-text-light-tertiary dark:text-text-dark-tertiary text-xs">{label}</p>
      <p className="font-medium text-text-light-primary dark:text-text-dark-primary capitalize">{value}</p>
    </div>
  );
}

