"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  CreateOrganization,
  OrganizationSwitcher,
  SignInButton,
  useAuth,
  useOrganization,
} from "@clerk/nextjs";
import { AlertTriangle, Fuel, Shield, Truck } from "lucide-react";
import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import { Capture } from "@/components/intelligence/Capture";
import { AskAegis } from "@/components/intelligence/AskAegis";
import { LiveFeed } from "@/components/intelligence/LiveFeed";
import { SovereignMap } from "@/components/map/SovereignMap";
import { TankGauge } from "@/components/depot/TankGauge";
import { cn } from "@/lib/utils";
import { MaintenanceConsole } from "@/components/transport/MaintenanceConsole";

type MissionControl = {
  organization: { name: string; enabledModules: string[] };
  kpi: {
    safetyScore: number;
    groundedVehicles: number;
    overdueLegalDeadlines: number;
    depotFillPct: number | null;
  };
  tanks: Array<{
    _id: string;
    name: string;
    fuelType: string;
    capacityLiters: number;
    currentLevelLiters: number;
    deadstockLiters: number;
    lastReadingTime: number;
  }>;
  feed: Array<{
    type: "transportInspection" | "legalDeadline";
    title: string;
    dueDate: number;
    severity: "critical" | "standard";
    status: "pending" | "submitted" | "overdue";
  }>;
};

