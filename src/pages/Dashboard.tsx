import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { useDataStore } from "@/stores/dataStore";
import { cn } from "@/utils/cn";
import { formatCurrency, formatNumber, getRelativeTime } from "@/utils/format";
import {
  FilePlus, Briefcase, FileCheck, Users, TrendingUp, TrendingDown,
  ArrowRight, BarChart3, DollarSign, Package, Clock, Printer,
  Target
} from "lucide-react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RechartsPie, Pie, Cell,
  Line, AreaChart, Area
} from "recharts";

const MONTHLY_DATA = [
  { month: "Jan", jobs: 12, revenue: 3200000, quotations: 18 },
  { month: "Feb", jobs: 15, revenue: 3800000, quotations: 22 },
  { month: "Mar", jobs: 11, revenue: 2900000, quotations: 16 },
  { month: "Apr", jobs: 18, revenue: 4500000, quotations: 25 },
  { month: "May", jobs: 22, revenue: 5200000, quotations: 30 },
  { month: "Jun", jobs: 19, revenue: 4850000, quotations: 23 },
];

const BINDING_DISTRIBUTION = [
  { name: "Perfect Binding", value: 42, color: "#3b82f6" },
  { name: "Hardcase", value: 28, color: "#8b5cf6" },
  { name: "Saddle Stitch", value: 15, color: "#22c55e" },
  { name: "Wire-O", value: 8, color: "#f59e0b" },
  { name: "Others", value: 7, color: "#64748b" },
];

const MOCK_RECENT_JOBS = [
  { id: "1", title: "Oxford English Dictionary", customer: "OUP", status: "in_production", value: 850000, date: new Date(Date.now() - 3600000).toISOString() },
  { id: "2", title: "Cambridge Mathematics", customer: "CUP", status: "quoted", value: 420000, date: new Date(Date.now() - 7200000).toISOString() },
  { id: "3", title: "Penguin Classics Collection", customer: "Penguin", status: "estimated", value: 1200000, date: new Date(Date.now() - 86400000).toISOString() },
  { id: "4", title: "National Geographic Atlas", customer: "NatGeo", status: "completed", value: 2300000, date: new Date(Date.now() - 172800000).toISOString() },
  { id: "5", title: "Harper Collins Novel Set", customer: "HarperCollins", status: "draft", value: 560000, date: new Date(Date.now() - 259200000).toISOString() },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400",
  estimated: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  quoted: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  in_production: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
};

