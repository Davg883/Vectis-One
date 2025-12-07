"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RefreshCcw } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { AssetCard } from "@/components/transport/AssetCard";

type TransportAsset = {
  _id: Id<"assets">;
  reg: string;
  make?: string;
  model?: string;
  technicalSpecs?: {
    tankCode?: string;
  };
  status: "operational" | "grounded";
  compliance?: {
    motExpiry?: number;
    pmiNextDue?: number;
    adrExpiry?: number;
    tachoExpiry?: number;
    tachographCalibrationExpiry?: number;
    tankTestExpiry?: number;
    slpExpiry?: number;
  };
};

type Operator = {
  name: string;
  role?: string;
  status?: "active" | "suspended";
  licence?: {
    categories?: string[];
  };
};

type TransportData = {
  assets: TransportAsset[];
  kpi: {
    groundedAssets: number;
    totalFleet: number;
  };
  operators?: Operator[];
};

function formatDate(date?: number) {
  if (!date) return "TBD";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "TBD";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function TransportPage() {
  const data = useQuery(api.transport.getDashboardData) as TransportData | undefined;
  const seed = useMutation(api.transport.seedTransportData);

  const kpi = data?.kpi ?? { groundedAssets: 0, totalFleet: 0 };
  const totalFleet = kpi.totalFleet ?? 0;
  const grounded = kpi.groundedAssets ?? 0;
  const compliancePct =
    totalFleet > 0 ? Math.max(0, Math.min(100, ((totalFleet - grounded) / totalFleet) * 100)) : 0;

  const nextInspection = useMemo(() => {
    const dates =
      data?.assets
        ?.map((asset) => asset.compliance?.pmiNextDue)
        .filter((d): d is number => Boolean(d))
        .map((d) => new Date(d))
        .filter((d) => !Number.isNaN(d.getTime())) ?? [];
    if (!dates.length) return "TBD";
    const soonest = dates.reduce((min, curr) => (curr < min ? curr : min), dates[0]);
    return soonest.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }, [data?.assets]);

  const assets = data?.assets ?? [];
  const operators = data?.operators ?? [];

  return (
    <div className="space-y-6 px-4 py-6 md:px-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
          TransportOS
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            TransportOS | Fleet Command
          </h1>
          <button
            type="button"
            onClick={() => seed()}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Initialize Fleet Data
          </button>
        </div>
        <p className="text-sm text-slate-600">
          Live fleet telemetry, compliance posture, and asset status.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-100">
          <p className="text-sm font-semibold text-slate-900">Total Fleet</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totalFleet}</p>
          <p className="text-sm text-slate-600">Across all active corridors</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-100">
          <p className="text-sm font-semibold text-slate-900">Compliance Status</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {compliancePct.toFixed(1)}%
          </p>
          <p className="text-sm text-slate-600">
            {totalFleet - grounded} / {totalFleet} operational
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-100">
          <p className="text-sm font-semibold text-slate-900">Next Inspection</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {nextInspection}
          </p>
          <p className="text-sm text-slate-600">Soonest PMI due</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {assets.map((asset) => (
          <AssetCard
            key={asset._id}
            id={asset._id}
            reg={asset.reg}
            make={asset.make ?? ""}
            model={asset.model ?? ""}
            status={asset.status}
            compliance={asset.compliance ?? {}}
            tech={asset.technicalSpecs ?? {}}
          />
        ))}
      </div>

      {operators.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Operator Roster
              </p>
              <p className="text-lg font-semibold text-slate-900">
                Live handoff-ready crew
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {operators.map((op) => {
              const isSuspended = op.status === "suspended";
              const badgeClasses = isSuspended
                ? "bg-red-100 text-red-700 ring-red-200"
                : "bg-emerald-50 text-emerald-700 ring-emerald-100";
              const badgeLabel = isSuspended ? "SUSPENDED" : "READY";
              const categories = op.licence?.categories?.length
                ? op.licence.categories.join(" / ")
                : undefined;

              return (
                <div
                  key={op.name}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm text-slate-700"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{op.name}</p>
                    {categories && <p className="text-xs text-slate-500">Licence: {categories}</p>}
                    {op.role && <p className="text-xs text-slate-500">{op.role}</p>}
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${badgeClasses}`}
                  >
                    {badgeLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
