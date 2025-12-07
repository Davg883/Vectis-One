"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RefreshCcw } from "lucide-react";
import { TankGauge } from "@/components/depot/TankGauge";
import { EquipmentCard } from "@/components/depot/EquipmentCard";

type DepotData = {
  tanks: Array<{
    name: string;
    product: "UN1202" | "UN1223" | "UN1203";
    capacity: number;
    currentLevel: number;
    deadstock: number;
    status: string;
    lastDip: number;
  }>;
  equipment: Array<{
    name: string;
    type: string;
    serial: string;
    serviceIntervalMonths: number;
    lastService: number;
    status: "operational" | "defect" | "service_due";
    notes?: string;
  }>;
  kpi: {
    fillLevel: number;
    alerts: number;
  };
};

export default function DepotPage() {
  const data = useQuery(api.depot.getDepotDashboard) as DepotData | undefined;
  const seed = useMutation(api.depot.seedDepotData);

  const totalFill = data?.kpi.fillLevel ?? 0;
  const alertCount = data?.kpi.alerts ?? 0;
  const tanks = data?.tanks ?? [];
  const equipment = data?.equipment ?? [];

  const lowTanks = useMemo(() => tanks.filter((t) => (t.currentLevel / t.capacity) * 100 < 15), [tanks]);

  return (
    <div className="space-y-6 px-4 py-6 md:px-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
          DepotOS
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            DepotOS | Wet Stock Management
          </h1>
          <button
            type="button"
            onClick={() => seed()}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Seed Data
          </button>
        </div>
        <p className="text-sm text-slate-600">
          Live storage telemetry and critical infrastructure status.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-100">
          <p className="text-sm font-semibold text-slate-900">Total Stock</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totalFill}%</p>
          <p className="text-sm text-slate-600">
            {lowTanks.length > 0 ? `${lowTanks.length} low-level warning${lowTanks.length > 1 ? "s" : ""}` : "Above safety thresholds"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-100">
          <p className="text-sm font-semibold text-slate-900">Infrastructure Alerts</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{alertCount}</p>
          <p className="text-sm text-slate-600">Equipment requiring action</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4 md:grid-cols-2 lg:col-span-2">
          {tanks.map((tank) => (
            <TankGauge
              key={tank.name}
              name={tank.name}
              product={tank.product}
              current={tank.currentLevel}
              capacity={tank.capacity}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
          <p className="text-sm font-semibold text-slate-900">Infrastructure</p>
          <div className="mt-3 grid gap-3">
            {equipment.map((eq) => (
              <EquipmentCard
                key={eq.serial}
                name={eq.name}
                serial={eq.serial}
                status={eq.status}
                nextServiceDate={eq.lastService + eq.serviceIntervalMonths * 30 * 24 * 60 * 60 * 1000}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
