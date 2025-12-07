"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  HardHat,
  Hexagon,
  Home,
  LayoutGrid,
  LayoutDashboard,
  Landmark,
  ShieldCheck,
  Truck,
} from "lucide-react";

const routes = [
  {
    label: "Mission Control (Aegis)",
    description: "Command & compliance nerve centre",
    icon: LayoutDashboard,
    href: "/aegis",
    subItems: [
      { label: "Command Centre", href: "/aegis" },
      { label: "Legal Defence", href: "/aegis/legal" },
      { label: "Compliance Overview", href: "/aegis/compliance" },
    ],
  },
  {
    label: "Legal Defence",
    description: "War room & filings",
    href: "/aegis/legal",
    icon: ShieldCheck,
    color: "text-indigo-500",
    active: true,
    subItems: [
      { label: "War Room", href: "/aegis/legal" },
      { label: "Active Cases", href: "/aegis/cases" },
      { label: "Evidence Vault", href: "/aegis/evidence" },
      { label: "Regulatory Filings", href: "/aegis/filings" },
    ],
  },
  {
    label: "TransportOS",
    description: "Fleet & routing",
    icon: Truck,
    href: "/transport",
  },
  {
    label: "DepotOS",
    description: "Fuel storage & infrastructure",
    icon: HardHat,
    href: "/depot",
    subItems: [
      { label: "Stock Levels", href: "/depot" },
      { label: "Equipment Log", href: "/depot/equipment" },
    ],
  },
  {
    label: "LogisticsOS",
    description: "Locations & sales intelligence",
    icon: Landmark,
    href: "/logistics",
    subItems: [
      { label: "Customer Intelligence", href: "/logistics" },
    ],
  },
  {
    label: "CivicOS",
    description: "Public infrastructure",
    icon: Landmark,
    href: "/civic",
  },
  {
    label: "SiteOS",
    description: "On-site operations",
    icon: HardHat,
    href: "/site",
  },
];

export function SidebarIndustrial() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r border-white/10 bg-[var(--color-brand-bg)] text-white shadow-2xl shadow-black/30">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
          <Hexagon className="h-6 w-6 text-[var(--color-brand-accent)]" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/60">
            Vectis
          </p>
          <p className="text-lg font-semibold">Mission Control</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10 backdrop-blur">
          <p className="text-xs uppercase tracking-wide text-white/60">
            Status
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--color-status-good)] animate-pulse" />
            <p className="text-sm font-medium text-white">
              All systems stable
            </p>
          </div>
          <p className="text-[11px] text-white/50">
            Active telemetry streams synchronized.
          </p>
        </div>

        <nav className="space-y-1">
          {routes.map((route) => {
            const isActive = pathname === route.href;

            return (
              <Link
                key={route.href}
                href={route.href}
                aria-disabled={route.disabled}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  "ring-1 ring-transparent hover:ring-white/10",
                  isActive
                    ? "bg-white/10 text-white ring-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                    : "text-white/70 hover:bg-white/5 hover:text-white",
                  route.disabled && "cursor-not-allowed opacity-50 pointer-events-none"
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-0 h-full w-1 rounded-full transition",
                    isActive
                      ? "bg-[var(--color-brand-accent)]"
                      : "bg-transparent group-hover:bg-white/30"
                  )}
                />
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-white">
                  <route.icon className="h-5 w-5" />
                </div>
                <div className="flex flex-1 flex-col text-left">
                  <span>{route.label}</span>
                  <span className="text-[11px] font-normal text-white/60">
                    {route.description}
                  </span>
                </div>
                {!route.disabled && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/70">
                    Link
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10" />
      </div>

      <div className="border-t border-white/10 px-4 py-4">
        <Link
          href="/dashboard"
          className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/5"
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="text-white/80">Switch Sector (Launchpad)</span>
        </Link>
        <div className="flex items-center justify-between text-[11px] text-white/60">
          <span>Signal Chain</span>
          <span>72% utilization</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-white/10">
          <div className="h-full w-[72%] rounded-full bg-[var(--color-brand-accent)] shadow-[0_0_12px_rgba(246,115,54,0.45)]" />
        </div>
        <p className="mt-2 text-[11px] text-white/50">
          Edge, cloud, and on-site nodes synchronized.
        </p>
      </div>
    </div>
  );
}
