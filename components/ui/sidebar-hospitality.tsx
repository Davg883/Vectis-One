"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChefHat, ClipboardCheck, Sparkles, FileText } from "lucide-react";

const routes = [
  { label: "Kitchen Command", href: "/chef", icon: ChefHat },
  { label: "Food Safety Logs", href: "/chef/logs", icon: ClipboardCheck },
  { label: "Cleaning Rotas", href: "/chef/cleaning", icon: Sparkles },
  { label: "Supplier Invoices", href: "/chef/invoices", icon: FileText },
];

export function SidebarHospitality() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-full flex-col border-r border-white/10 bg-gradient-to-b from-rose-950 to-rose-900 text-white shadow-2xl shadow-black/30">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
          <ChefHat className="h-6 w-6 text-rose-300" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/60">ChefOS</p>
          <p className="text-lg font-semibold">Hospitality</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {routes.map((route) => {
          const active = pathname === route.href;
          return (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ring-1 ring-transparent hover:ring-white/10",
                active
                  ? "bg-white/10 text-white ring-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-0 h-full w-1 rounded-full transition",
                  active ? "bg-rose-300" : "bg-transparent group-hover:bg-white/30"
                )}
              />
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-white">
                <route.icon className="h-5 w-5" />
              </div>
              <span className="flex-1 text-left">{route.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
