import { useState, useRef } from "react";
import { cn } from "@/utils/cn";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export function Tooltip({ content, children, position = "top", delay = 300 }: TooltipProps) {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function enter() {
    timer.current = setTimeout(() => setShow(true), delay);
  }
  function leave() {
    clearTimeout(timer.current);
    setShow(false);
  }

  const posClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className="relative inline-flex" onMouseEnter={enter} onMouseLeave={leave}>
      {children}
      {show && (
        <div className={cn(
          "absolute z-[300] px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap",
          "bg-gray-900 dark:bg-gray-700 text-white shadow-lg",
          "animate-fade-in pointer-events-none",
          posClasses[position]
        )}>
          {content}
        </div>
      )}
    </div>
  );
}