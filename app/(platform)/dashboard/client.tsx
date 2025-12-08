"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  AlertTriangle,
  Gavel,
  HardHat,
  Landmark,
  ShieldCheck,
  Truck,
} from "lucide-react";

type ExecSummary = {
  transport: {
    groundedCount: number;
    criticalVehicle: string | null;
  };
  aegis: {
    criticalCases: number;
    nextDeadline: number | null;
  };
  civic: {
    anomalyCount: number;
  };
  site: {
    openCriticalHazards: number;
  };
  feed: Array<{
    type: "maintenance" | "legal" | "hazard" | "site";
    title: string;
    date: number;
    severity?: string;
  }>;
};

export default function ClientDashboard() {
  const data = useQuery(api.dashboard.getExecutiveSummary) as ExecSummary | undefined;
  const seedTransport = useMutation(api.transport.seedTransportData);
  const seedAegis = useMutation(api.aegis.seedAegisData);
  const seedCivic = useMutation(api.civic.seedPlanningData);

  const handleGlobalSim = async () => {
    await Promise.all([
      seedTransport().catch(() => undefined),
      seedAegis().catch(() => undefined),
      seedCivic().catch(() => undefined),
    ]);
  };

  const transport = data?.transport ?? { groundedCount: 0, criticalVehicle: null };
  const aegis = data?.aegis ?? { criticalCases: 0, nextDeadline: null };
  const civic = data?.civic ?? { anomalyCount: 0 };
  const site = data?.site ?? { openCriticalHazards: 0 };
  const feed = data?.feed ?? [];

  const cards = useMemo(
    () => [
      {
        title: "Transport",
        icon: Truck,
        badge:
          transport.groundedCount > 0
            ? { label: "CRITICAL", className: "bg-red-100 text-red-700" }
            : { label: "LIVE", className: "bg-sky-100 text-sky-700" },
        status:
          transport.groundedCount > 0
            ? `${transport.groundedCount} Asset Grounded`
            : "Fleet Operational",
        detail:
          transport.groundedCount > 0 && transport.criticalVehicle
            ? `${transport.criticalVehicle} requires action`
            : "All routes nominal",
      },
      {
        title: "Aegis",
        icon: ShieldCheck,
        badge:
          aegis.criticalCases > 0
            ? { label: "ACTION REQ", className: "bg-indigo-100 text-indigo-700" }
            : { label: "LIVE", className: "bg-sky-100 text-sky-700" },
        status:
          aegis.criticalCases > 0
            ? `${aegis.criticalCases} Critical Case${aegis.criticalCases > 1 ? "s" : ""}`
            : "Compliance Stable",
        detail:
          aegis.criticalCases > 0
            ? "Phillips 66 Dispute Active"
            : "No active disputes",
      },
      {
        title: "Site",
        icon: HardHat,
        badge:
          site.openCriticalHazards > 0
            ? { label: "SAFETY ALERT", className: "bg-orange-100 text-orange-700" }
            : { label: "LIVE", className: "bg-sky-100 text-sky-700" },
        status:
          site.openCriticalHazards > 0
            ? `${site.openCriticalHazards} Critical Hazard${site.openCriticalHazards > 1 ? "s" : ""}`
            : "Sites Operational",
        detail:
          site.openCriticalHazards > 0
            ? "Immediate rectification required"
            : "Safety posture nominal",
      },
      {
        title: "Civic",
        icon: Landmark,
        badge:
          civic.anomalyCount > 0
            ? { label: "WARNING", className: "bg-amber-100 text-amber-700" }
            : { label: "LIVE", className: "bg-sky-100 text-sky-700" },
        status:
          civic.anomalyCount > 0
            ? `${civic.anomalyCount} Anomal${civic.anomalyCount > 1 ? "ies" : "y"}`
            : "Mesh Stable",
        detail:
          civic.anomalyCount > 0
            ? "Bot Activity Detected"
            : "Public services nominal",
      },
    ],
    [transport, aegis, site, civic]
  );

  return (
    <div className="space-y-6 px-4 py-6 md:px-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
          Mission Control
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            Aegis Logistics | Mission Control
          </h1>
          <button
            type="button"
            onClick={handleGlobalSim}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
          >
            Activate All Systems
          </button>
        </div>
        <p className="text-sm text-slate-600">
          High-density snapshot of operational surfaces.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100"
          >
            {/*
              Normalize icon to capitalized component for TSX compliance.
            */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const CardIcon = card.icon;
                  return (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-900 ring-1 ring-slate-100">
                      <CardIcon className="h-5 w-5" />
                    </div>
                  );
                })()}
                <p className="text-sm font-semibold text-slate-900">
                  {card.title}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${card.badge.className}`}
              >
                {card.badge.label}
              </span>
            </div>
            <p className="mt-3 text-lg font-semibold text-slate-900">
              {card.status}
            </p>
            <p className="text-sm text-slate-600">{card.detail}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Executive Feed
            </p>
            <p className="text-lg font-semibold text-slate-900">
              Recent Activities
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {feed.length === 0 && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              No recent events.
            </div>
          )}
          {feed.map((item, idx) => {
            const Icon =
              item.type === "maintenance"
                ? Truck
                : item.type === "legal"
                ? Gavel
                : AlertTriangle;
            return (
              <div
                key={`${item.type}-${idx}-${item.date}`}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-900 ring-1 ring-slate-200">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(item.date).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
