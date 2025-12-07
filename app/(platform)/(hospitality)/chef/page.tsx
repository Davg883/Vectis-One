"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TempGauge } from "@/components/chef/TempGauge";
import { Camera, RefreshCcw, ShieldCheck } from "lucide-react";

type ChefData = {
  kitchen: {
    name: string;
    manager: string;
    status: "open" | "closed" | "cleaning";
    hygieneRating: number;
  } | null;
  fridges: Array<{
    name: string;
    type: "fridge" | "freezer";
    targetTemp: number;
    currentTemp: number;
    status: "safe" | "warning" | "critical";
    lastCheck: number;
  }>;
};

export default function ChefPage() {
  const data = useQuery(api.chef.getChefDashboard) as ChefData | undefined;
  const seed = useMutation(api.chef.seedChefData);

  const kitchen = data?.kitchen;
  const fridges = data?.fridges ?? [];

  const averageTemp = useMemo(() => {
    if (!fridges.length) return 0;
    return (
      fridges.reduce((acc, f) => acc + f.currentTemp, 0) / fridges.length
    ).toFixed(1);
  }, [fridges]);

  return (
    <div className="space-y-6 px-4 py-6 md:px-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
          ChefOS
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            ChefOS | Kitchen Command
          </h1>
          <button
            type="button"
            onClick={() => seed()}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Initialize Kitchen
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
          >
            <Camera className="mr-2 h-4 w-4" />
            AI Log Temp
          </button>
        </div>
        <p className="text-sm text-slate-600">
          Cold chain, hygiene, and compliance at a glance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-100">
          <p className="text-sm font-semibold text-slate-900">Kitchen</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {kitchen?.name ?? "Not initialized"}
          </p>
          <p className="text-sm text-slate-600">
            Status: {kitchen?.status ?? "n/a"} • Manager: {kitchen?.manager ?? "n/a"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-100">
          <p className="text-sm font-semibold text-slate-900">Average Temp</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{averageTemp}°C</p>
          <p className="text-sm text-slate-600">Across all fridges/freezers</p>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-100">
          <div>
            <p className="text-sm font-semibold text-slate-900">Hygiene Rating</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {kitchen?.hygieneRating ?? "-"}
            </p>
            <p className="text-xs text-slate-500">Opening Checks: Complete • Closing Checks: Pending</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {fridges.map((fridge) => (
          <TempGauge
            key={fridge.name}
            name={fridge.name}
            temp={fridge.currentTemp}
            target={fridge.targetTemp}
            status={fridge.status}
            type={fridge.type}
          />
        ))}
      </div>
    </div>
  );
}
