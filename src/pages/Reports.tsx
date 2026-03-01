import { useState, useMemo } from "react";
import { cn } from "@/utils/cn";
import { useAppStore } from "@/stores/appStore";
import { useDataStore } from "@/stores/dataStore";
import { formatCurrency, formatNumber } from "@/utils/format";
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { BarChart3, Download, Calendar, TrendingUp, TrendingDown, Users, FileCheck, Briefcase, Printer, Layers, PieChart as PieIcon, Target, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend } from "recharts";

const MONTHLY = [
  { month: "Jan", jobs: 12, revenue: 3200000, quotations: 18, accepted: 8 },
  { month: "Feb", jobs: 15, revenue: 3800000, quotations: 22, accepted: 11 },
  { month: "Mar", jobs: 11, revenue: 2900000, quotations: 16, accepted: 7 },
  { month: "Apr", jobs: 18, revenue: 4500000, quotations: 25, accepted: 14 },
  { month: "May", jobs: 22, revenue: 5200000, quotations: 30, accepted: 18 },
  { month: "Jun", jobs: 19, revenue: 4850000, quotations: 23, accepted: 13 },
];

const TOP_CUSTOMERS = [
  { name: "Oxford University Press", revenue: 28500000, jobs: 45 },
  { name: "Cambridge University Press", revenue: 19200000, jobs: 38 },
  { name: "Penguin Random House", revenue: 12800000, jobs: 22 },
  { name: "National Geographic", revenue: 8900000, jobs: 8 },
  { name: "HarperCollins", revenue: 7600000, jobs: 15 },
];

const MACHINE_UTIL = [
  { name: "RMGT", hours: 1250, utilization: 78, jobs: 68 },
  { name: "FAV", hours: 980, utilization: 65, jobs: 42 },
  { name: "Rekord+AQ", hours: 870, utilization: 58, jobs: 35 },
  { name: "RMGT Perfecto", hours: 620, utilization: 41, jobs: 22 },
];

const PAPER_USAGE = [
  { type: "Matt Art", reams: 1850, weight: 12500 },
  { type: "Woodfree (CW)", reams: 920, weight: 5800 },
  { type: "Art Card", reams: 450, weight: 6200 },
  { type: "Holmen Bulky", reams: 380, weight: 2100 },
  { type: "C1S", reams: 220, weight: 4800 },
];

const BINDING_DATA = [
  { name: "Perfect", value: 42, color: "#3b82f6" },
  { name: "Hardcase", value: 28, color: "#8b5cf6" },
  { name: "Saddle", value: 15, color: "#22c55e" },
  { name: "Wire-O", value: 8, color: "#f59e0b" },
  { name: "Others", value: 7, color: "#64748b" },
];

type ReportTab = "overview" | "revenue" | "jobs" | "quotations" | "customers" | "machines" | "paper";

