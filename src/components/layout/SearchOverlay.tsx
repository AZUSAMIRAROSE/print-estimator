import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import { SIDEBAR_ITEMS, KEYBOARD_SHORTCUTS } from "@/constants";
import {
  Search, X, ArrowRight, LayoutDashboard, FilePlus,
  Briefcase, FileCheck, Users, CreditCard, Calculator,
  Warehouse, BarChart3, Settings, Command, Hash
} from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: "page" | "action" | "shortcut" | "data";
  icon: React.ReactNode;
  path?: string;
  action?: () => void;
}

const ICON_MAP_SEARCH: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="w-4 h-4" />,
  FilePlus: <FilePlus className="w-4 h-4" />,
  Briefcase: <Briefcase className="w-4 h-4" />,
  FileCheck: <FileCheck className="w-4 h-4" />,
  Users: <Users className="w-4 h-4" />,
  CreditCard: <CreditCard className="w-4 h-4" />,
  Calculator: <Calculator className="w-4 h-4" />,
  Warehouse: <Warehouse className="w-4 h-4" />,
  BarChart3: <BarChart3 className="w-4 h-4" />,
  Settings: <Settings className="w-4 h-4" />,
};

export function SearchOverlay() {
  const navigate = useNavigate();
  const { setSearchOpen } = useAppStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Build search items
  const allItems: SearchResult[] = useMemo(() => {
    const items: SearchResult[] = [];

    // Pages
    for (const item of SIDEBAR_ITEMS) {
      items.push({
        id: `page-${item.id}`,
        title: item.label,
        subtitle: `Navigate to ${item.label}`,
        type: "page",
        icon: ICON_MAP_SEARCH[item.icon] || <Hash className="w-4 h-4" />,
        path: item.path,
      });
    }

    // Quick actions
    items.push({
      id: "action-new-estimate",
      title: "Create New Estimate",
      subtitle: "Start a new print job estimation",
      type: "action",
      icon: <FilePlus className="w-4 h-4" />,
      path: "/estimate/new",
    });
    items.push({
      id: "action-add-customer",
      title: "Add Customer",
      subtitle: "Create a new customer record",
      type: "action",
      icon: <Users className="w-4 h-4" />,
      path: "/customers",
    });

    // Shortcuts
    for (const sc of KEYBOARD_SHORTCUTS.slice(0, 6)) {
      items.push({
        id: `shortcut-${sc.keys.join("-")}`,
        title: sc.description,
        subtitle: sc.keys.join(" + "),
        type: "shortcut",
        icon: <Command className="w-4 h-4" />,
      });
    }

    return items;
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 10);
    const lower = query.toLowerCase();
    return allItems.filter(
      item =>
        item.title.toLowerCase().includes(lower) ||
        item.subtitle.toLowerCase().includes(lower)
    ).slice(0, 12);
  }, [query, allItems]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (item: SearchResult) => {
    setSearchOpen(false);
    if (item.path) navigate(item.path);
    if (item.action) item.action();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setSearchOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      handleSelect(filtered[selectedIndex]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={() => setSearchOpen(false)}
      />

      {/* Search Modal */}
      <div className="relative w-full max-w-xl mx-4 card-elevated overflow-hidden animate-scale-in">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 border-b border-surface-light-border dark:border-surface-dark-border">
          <Search className="w-5 h-5 text-text-light-tertiary dark:text-text-dark-tertiary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, actions, data..."
            className="flex-1 py-4 text-base bg-transparent border-0 outline-none text-text-light-primary dark:text-text-dark-primary placeholder:text-text-light-tertiary dark:placeholder:text-text-dark-tertiary"
          />
          <button
            onClick={() => setSearchOpen(false)}
            className="p-1.5 rounded-lg hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary"
          >
            <X className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-text-light-tertiary dark:text-text-dark-tertiary">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No results found for "{query}"</p>
            </div>
          ) : (
            filtered.map((item, index) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 transition-colors",
                  selectedIndex === index
                    ? "bg-primary-50 dark:bg-primary-500/10"
                    : "hover:bg-surface-light-secondary dark:hover:bg-surface-dark-tertiary"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg shrink-0",
                  selectedIndex === index
                    ? "bg-primary-500 text-white"
                    : "bg-surface-light-tertiary dark:bg-surface-dark-tertiary text-text-light-secondary dark:text-text-dark-secondary"
                )}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className={cn(
                    "text-sm",
                    selectedIndex === index
                      ? "text-primary-700 dark:text-primary-400 font-medium"
                      : "text-text-light-primary dark:text-text-dark-primary"
                  )}>
                    {item.title}
                  </p>
                  <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary truncate">
                    {item.subtitle}
                  </p>
                </div>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-light-tertiary dark:bg-surface-dark-tertiary text-text-light-tertiary dark:text-text-dark-tertiary uppercase">
                  {item.type}
                </span>
                {selectedIndex === index && (
                  <ArrowRight className="w-4 h-4 text-primary-500 shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-surface-light-border dark:border-surface-dark-border text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span>{filtered.length} results</span>
        </div>
      </div>
    </div>
  );
}