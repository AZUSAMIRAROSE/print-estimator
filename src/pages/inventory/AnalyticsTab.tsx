import { useMemo } from "react";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useMachineStore } from "@/stores/machineStore";
import { useAppStore } from "@/stores/appStore";
import { formatCurrency, formatNumber } from "@/utils/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Package, AlertTriangle, ArrowRightLeft } from "lucide-react";

const CAT_COLORS: Record<string, string> = {
    paper: "#3b82f6", plates: "#8b5cf6", finishing: "#22c55e", packing: "#f59e0b",
    ink: "#ef4444", chemicals: "#06b6d4", consumables: "#ec4899", spare_parts: "#f97316", other: "#64748b",
};

export function AnalyticsTab() {
    const { theme } = useAppStore();
    const { items, nmiRecords, transfers } = useInventoryStore();
    const { machines } = useMachineStore();

    const totalValue = items.reduce((s, i) => s + i.stock * i.costPerUnit, 0);
    const lowStock = items.filter(i => i.stock <= i.minLevel && i.status === "active");
    const totalTransferCost = transfers.reduce((s, t) => s + t.totalTransferCost, 0);

    const categoryValues = useMemo(() => {
        const map: Record<string, number> = {};
        items.forEach(i => { map[i.category] = (map[i.category] || 0) + i.stock * i.costPerUnit; });
        return Object.entries(map).map(([cat, val]) => ({
            category: cat.charAt(0).toUpperCase() + cat.slice(1).replace("_", " "),
            value: val, fill: CAT_COLORS[cat] || "#64748b",
        }));
    }, [items]);

    const categoryStockData = useMemo(() => {
        const map: Record<string, { count: number; stock: number }> = {};
        items.forEach(i => {
            if (!map[i.category]) map[i.category] = { count: 0, stock: 0 };
            map[i.category].count++; map[i.category].stock += i.stock;
        });
        return Object.entries(map).map(([cat, d]) => ({
            name: cat.charAt(0).toUpperCase() + cat.slice(1).replace("_", " "),
            items: d.count, stock: d.stock, fill: CAT_COLORS[cat] || "#64748b",
        }));
    }, [items]);

    const movementClassData = useMemo(() => {
        const map: Record<string, number> = {};
        items.forEach(i => { map[i.movementClass] = (map[i.movementClass] || 0) + 1; });
        return Object.entries(map).map(([cls, count]) => ({
            name: cls.replace("_", " "), value: count,
            fill: cls === "fast_moving" ? "#22c55e" : cls === "slow_moving" ? "#f59e0b" : "#ef4444",
        }));
    }, [items]);

    const warehouseData = useMemo(() => {
        const map: Record<string, { items: number; value: number }> = {};
        items.forEach(i => {
            if (!map[i.warehouse]) map[i.warehouse] = { items: 0, value: 0 };
            map[i.warehouse].items++; map[i.warehouse].value += i.stock * i.costPerUnit;
        });
        return Object.entries(map).map(([wh, d]) => ({ warehouse: wh, ...d }));
    }, [items]);

    const machineStatusData = useMemo(() => {
        const map: Record<string, number> = {};
        Array.from(machines.values()).forEach(m => { map[m.status] = (map[m.status] || 0) + 1; });
        return Object.entries(map).map(([status, count]) => ({
            name: status, value: count,
            fill: status === "running" ? "#22c55e" : status === "idle" ? "#3b82f6" : status === "maintenance" ? "#f59e0b" : "#64748b",
        }));
    }, [machines]);

    return (
        <div className="space-y-4">
            {/* Top Summary Cards */}
            <div className="grid grid-cols-5 gap-3">
                {[
                    { label: "Total Inventory Value", value: formatCurrency(totalValue), icon: <TrendingUp className="w-5 h-5" />, color: "text-primary-600 dark:text-primary-400", bg: "bg-primary-50 dark:bg-primary-500/10" },
                    { label: "Total Items", value: items.length, icon: <Package className="w-5 h-5" />, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
                    { label: "Low Stock Items", value: lowStock.length, icon: <AlertTriangle className="w-5 h-5" />, color: "text-danger-600 dark:text-danger-400", bg: "bg-danger-50 dark:bg-danger-500/10" },
                    { label: "Active Machines", value: Array.from(machines.values()).filter(m => m.status === "ACTIVE").length, icon: <Package className="w-5 h-5" />, color: "text-success-600 dark:text-success-400", bg: "bg-success-50 dark:bg-success-500/10" },
                    { label: "Transfer Costs", value: formatCurrency(totalTransferCost), icon: <ArrowRightLeft className="w-5 h-5" />, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10" },
                ].map(c => (
                    <div key={c.label} className="card p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`p-1.5 rounded-lg ${c.bg}`}>{c.icon}</div>
                            <p className="text-[10px] uppercase font-semibold text-text-light-tertiary dark:text-text-dark-tertiary tracking-wider">{c.label}</p>
                        </div>
                        <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Value by Category */}
                <div className="card p-4">
                    <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">Value by Category</h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                            <BarChart data={categoryValues} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} />
                                <XAxis type="number" tick={{ fontSize: 10, fill: theme === "dark" ? "#94a3b8" : "#64748b" }} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                                <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: theme === "dark" ? "#94a3b8" : "#64748b" }} width={80} />
                                <Tooltip contentStyle={{ backgroundColor: theme === "dark" ? "#1e293b" : "#fff", borderRadius: "8px", fontSize: "12px", border: `1px solid ${theme === "dark" ? "#475569" : "#e2e8f0"}` }} formatter={(v: any) => [formatCurrency(v as number), "Value"]} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Movement Classification */}
                <div className="card p-4">
                    <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">Movement Classification</h3>
                    <div className="h-56 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                            <PieChart>
                                <Pie data={movementClassData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                                    {movementClassData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Stock by Category */}
                <div className="card p-4">
                    <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">Items per Category</h3>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                            <BarChart data={categoryStockData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip contentStyle={{ backgroundColor: theme === "dark" ? "#1e293b" : "#fff", borderRadius: "8px", fontSize: "12px" }} />
                                <Bar dataKey="items" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Machine Status */}
                <div className="card p-4">
                    <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">Machine Status Distribution</h3>
                    <div className="h-52 flex items-center justify-center">
                        {machines.size > 0 ? (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                                <PieChart>
                                    <Pie data={machineStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                                        {machineStatusData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <p className="text-sm text-text-light-tertiary">No machines configured</p>}
                    </div>
                </div>
            </div>

            {/* Warehouse Distribution */}
            <div className="card p-4">
                <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">Warehouse Distribution</h3>
                <div className="grid grid-cols-3 gap-3">
                    {warehouseData.map(wh => (
                        <div key={wh.warehouse} className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-lg p-3 text-center">
                            <p className="text-xs font-semibold text-text-light-primary dark:text-text-dark-primary">{wh.warehouse}</p>
                            <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mt-1">{wh.items} items</p>
                            <p className="text-[11px] text-text-light-tertiary">{formatCurrency(wh.value)}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