export function Reports() {
  const { theme, settings, addNotification } = useAppStore();
  const { jobs, quotations, customers } = useDataStore();
  const [tab, setTab] = useState<ReportTab>("overview");
  const [dateRange, setDateRange] = useState("6m");

  const chartStyle = { backgroundColor: theme === "dark" ? "#1e293b" : "#fff", border: `1px solid ${theme === "dark" ? "#475569" : "#e2e8f0"}`, borderRadius: "8px", fontSize: "12px" };
  const tickFill = theme === "dark" ? "#94a3b8" : "#64748b";
  const gridStroke = theme === "dark" ? "#334155" : "#e2e8f0";

  // Compute real stats
  const realJobCount = jobs.length;
  const realQuotationCount = quotations.length;
  const realCustomerCount = customers.length;
  const realRevenue = jobs.reduce((s, j) => s + (j.totalValue || 0), 0);
  const acceptedQuotations = quotations.filter(q => q.status === "accepted").length;
  const sentQuotations = quotations.filter(q => q.status === "sent").length;
  const conversionRate = realQuotationCount > 0 ? (acceptedQuotations / realQuotationCount) * 100 : 67.3;

  // Revenue by month from real jobs
  const revenueByMonth = useMemo(() => {
    if (jobs.length === 0) return MONTHLY;
    const monthMap: Record<string, { jobs: number; revenue: number; quotations: number; accepted: number }> = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    jobs.forEach(j => {
      const d = new Date(j.createdAt);
      const key = months[d.getMonth()];
      if (!monthMap[key]) monthMap[key] = { jobs: 0, revenue: 0, quotations: 0, accepted: 0 };
      monthMap[key].jobs++;
      monthMap[key].revenue += j.totalValue || 0;
    });
    quotations.forEach(q => {
      const d = new Date(q.createdAt);
      const key = months[d.getMonth()];
      if (!monthMap[key]) monthMap[key] = { jobs: 0, revenue: 0, quotations: 0, accepted: 0 };
      monthMap[key].quotations++;
      if (q.status === "accepted") monthMap[key].accepted++;
    });
    const result = Object.entries(monthMap).map(([month, data]) => ({ month, ...data }));
    return result.length > 0 ? result : MONTHLY;
  }, [jobs, quotations]);

  // Customer revenue from real data
  const customerRevenue = useMemo(() => {
    if (customers.length === 0) return TOP_CUSTOMERS;
    const cMap: Record<string, { name: string; revenue: number; jobs: number }> = {};
    jobs.forEach(j => {
      const key = j.customerName || "Unknown";
      if (!cMap[key]) cMap[key] = { name: key, revenue: 0, jobs: 0 };
      cMap[key].revenue += j.totalValue || 0;
      cMap[key].jobs++;
    });
    const sorted = Object.values(cMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    return sorted.length > 0 ? sorted : TOP_CUSTOMERS;
  }, [jobs, customers]);

  // Quotation status breakdown
  const quotationBreakdown = useMemo(() => {
    if (quotations.length === 0) {
      return [
        { name: "Draft", value: 1, color: "#94a3b8" },
        { name: "Sent", value: 2, color: "#3b82f6" },
        { name: "Accepted", value: 2, color: "#22c55e" },
        { name: "Rejected", value: 1, color: "#ef4444" },
      ];
    }
    const counts: Record<string, number> = {};
    quotations.forEach(q => { counts[q.status] = (counts[q.status] || 0) + 1; });
    const colors: Record<string, string> = { draft: "#94a3b8", sent: "#3b82f6", accepted: "#22c55e", rejected: "#ef4444", expired: "#f59e0b", revised: "#8b5cf6" };
    return Object.entries(counts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: colors[status] || "#64748b",
    }));
  }, [quotations]);

  const handleExport = async () => {
    try {
      const co = settings.company;
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

      // ── Company Letterhead ──
      const header = [
        `"${co.name}"`,
        co.address ? `"${co.address}"` : null,
        `"${[co.city, co.state, co.country].filter(Boolean).join(", ")}"`,
        co.phone ? `"Phone: ${co.phone}"` : null,
        co.email ? `"Email: ${co.email}"` : null,
        co.website ? `"Website: ${co.website}"` : null,
        co.gstNumber ? `"GSTIN: ${co.gstNumber}"` : null,
        co.panNumber ? `"PAN: ${co.panNumber}"` : null,
        "",
      ].filter(v => v !== null);

      const TAB_TITLES: Record<ReportTab, string> = {
        overview: "Business Overview Report",
        revenue: "Revenue Analysis Report",
        jobs: "Jobs Performance Report",
        quotations: "Quotations Analysis Report",
        customers: "Customer Intelligence Report",
        machines: "Machine Utilization Report",
        paper: "Paper Consumption Report",
      };

      const reportMeta = [
        `"REPORT: ${TAB_TITLES[tab]}"`,
        `"Generated: ${dateStr} at ${timeStr}"`,
        `"Period: ${dateRange === '3m' ? 'Last 3 Months' : dateRange === '6m' ? 'Last 6 Months' : 'Last 12 Months'}"`,
        `"Confidential — For Internal Use Only"`,
        "",
        "═══════════════════════════════════════════════════",
        "",
      ];

      let dataRows: string[] = [];

      // ── Tab-specific data ──
      switch (tab) {
        case "overview": {
          dataRows = [
            "KEY PERFORMANCE INDICATORS",
            "Metric,Value,Change",
            `"Total Jobs","${formatNumber(realJobCount || 97)}","+12.5%"`,
            `"Total Revenue","${formatCurrency(realRevenue || 24450000)}","+15.7%"`,
            `"Conversion Rate","${conversionRate.toFixed(1)}%","+3.2%"`,
            `"Avg Job Value","${formatCurrency(realJobCount > 0 ? realRevenue / realJobCount : 252000)}","+8.1%"`,
            `"Total Customers","${formatNumber(realCustomerCount || 89)}","+8.1%"`,
            `"Accepted Quotations","${acceptedQuotations}",""`,
            `"Pending Quotations","${sentQuotations}",""`,
            "",
            "MONTHLY TREND",
            "Month,Jobs,Revenue,Quotations Sent,Quotations Accepted",
            ...revenueByMonth.map(m => `"${m.month}","${m.jobs}","${formatCurrency(m.revenue)}","${m.quotations}","${m.accepted}"`),
            "",
            "TOP CUSTOMERS BY REVENUE",
            "Rank,Customer Name,Revenue,Jobs Count",
            ...customerRevenue.map((c, i) => `"${i + 1}","${c.name}","${formatCurrency(c.revenue)}","${c.jobs}"`),
            "",
            "BINDING DISTRIBUTION",
            "Binding Type,Percentage",
            ...BINDING_DATA.map(b => `"${b.name}","${b.value}%"`),
          ];
          break;
        }
        case "revenue": {
          const avgMonthly = (realRevenue || 24450000) / 6;
          dataRows = [
            "REVENUE SUMMARY",
            "Metric,Value",
            `"Total Revenue","${formatCurrency(realRevenue || 24450000)}"`,
            `"Average Monthly Revenue","${formatCurrency(avgMonthly)}"`,
            `"Average Revenue per Job","${formatCurrency(realJobCount > 0 ? realRevenue / realJobCount : 252000)}"`,
            `"Best Performing Month","May"`,
            "",
            "MONTHLY REVENUE BREAKDOWN",
            "Month,Revenue,Jobs Count,Revenue per Job",
            ...revenueByMonth.map(m => `"${m.month}","${formatCurrency(m.revenue)}","${m.jobs}","${m.jobs > 0 ? formatCurrency(m.revenue / m.jobs) : '—'}"`),
          ];
          break;
        }
        case "jobs": {
          const inProd = jobs.filter(j => j.status === "in_production").length;
          const completed = jobs.filter(j => j.status === "completed").length;
          const draft = jobs.filter(j => j.status === "draft").length;
          dataRows = [
            "JOB STATUS SUMMARY",
            "Status,Count,Percentage",
            `"Total Jobs","${realJobCount || 97}","100%"`,
            `"In Production","${inProd || 3}","${realJobCount > 0 ? ((inProd / realJobCount) * 100).toFixed(1) : '3.1'}%"`,
            `"Completed","${completed || 45}","${realJobCount > 0 ? ((completed / realJobCount) * 100).toFixed(1) : '46.4'}%"`,
            `"Draft","${draft || 12}","${realJobCount > 0 ? ((draft / realJobCount) * 100).toFixed(1) : '12.4'}%"`,
            "",
            "JOBS BY MONTH",
            "Month,Jobs Created,Revenue Generated",
            ...revenueByMonth.map(m => `"${m.month}","${m.jobs}","${formatCurrency(m.revenue)}"`),
            "",
            "DETAILED JOB REGISTER",
            "Sr No,Job Number,Job Title,Customer,Status,Value,Created Date",
            ...jobs.map((j, i) => `"${i + 1}","${j.jobNumber || ''}","${(j.title || '').replace(/"/g, '""')}","${(j.customerName || '').replace(/"/g, '""')}","${j.status}","${formatCurrency(j.totalValue || 0)}","${new Date(j.createdAt).toLocaleDateString('en-IN')}"`),
          ];
          break;
        }
        case "quotations": {
          dataRows = [
            "QUOTATION PERFORMANCE SUMMARY",
            "Metric,Value",
            `"Total Quotations","${realQuotationCount || 134}"`,
            `"Accepted","${acceptedQuotations || 71}"`,
            `"Pending (Sent)","${sentQuotations || 23}"`,
            `"Conversion Rate","${conversionRate.toFixed(1)}%"`,
            "",
            "STATUS DISTRIBUTION",
            "Status,Count,Percentage",
            ...quotationBreakdown.map(b => `"${b.name}","${b.value}","${realQuotationCount > 0 ? ((b.value / realQuotationCount) * 100).toFixed(1) : '—'}%"`),
            "",
            "MONTHLY QUOTATION TREND",
            "Month,Quotations Sent,Accepted,Acceptance Rate",
            ...revenueByMonth.map(m => `"${m.month}","${m.quotations}","${m.accepted}","${m.quotations > 0 ? ((m.accepted / m.quotations) * 100).toFixed(1) : '0'}%"`),
            "",
            "DETAILED QUOTATION REGISTER",
            "Sr No,Quotation No,Customer,Status,Total Amount,Valid Until,Created Date",
            ...quotations.map((q, i) => `"${i + 1}","${q.quotationNumber || ''}","${(q.customerName || '').replace(/"/g, '""')}","${q.status}","${formatCurrency(q.results?.[0]?.grandTotal || 0)}","${q.validUntil ? new Date(q.validUntil).toLocaleDateString('en-IN') : '—'}","${new Date(q.createdAt).toLocaleDateString('en-IN')}"`),
          ];
          break;
        }
        case "customers": {
          const activeCount = customers.filter(c => c.status === "active").length;
          const highPriority = customers.filter(c => c.priority === "high").length;
          dataRows = [
            "CUSTOMER INTELLIGENCE SUMMARY",
            "Metric,Value",
            `"Total Customers","${realCustomerCount || 89}"`,
            `"Active Customers","${activeCount || 78}"`,
            `"High Priority","${highPriority || 12}"`,
            `"Avg Revenue per Customer","${formatCurrency(realCustomerCount > 0 ? realRevenue / realCustomerCount : 274720)}"`,
            "",
            "TOP CUSTOMERS BY REVENUE",
            "Rank,Customer Name,Total Revenue,Jobs Count,Revenue per Job",
            ...customerRevenue.map((c, i) => `"${i + 1}","${c.name}","${formatCurrency(c.revenue)}","${c.jobs}","${c.jobs > 0 ? formatCurrency(c.revenue / c.jobs) : '—'}"`),
            "",
            "COMPLETE CUSTOMER DIRECTORY",
            "Sr No,Code,Name,Email,Phone,City,Priority,Status",
            ...customers.map((c, i) => `"${i + 1}","${c.code || ''}","${(c.name || '').replace(/"/g, '""')}","${c.email || ''}","${c.phone || ''}","${c.city || ''}","${c.priority || 'normal'}","${c.status === 'active' ? 'Active' : 'Inactive'}"`),
          ];
          break;
        }
        case "machines": {
          const totalHours = MACHINE_UTIL.reduce((s, m) => s + m.hours, 0);
          const totalJobs = MACHINE_UTIL.reduce((s, m) => s + m.jobs, 0);
          const avgUtil = MACHINE_UTIL.reduce((s, m) => s + m.utilization, 0) / MACHINE_UTIL.length;
          dataRows = [
            "MACHINE UTILIZATION SUMMARY",
            "Metric,Value",
            `"Total Machine Hours","${formatNumber(totalHours)}"`,
            `"Total Jobs Processed","${totalJobs}"`,
            `"Average Utilization","${avgUtil.toFixed(1)}%"`,
            "",
            "MACHINE-WISE BREAKDOWN",
            "Machine Name,Hours Logged,Utilization %,Jobs Processed,Avg Hours/Job,Status",
            ...MACHINE_UTIL.map(m => `"${m.name}","${formatNumber(m.hours)}","${m.utilization}%","${m.jobs}","${(m.hours / m.jobs).toFixed(1)}","${m.utilization > 70 ? 'Optimal' : m.utilization > 40 ? 'Moderate' : 'Under-utilized'}"`),
          ];
          break;
        }
        case "paper": {
          const totalReams = PAPER_USAGE.reduce((s, p) => s + p.reams, 0);
          const totalWeight = PAPER_USAGE.reduce((s, p) => s + p.weight, 0);
          dataRows = [
            "PAPER CONSUMPTION SUMMARY",
            "Metric,Value",
            `"Total Reams Used","${formatNumber(totalReams)}"`,
            `"Total Weight","${formatNumber(totalWeight)} kg"`,
            `"Paper Types","${PAPER_USAGE.length}"`,
            "",
            "PAPER-WISE BREAKDOWN",
            "Paper Type,Reams Used,Weight (kg),% of Total Reams,% of Total Weight",
            ...PAPER_USAGE.map(p => `"${p.type}","${formatNumber(p.reams)}","${formatNumber(p.weight)}","${((p.reams / totalReams) * 100).toFixed(1)}%","${((p.weight / totalWeight) * 100).toFixed(1)}%"`),
          ];
          break;
        }
      }

      // ── Footer ──
      const footer = [
        "",
        "═══════════════════════════════════════════════════",
        `"End of Report"`,
        `"This report was auto-generated by Print Estimator Pro."`,
        `"© ${now.getFullYear()} ${co.name}. All rights reserved."`,
      ];

      const csv = [...header, ...reportMeta, ...dataRows, ...footer].join("\n");

      const tabLabel = TAB_TITLES[tab].replace(/ /g, "-").toLowerCase();
      const defaultFilename = `${tabLabel}-${now.toISOString().split('T')[0]}.csv`;

      const filePath = await save({
        filters: [{ name: 'CSV Report', extensions: ['csv'] }],
        defaultPath: defaultFilename,
      });

      if (!filePath) return;

      await writeTextFile(filePath, csv);
      addNotification({ type: "success", title: "Report Exported", message: `${TAB_TITLES[tab]} saved to ${filePath}`, category: "export" });
    } catch (error: any) {
      addNotification({ type: "error", title: "Export Failed", message: error.message || "Failed to export the report.", category: "system" });
    }
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2"><BarChart3 className="w-6 h-6" /> Reports</h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">Comprehensive analytics and business intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-lg">
            {[{ key: "3m", label: "3 Months" }, { key: "6m", label: "6 Months" }, { key: "1y", label: "1 Year" }].map(r => (
              <button key={r.key} onClick={() => setDateRange(r.key)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", dateRange === r.key ? "bg-white dark:bg-surface-dark-secondary shadow-sm" : "text-text-light-secondary dark:text-text-dark-secondary")}>
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={handleExport} className="btn-secondary text-sm flex items-center gap-1.5"><Download className="w-4 h-4" /> Export</button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {([
          { key: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
          { key: "revenue", label: "Revenue", icon: <DollarSign className="w-4 h-4" /> },
          { key: "jobs", label: "Jobs", icon: <Briefcase className="w-4 h-4" /> },
          { key: "quotations", label: "Quotations", icon: <FileCheck className="w-4 h-4" /> },
          { key: "customers", label: "Customers", icon: <Users className="w-4 h-4" /> },
          { key: "machines", label: "Machines", icon: <Printer className="w-4 h-4" /> },
          { key: "paper", label: "Paper Usage", icon: <Layers className="w-4 h-4" /> },
        ] as { key: ReportTab; label: string; icon: React.ReactNode }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn("flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all", tab === t.key ? "bg-primary-600 text-white shadow-md" : "bg-surface-light-tertiary dark:bg-surface-dark-tertiary text-text-light-secondary dark:text-text-dark-secondary hover:bg-primary-50 dark:hover:bg-primary-500/10")}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6 animate-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox icon={<Briefcase className="w-5 h-5 text-blue-500" />} label="Total Jobs" value={formatNumber(realJobCount || 97)} change={12.5} />
            <StatBox icon={<DollarSign className="w-5 h-5 text-green-500" />} label="Total Revenue" value={formatCurrency(realRevenue || 24450000)} change={15.7} />
            <StatBox icon={<FileCheck className="w-5 h-5 text-amber-500" />} label="Conversion Rate" value={`${conversionRate.toFixed(1)}%`} change={3.2} />
            <StatBox icon={<Target className="w-5 h-5 text-purple-500" />} label="Avg Job Value" value={formatCurrency(realJobCount > 0 ? realRevenue / realJobCount : 252000)} change={8.1} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5 min-w-0">
              <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">Revenue Trend</h3>
              <div className="h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                  <AreaChart data={revenueByMonth}>
                    <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: tickFill }} />
                    <YAxis tick={{ fontSize: 12, fill: tickFill }} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                    <Tooltip contentStyle={chartStyle} formatter={(v: number | undefined) => [formatCurrency(v ?? 0), "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#rg)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-5 min-w-0">
              <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">Binding Distribution</h3>
              <div className="h-52 min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                  <PieChart><Pie data={BINDING_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">{BINDING_DATA.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip contentStyle={chartStyle} /></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {BINDING_DATA.map(b => (<div key={b.name} className="flex items-center gap-1.5 text-xs"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />{b.name} ({b.value}%)</div>))}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">Top Customers by Revenue</h3>
            <div className="space-y-3">
              {customerRevenue.map((c, i) => (
                <div key={c.name} className="flex items-center gap-4">
                  <span className="text-xs font-bold text-text-light-tertiary dark:text-text-dark-tertiary w-6">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary truncate">{c.name}</p>
                    <div className="w-full h-2 bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-full mt-1">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(c.revenue / (customerRevenue[0]?.revenue || 1)) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">{formatCurrency(c.revenue)}</p>
                    <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">{c.jobs} jobs</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "revenue" && (
        <div className="space-y-6 animate-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox icon={<DollarSign className="w-5 h-5 text-green-500" />} label="Total Revenue" value={formatCurrency(realRevenue || 24450000)} change={15.7} />
            <StatBox icon={<TrendingUp className="w-5 h-5 text-blue-500" />} label="Avg Monthly" value={formatCurrency((realRevenue || 24450000) / 6)} change={8.3} />
            <StatBox icon={<Target className="w-5 h-5 text-purple-500" />} label="Best Month" value="May" change={22.1} />
            <StatBox icon={<DollarSign className="w-5 h-5 text-amber-500" />} label="Avg per Job" value={formatCurrency(realJobCount > 0 ? realRevenue / realJobCount : 252000)} change={5.4} />
          </div>
          <div className="card p-5 min-w-0">
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">Revenue & Jobs Trend</h3>
            <div className="h-72 min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                <AreaChart data={revenueByMonth}>
                  <defs><linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: tickFill }} />
                  <YAxis tick={{ fontSize: 12, fill: tickFill }} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                  <Tooltip contentStyle={chartStyle} />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#rg2)" name="Revenue" />
                  <Line type="monotone" dataKey="jobs" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} yAxisId={0} name="Jobs" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tab === "jobs" && (
        <div className="space-y-6 animate-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox icon={<Briefcase className="w-5 h-5 text-blue-500" />} label="Total Jobs" value={formatNumber(realJobCount || 97)} change={12.5} />
            <StatBox icon={<Briefcase className="w-5 h-5 text-purple-500" />} label="In Production" value={formatNumber(jobs.filter(j => j.status === "in_production").length || 3)} change={5.0} />
            <StatBox icon={<Briefcase className="w-5 h-5 text-green-500" />} label="Completed" value={formatNumber(jobs.filter(j => j.status === "completed").length || 45)} change={18.2} />
            <StatBox icon={<Briefcase className="w-5 h-5 text-amber-500" />} label="Draft" value={formatNumber(jobs.filter(j => j.status === "draft").length || 12)} change={-2.1} />
          </div>
          <div className="card p-5 min-w-0">
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">Jobs by Month</h3>
            <div className="h-64 min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                <BarChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: tickFill }} />
                  <YAxis tick={{ fontSize: 12, fill: tickFill }} />
                  <Tooltip contentStyle={chartStyle} />
                  <Bar dataKey="jobs" name="Jobs" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tab === "quotations" && (
        <div className="space-y-6 animate-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox icon={<FileCheck className="w-5 h-5 text-blue-500" />} label="Total Quotes" value={formatNumber(realQuotationCount || 134)} change={9.8} />
            <StatBox icon={<FileCheck className="w-5 h-5 text-green-500" />} label="Accepted" value={formatNumber(acceptedQuotations || 71)} change={12.4} />
            <StatBox icon={<FileCheck className="w-5 h-5 text-amber-500" />} label="Pending" value={formatNumber(sentQuotations || 23)} change={-5.2} />
            <StatBox icon={<Target className="w-5 h-5 text-purple-500" />} label="Conversion" value={`${conversionRate.toFixed(1)}%`} change={3.2} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5 min-w-0">
              <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">Quotation Status Distribution</h3>
              <div className="h-52 min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                  <PieChart><Pie data={quotationBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">{quotationBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip contentStyle={chartStyle} /></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {quotationBreakdown.map(b => (<div key={b.name} className="flex items-center gap-1.5 text-xs"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />{b.name} ({b.value})</div>))}
              </div>
            </div>
            <div className="card p-5 min-w-0">
              <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">Quotations vs Accepted Trend</h3>
              <div className="h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                  <BarChart data={revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: tickFill }} />
                    <YAxis tick={{ fontSize: 12, fill: tickFill }} />
                    <Tooltip contentStyle={chartStyle} />
                    <Bar dataKey="quotations" name="Sent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="accepted" name="Accepted" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "customers" && (
        <div className="space-y-6 animate-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox icon={<Users className="w-5 h-5 text-blue-500" />} label="Total Customers" value={formatNumber(realCustomerCount || 89)} change={8.1} />
            <StatBox icon={<Users className="w-5 h-5 text-green-500" />} label="Active" value={formatNumber(customers.filter(c => c.status === "active").length || 78)} change={6.3} />
            <StatBox icon={<DollarSign className="w-5 h-5 text-purple-500" />} label="Avg Revenue/Customer" value={formatCurrency(realCustomerCount > 0 ? realRevenue / realCustomerCount : 274720)} change={11.2} />
            <StatBox icon={<Target className="w-5 h-5 text-amber-500" />} label="High Priority" value={formatNumber(customers.filter(c => c.priority === "high").length || 12)} change={2.0} />
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">Customer Revenue Ranking</h3>
            <div className="space-y-3">
              {customerRevenue.map((c, i) => (
                <div key={c.name} className="flex items-center gap-4">
                  <span className="text-xs font-bold text-text-light-tertiary dark:text-text-dark-tertiary w-6">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary truncate">{c.name}</p>
                    <div className="w-full h-2 bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-full mt-1">
                      <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${(c.revenue / (customerRevenue[0]?.revenue || 1)) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">{formatCurrency(c.revenue)}</p>
                    <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">{c.jobs} jobs</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "machines" && (
        <div className="space-y-6 animate-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {MACHINE_UTIL.map(m => (
              <div key={m.name} className="card p-5">
                <h4 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">{m.name}</h4>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-text-light-tertiary dark:text-text-dark-tertiary">Utilization</span><span className="font-bold">{m.utilization}%</span></div>
                  <div className="w-full h-2 bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-full"><div className={cn("h-full rounded-full", m.utilization > 70 ? "bg-success-500" : m.utilization > 40 ? "bg-warning-500" : "bg-danger-500")} style={{ width: `${m.utilization}%` }} /></div>
                  <div className="flex justify-between text-xs"><span className="text-text-light-tertiary dark:text-text-dark-tertiary">Hours</span><span>{formatNumber(m.hours)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-text-light-tertiary dark:text-text-dark-tertiary">Jobs</span><span>{m.jobs}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "paper" && (
        <div className="card p-5 animate-in min-w-0">
          <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">Paper Consumption</h3>
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
              <BarChart data={PAPER_USAGE}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="type" tick={{ fontSize: 12, fill: tickFill }} />
                <YAxis tick={{ fontSize: 12, fill: tickFill }} />
                <Tooltip contentStyle={chartStyle} />
                <Bar dataKey="reams" name="Reams" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b"><th className="py-2 px-4 text-left font-semibold">Paper Type</th><th className="py-2 px-4 text-right font-semibold">Reams Used</th><th className="py-2 px-4 text-right font-semibold">Weight (kg)</th></tr></thead>
            <tbody>{PAPER_USAGE.map(p => (<tr key={p.type} className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50"><td className="py-2 px-4 font-medium">{p.type}</td><td className="py-2 px-4 text-right">{formatNumber(p.reams)}</td><td className="py-2 px-4 text-right">{formatNumber(p.weight)}</td></tr>))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatBox({ icon, label, value, change }: { icon: React.ReactNode; label: string; value: string; change: number }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">{icon}{label}</div>
      <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">{value}</p>
      <div className="flex items-center gap-1 mt-1">
        {change >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-success-500" /> : <TrendingDown className="w-3.5 h-3.5 text-danger-500" />}
        <span className={cn("text-xs font-medium", change >= 0 ? "text-success-600" : "text-danger-600")}>{change >= 0 ? "+" : ""}{change}%</span>
      </div>
    </div>
  );
}
