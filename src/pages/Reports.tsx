import { useState } from "react";
import { cn } from "@/utils/cn";
import { useAppStore } from "@/stores/appStore";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/format";
import { BarChart3, Download, Calendar, TrendingUp, Users, FileCheck, Briefcase, Printer, Layers, PieChart as PieIcon, Target, DollarSign } from "lucide-react";
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
  const { theme } = useAppStore();
  const [tab, setTab] = useState<ReportTab>("overview");

  const chartStyle = { backgroundColor: theme === "dark" ? "#1e293b" : "#fff", border: `1px solid ${theme === "dark" ? "#475569" : "#e2e8f0"}`, borderRadius: "8px", fontSize: "12px" };
  const tickFill = theme === "dark" ? "#94a3b8" : "#64748b";
  const gridStroke = theme === "dark" ? "#334155" : "#e2e8f0";

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2"><BarChart3 className="w-6 h-6" /> Reports</h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">Comprehensive analytics and business intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-sm flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Last 6 Months</button>
          <button className="btn-secondary text-sm flex items-center gap-1.5"><Download className="w-4 h-4" /> Export</button>
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
            <StatBox icon={<Briefcase className="w-5 h-5 text-blue-500" />} label="Total Jobs" value="97" change={12.5} />
            <StatBox icon={<DollarSign className="w-5 h-5 text-green-500" />} label="Total Revenue" value={formatCurrency(24450000)} change={15.7} />
            <StatBox icon={<FileCheck className="w-5 h-5 text-amber-500" />} label="Conversion Rate" value="67.3%" change={3.2} />
            <StatBox icon={<Target className="w-5 h-5 text-purple-500" />} label="Avg Job Value" value={formatCurrency(252000)} change={8.1} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5 min-w-0">
              <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">Revenue Trend</h3>
              <div className="h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                  <AreaChart data={MONTHLY}>
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
              {TOP_CUSTOMERS.map((c, i) => (
                <div key={c.name} className="flex items-center gap-4">
                  <span className="text-xs font-bold text-text-light-tertiary dark:text-text-dark-tertiary w-6">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary truncate">{c.name}</p>
                    <div className="w-full h-2 bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-full mt-1">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(c.revenue / TOP_CUSTOMERS[0].revenue) * 100}%` }} />
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

      {(tab === "revenue" || tab === "jobs" || tab === "quotations" || tab === "customers") && (
        <div className="card p-12 text-center animate-in">
          <BarChart3 className="w-16 h-16 text-text-light-tertiary dark:text-text-dark-tertiary mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {tab.charAt(0).toUpperCase() + tab.slice(1)} Report
          </h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-2 max-w-md mx-auto">
            Detailed {tab} analytics with interactive charts, trend analysis, and downloadable reports. Connect to a live database for real-time data.
          </p>
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
      <div className="flex items-center gap-1 mt-1"><TrendingUp className={cn("w-3.5 h-3.5", change >= 0 ? "text-success-500" : "text-danger-500")} /><span className={cn("text-xs font-medium", change >= 0 ? "text-success-600" : "text-danger-600")}>{change >= 0 ? "+" : ""}{change}%</span></div>
    </div>
  );
}