export function Dashboard() {
  const navigate = useNavigate();
  const { user, theme } = useAppStore();
  const { jobs, quotations, customers } = useDataStore();

  // Compute real stats, fallback to mock
  const stats = useMemo(() => {
    const totalJobs = jobs.length || 147;
    const activeQuotations = quotations.filter(q => q.status === "sent" || q.status === "draft").length || 23;
    const totalCustomers = customers.length || 89;
    const totalRevenue = jobs.reduce((s, j) => s + (j.totalValue || 0), 0);
    const monthlyRevenue = totalRevenue > 0 ? totalRevenue / 6 : 4850000;
    const avgJobValue = jobs.length > 0 ? totalRevenue / jobs.length : 325000;
    const accepted = quotations.filter(q => q.status === "accepted").length;
    const conversionRate = quotations.length > 0 ? (accepted / quotations.length) * 100 : 67.3;
    const pendingApprovals = quotations.filter(q => q.status === "sent").length || 8;
    const overdueJobs = 2;
    return { totalJobs, activeQuotations, totalCustomers, monthlyRevenue, avgJobValue, conversionRate, pendingApprovals, overdueJobs };
  }, [jobs, quotations, customers]);

  // Recent jobs from real data or mock
  const recentJobs = useMemo(() => {
    if (jobs.length > 0) {
      return jobs
        .slice()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5)
        .map(j => ({
          id: j.id,
          title: j.title,
          customer: j.customerName,
          status: j.status,
          value: j.totalValue,
          date: j.updatedAt,
        }));
    }
    return MOCK_RECENT_JOBS;
  }, [jobs]);

  const StatCard = ({ title, value, change, icon, color, onClick }: {
    title: string; value: string; change: number; icon: React.ReactNode;
    color: string; onClick?: () => void;
  }) => (
    <button
      onClick={onClick}
      className="card p-5 text-left hover:shadow-elevated-light dark:hover:shadow-elevated-dark transition-shadow group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">{title}</p>
          <div className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mt-1">
            {value}
          </div>
        </div>
        <div className={cn("p-2.5 rounded-xl", color)}>
          {icon}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        {change >= 0 ? (
          <TrendingUp className="w-3.5 h-3.5 text-success-600" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-danger-600" />
        )}
        <span className={cn(
          "text-xs font-medium",
          change >= 0 ? "text-success-600" : "text-danger-600"
        )}>
          {change >= 0 ? "+" : ""}{change}%
        </span>
        <span className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">vs last month</span>
      </div>
    </button>
  );

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
            Welcome back, {user?.name?.split(" ")[0] || "User"} 👋
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Here's what's happening with your print estimates today.
          </p>
        </div>
        <button
          onClick={() => navigate("/estimate/new")}
          className="btn-primary flex items-center gap-2"
        >
          <FilePlus className="w-4 h-4" />
          New Estimate
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Jobs"
          value={formatNumber(stats.totalJobs)}
          change={12.5}
          icon={<Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          color="bg-blue-50 dark:bg-blue-500/10"
          onClick={() => navigate("/jobs")}
        />
        <StatCard
          title="Active Quotations"
          value={formatNumber(stats.activeQuotations)}
          change={-3.2}
          icon={<FileCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          color="bg-amber-50 dark:bg-amber-500/10"
          onClick={() => navigate("/quotations")}
        />
        <StatCard
          title="Customers"
          value={formatNumber(stats.totalCustomers)}
          change={8.1}
          icon={<Users className="w-5 h-5 text-green-600 dark:text-green-400" />}
          color="bg-green-50 dark:bg-green-500/10"
          onClick={() => navigate("/customers")}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats.monthlyRevenue)}
          change={15.7}
          icon={<DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
          color="bg-purple-50 dark:bg-purple-500/10"
          onClick={() => navigate("/reports")}
        />
      </div>

      {/* Quick Actions */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "New Estimate", icon: <FilePlus className="w-5 h-5" />, path: "/estimate/new", color: "text-primary-600 bg-primary-50 dark:bg-primary-500/10 dark:text-primary-400" },
            { label: "View Jobs", icon: <Briefcase className="w-5 h-5" />, path: "/jobs", color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400" },
            { label: "Quotations", icon: <FileCheck className="w-5 h-5" />, path: "/quotations", color: "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400" },
            { label: "Customers", icon: <Users className="w-5 h-5" />, path: "/customers", color: "text-green-600 bg-green-50 dark:bg-green-500/10 dark:text-green-400" },
            { label: "Calculator", icon: <Printer className="w-5 h-5" />, path: "/calculator", color: "text-purple-600 bg-purple-50 dark:bg-purple-500/10 dark:text-purple-400" },
            { label: "Reports", icon: <BarChart3 className="w-5 h-5" />, path: "/reports", color: "text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400" },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary transition-colors group"
            >
              <div className={cn("p-2.5 rounded-xl transition-transform group-hover:scale-110", action.color)}>
                {action.icon}
              </div>
              <span className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 card p-5 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
              Revenue & Jobs Trend
            </h3>
            <div className="flex items-center gap-4 text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary-500" /> Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Jobs</span>
            </div>
          </div>
          <div className="h-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
              <AreaChart data={MONTHLY_DATA}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: theme === "dark" ? "#94a3b8" : "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: theme === "dark" ? "#94a3b8" : "#64748b" }} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#1e293b" : "#fff",
                    border: `1px solid ${theme === "dark" ? "#475569" : "#e2e8f0"}`,
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number | undefined, name: string | undefined) => {
                    const safeValue = value ?? 0;
                    return [
                      name === "revenue" ? formatCurrency(safeValue) : safeValue,
                      name === "revenue" ? "Revenue" : "Jobs",
                    ];
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" />
                <Line type="monotone" dataKey="jobs" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Binding Distribution Pie */}
        <div className="card p-5 min-w-0">
          <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
            Binding Type Distribution
          </h3>
          <div className="h-48 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
              <RechartsPie>
                <Pie
                  data={BINDING_DISTRIBUTION}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {BINDING_DISTRIBUTION.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#1e293b" : "#fff",
                    border: `1px solid ${theme === "dark" ? "#475569" : "#e2e8f0"}`,
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number | undefined) => [`${value ?? 0}%`, "Share"]}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {BINDING_DISTRIBUTION.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-text-light-secondary dark:text-text-dark-secondary">{item.name}</span>
                </div>
                <span className="font-medium text-text-light-primary dark:text-text-dark-primary">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Jobs */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
              Recent Jobs
            </h3>
            <button onClick={() => navigate("/jobs")} className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-light-secondary dark:bg-surface-dark-tertiary">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary truncate">
                    {job.title}
                  </p>
                  <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-0.5">
                    {job.customer} • {getRelativeTime(job.date)}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-3">
                  <span className={cn("badge text-[10px]", STATUS_COLORS[job.status] || STATUS_COLORS.draft)}>
                    {job.status.replace(/_/g, " ")}
                  </span>
                  <div className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary whitespace-nowrap">
                    {formatCurrency(job.value)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
            Key Metrics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-surface-light-secondary dark:bg-surface-dark-tertiary">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-green-500" />
                <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Conversion Rate</span>
              </div>
              <div className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                {stats.conversionRate.toFixed(1)}%
              </div>
              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${stats.conversionRate}%` }} />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-light-secondary dark:bg-surface-dark-tertiary">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Avg Job Value</span>
              </div>
              <div className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                {formatCurrency(stats.avgJobValue)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-light-secondary dark:bg-surface-dark-tertiary">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Pending Approvals</span>
              </div>
              <div className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                {stats.pendingApprovals}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-light-secondary dark:bg-surface-dark-tertiary">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-red-500" />
                <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Overdue Jobs</span>
              </div>
              <div className={cn(
                "text-2xl font-bold",
                stats.overdueJobs > 0
                  ? "text-danger-600 dark:text-danger-400"
                  : "text-text-light-primary dark:text-text-dark-primary"
              )}>
                {stats.overdueJobs}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