export default function AegisMissionControl() {
  const auth = useAuth();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();
  const canLoadOrg = useMemo(
    () => auth.isLoaded && auth.isSignedIn && isOrgLoaded && Boolean(organization?.id),
    [auth.isLoaded, auth.isSignedIn, isOrgLoaded, organization?.id],
  );
  const org = useQuery(api.core.organizations.getMyOrganization, canLoadOrg ? {} : "skip");
  const seedAegis = useMutation(api.init.seedAegisData);
  const [initRunning, setInitRunning] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const mission = useQuery(
    api.analytics.missionControl.getMissionControlData,
    organization?.id ? { orgId: organization.id } : "skip"
  ) as MissionControl | null | undefined;

  const handleInitialize = async () => {
    if (!organization?.id) {
      console.error("❌ No Org ID found!");
      return;
    }

    if (initRunning) return;

    console.log("🚀 Starting Seed for:", organization.id);
    setInitError(null);
    setInitRunning(true);
    try {
      await seedAegis({ orgId: organization.id });
      console.log("✅ Seed Success!");
    } catch (error) {
      console.error("🔥 Seed Failed:", error);

      const rawMessage =
        error instanceof Error ? error.message : typeof error === "string" ? error : null;
      const message =
        rawMessage?.toLowerCase().includes("unauthenticated")
          ? "Convex rejected your Clerk token. Confirm a Clerk JWT template named `convex` exists and that `convex/auth.config.ts` matches your Clerk issuer domain."
          : rawMessage ?? "Initialization Failed";
      setInitError(message);
    } finally {
      setInitRunning(false);
    }
  };

  console.log("--- DEBUG DASHBOARD ---");
  console.log("Clerk Loaded:", isOrgLoaded);
  console.log("Organization:", organization?.id);
  console.log("Convex Org Record:", org);
  console.log("Convex Data:", mission);

  const seedVehicles = useMutation(api.transport.vehicles.seed);
  const seedTanks = useMutation(api.depot.tanks.seed);
  const seedLegal = useMutation(api.legal.deadlines.seed);

  if (!auth.isLoaded) {
    return (
      <div className="space-y-4 px-4 py-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">Mission Control</h1>
        <p className="text-sm text-slate-600">Loading identity…</p>
      </div>
    );
  }

  if (!auth.isSignedIn) {
    return (
      <div className="space-y-4 px-4 py-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">Mission Control</h1>
        <p className="text-sm text-slate-600">Sign in with Clerk to continue.</p>
        <SignInButton mode="modal">
          <button
            type="button"
            className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Sign in
          </button>
        </SignInButton>
      </div>
    );
  }

  if (!isOrgLoaded) {
    return (
      <div className="space-y-4 px-4 py-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">Mission Control</h1>
        <p className="text-sm text-slate-600">Loading organization context.</p>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center space-y-6 bg-slate-950 px-4 py-12">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Welcome to Aegis Logistics</h1>
          <p className="text-slate-400">To begin, you must establish an Operational Sector.</p>
        </div>

        <div className="glass-panel w-full max-w-xl p-8 rounded-xl ring-1 ring-white/10">
          <CreateOrganization afterCreateOrganizationUrl="/dashboard/aegis" />
        </div>

        <div className="text-slate-400 text-sm">
          Already have a team?{" "}
          <span className="inline-flex items-center rounded-lg bg-white/5 px-2 py-1 ring-1 ring-white/10">
            <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/dashboard/aegis" />
          </span>
        </div>
      </div>
    );
  }

  if (org === undefined) {
    return (
      <div className="space-y-4 px-4 py-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">Mission Control</h1>
        <p className="text-sm text-slate-600">Loading organization record.</p>
      </div>
    );
  }

  if (org === null) {
    return (
      <div className="space-y-4 px-4 py-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">Mission Control</h1>
        <p className="text-sm text-slate-600">
          This org has no database record yet. Initialize tenancy before loading dashboards.
        </p>
        {initError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {initError}
          </div>
        ) : null}
        <button
          type="button"
          onClick={handleInitialize}
          disabled={initRunning}
          className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {initRunning ? "Seeding Aegis..." : "Initialize Organization"}
        </button>
      </div>
    );
  }

  const kpi = mission?.kpi;
  const feed = mission?.feed ?? [];
  const tanks = mission?.tanks ?? [];

  return (
    <div className="relative min-h-[calc(100vh-2rem)] overflow-hidden">
      <SovereignMap />
      <AskAegis />

      <div className="relative z-10 mx-auto max-w-7xl space-y-4 px-4 py-6 md:px-8">
        <div className="glass-panel rounded-2xl p-4 text-white ring-1 ring-white/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Aegis</p>
              <h1 className="text-2xl font-semibold">Mission Control</h1>
              <p className="text-sm text-white/70">
                Sovereign glass view for {org?.name ?? "Organization"}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => Promise.allSettled([seedVehicles(), seedTanks(), seedLegal()])}
              className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/10 hover:bg-white/15"
            >
              Seed Demo Data
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard title="Global Safety Score" value={kpi?.safetyScore ?? "—"} icon={Shield} />
          <KpiCard
            title="Grounded Vehicles"
            value={kpi?.groundedVehicles ?? "—"}
            icon={Truck}
            tone={(kpi?.groundedVehicles ?? 0) > 0 ? "alert" : "ok"}
          />
          <KpiCard
            title="Fuel Stock"
            value={kpi?.depotFillPct != null ? `${kpi.depotFillPct}%` : "—"}
            icon={Fuel}
            tone={(kpi?.depotFillPct ?? 100) < 25 ? "warn" : "ok"}
          />
          <KpiCard
            title="Overdue Legal"
            value={kpi?.overdueLegalDeadlines ?? "—"}
            icon={AlertTriangle}
            tone={(kpi?.overdueLegalDeadlines ?? 0) > 0 ? "alert" : "ok"}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="glass-panel rounded-2xl p-4 text-white ring-1 ring-white/10">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Live Physical Status</p>
              <p className="mt-1 text-sm font-semibold">Fuel Tanks</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {tanks.length === 0 ? (
                  <div className="rounded-xl bg-white/5 px-4 py-6 text-sm text-white/70 ring-1 ring-white/10 md:col-span-2">
                    No tanks yet (or DepotOS disabled for this org).
                  </div>
                ) : (
                  tanks.map((tank) => (
                    <TankGauge
                      key={tank._id}
                      name={tank.name}
                      fuelType={tank.fuelType}
                      currentLevelLiters={tank.currentLevelLiters}
                      capacityLiters={tank.capacityLiters}
                      deadstockLiters={tank.deadstockLiters}
                    />
                  ))
                )}
              </div>
            </div>

            <MaintenanceConsole />

            <div className="glass-panel rounded-2xl p-4 text-white ring-1 ring-white/10">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Intelligence Feed</p>
              <p className="mt-1 text-sm font-semibold">Upcoming</p>
              <div className="mt-3 space-y-2">
                {feed.length === 0 ? (
                  <div className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/70 ring-1 ring-white/10">
                    No upcoming items.
                  </div>
                ) : (
                  feed.map((item, idx) => (
                    <div
                      key={`${item.type}-${idx}-${item.dueDate}`}
                      className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-white">{item.title}</span>
                        <span className="text-xs text-white/60">
                          Due {new Date(item.dueDate).toLocaleDateString()} · {item.status}
                        </span>
                      </div>
                      <span className="text-[11px] uppercase tracking-wide text-white/60">{item.severity}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass-panel rounded-2xl p-4 text-white ring-1 ring-white/10">
              <Capture />
            </div>
            <LiveFeed />
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  tone = "ok",
}: {
  title: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
  tone?: "ok" | "warn" | "alert";
}) {
  const toneRing =
    tone === "alert"
      ? "ring-red-500/20"
      : tone === "warn"
        ? "ring-amber-500/20"
        : "ring-emerald-500/20";

  return (
    <div className={cn("glass-panel rounded-2xl p-4 text-white ring-1 ring-white/10", toneRing)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wide text-white/60">{title}</span>
            <span className="text-lg font-semibold text-white">{value}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
