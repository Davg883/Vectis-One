"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { OrganizationSwitcher } from "@clerk/nextjs";
import {
  HardHat,
  Hexagon,
  LayoutGrid,
  LayoutDashboard,
  ShieldCheck,
  Truck,
} from "lucide-react";

type EnabledModule = "transport" | "depot" | "legal" | "civic";
type Route = {
  key: string;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
  href: string;
  requires?: EnabledModule;
};

const ROUTES: Route[] = [
  {
    key: "mission",
    label: "Mission Control",
    description: "Command & compliance nerve centre",
    icon: LayoutDashboard,
    href: "/aegis",
  },
  {
    key: "transport",
    label: "TransportOS",
    description: "Vehicles, defects, inspections",
    icon: Truck,
    href: "/transport",
    requires: "transport",
  },
  {
    key: "depot",
    label: "DepotOS",
    description: "Fuel tanks and stock levels",
    icon: HardHat,
    href: "/depot",
    requires: "depot",
  },
  {
    key: "legal",
    label: "Legal Defence",
    description: "Compliance deadlines",
    icon: ShieldCheck,
    href: "/aegis/legal",
    requires: "legal",
  },
] as const;

export function SidebarIndustrial() {
  const pathname = usePathname();
  const org = useQuery(api.core.organizations.getMyOrganization) as
    | { enabledModules: string[] }
    | null
    | undefined;
  const enabled = new Set(org?.enabledModules ?? []);
  const routes = ROUTES.filter((r) => !r.requires || enabled.has(r.requires));

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
        <div className="ml-auto hidden items-center rounded-xl bg-white/5 p-2 ring-1 ring-white/10 md:flex">
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/dashboard/aegis"
            afterSelectOrganizationUrl="/dashboard/aegis"
          />
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
          {org === null && (
            <div className="rounded-xl bg-white/5 p-3 text-sm text-white/70 ring-1 ring-white/10">
              Select an organization in Clerk, then initialize it from Mission Control.
            </div>
          )}
          {routes.map((route) => {
            const isActive = pathname === route.href;

            return (
              <Link
                key={route.key}
                href={route.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  "ring-1 ring-transparent hover:ring-white/10",
                  isActive
                    ? "bg-white/10 text-white ring-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
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
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/70">
                  Link
                </span>
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
