"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Target,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TAB_ITEMS = [
  { label: "Inicio", href: "/dashboard", icon: LayoutDashboard },
  { label: "Movimientos", href: "/transactions", icon: ArrowLeftRight },
  { label: "Presupuestos", href: "/budgets", icon: PieChart },
  { label: "Metas", href: "/goals", icon: Target },
  { label: "Asistente", href: "/assistant", icon: Bot },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#121214]/90 backdrop-blur-2xl border-t border-[#e8e8ed] dark:border-white/[0.08] px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.6)]"
      aria-label="Navegación móvil"
    >
      <div className="grid grid-cols-5 items-center justify-around">
        {TAB_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-1 transition-all duration-150 min-h-[48px] rounded-xl active:scale-95",
                isActive
                  ? "text-[#0071e3] dark:text-[#2997ff] font-semibold"
                  : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]"
              )}
            >
              <div
                className={cn(
                  "p-1 rounded-lg transition-colors",
                  isActive ? "bg-[#0071e3]/10 dark:bg-[#0071e3]/20" : "bg-transparent"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-[#0071e3] dark:text-[#2997ff]" : "text-[#6e6e73] dark:text-[#86868b]")} />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
