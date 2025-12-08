"use client";

import { useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { api } from "@/convex/_generated/api";

const LocationMap = dynamic(() => import("@/components/logistics/LocationMap").then(m => m.LocationMap), {
  ssr: false,
});

export default function LogisticsPage() {
  const location = useQuery(api.logistics.getLocationByUprn, { uprn: "100060485210" });
  const profile = useQuery(
    api.logistics.getCustomerProfile,
    location ? { locationId: location._id } : "skip"
  );
  const runAnalysis = useAction(api.analysis.generateSalesNarrative);
  const seed = useMutation(api.logistics.seedLogisticsData);
  const [analyzing, setAnalyzing] = useState(false);

  const sales = profile?.sales ?? [];
  const narrative = profile?.narrative;

  const totalLitres = useMemo(
    () => sales.reduce((acc, s) => acc + (s.litres ?? 0), 0),
    [sales]
  );

  return (
    <div className="space-y-6 px-4 py-6 md:px-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
          LogisticsOS
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            LogisticsOS | Customer Intelligence
          </h1>
          <button
            type="button"
            onClick={() => seed()}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
          >
            Seed Data
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!location) return;
              setAnalyzing(true);
              try {
                await runAnalysis({ locationId: location._id });
              } finally {
                setAnalyzing(false);
              }
            }}
            disabled={!location || analyzing}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {analyzing ? "Analyzing..." : "Run Analysis"}
          </button>
        </div>
        <p className="text-sm text-slate-600">
          Address verification, sales ledger, and AI-driven recommendations.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search Address / UPRN"
            className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)]"
          />
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <span>UPRN Lookup simulated</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Customer Profile
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {profile?.location?.customerName ?? "Mrs Higgins"}
              </p>
              <p className="text-sm text-slate-600">
                {profile?.location?.address ?? "42 High St, Ventnor"} •{" "}
                {profile?.location?.postcode ?? "PO38 1RZ"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                Verified
              </span>
              <span className="text-xs font-mono text-slate-500">
                UPRN: {profile?.location?.uprn ?? "100060485210"}
              </span>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              {profile?.location ? (
                <LocationMap
                  lat={profile.location.coordinates.lat}
                  lng={profile.location.coordinates.lng}
                />
              ) : (
                "Map loading..."
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-inner shadow-slate-100">
              <p className="text-xs uppercase tracking-wide text-slate-500">Totals</p>
              <p className="text-lg font-semibold text-slate-900">
                {totalLitres.toLocaleString()} L
              </p>
              <p className="text-xs text-slate-500">Past 12 months</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
          <p className="text-sm font-semibold text-slate-900">AI Narrative</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Summary</p>
              <p>{narrative?.summary ?? "Awaiting analysis."}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Seasonality</p>
              <p>{narrative?.seasonalityAnalysis ?? "Run analysis to view insights."}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Recommendation</p>
              <p>{narrative?.recommendation ?? "Call in September to pre-sell winter fill."}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
          <p className="text-sm font-semibold text-slate-900">Recent Sales</p>
          <div className="mt-3 grid grid-cols-4 text-xs font-semibold text-slate-500">
            <span>Date</span>
            <span>Product</span>
            <span>Litres</span>
            <span>Value</span>
          </div>
          <div className="mt-2 space-y-2 text-sm text-slate-700">
            {sales.length === 0 && <p className="text-sm text-slate-500">No sales yet.</p>}
            {sales.map((s) => (
              <div
                key={`${s._id}`}
                className="grid grid-cols-4 rounded-lg bg-slate-50 px-2 py-1"
              >
                <span className="text-xs text-slate-600">
                  {new Date(s.date).toLocaleDateString()}
                </span>
                <span className="text-xs text-slate-600">{s.product}</span>
                <span className="font-semibold">{s.litres.toLocaleString()} L</span>
                <span className="text-xs text-slate-600">
                  £{(s.totalValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
          <p className="text-sm font-semibold text-slate-900">AI Narrative</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Summary</p>
              <p>{narrative?.summary ?? "Awaiting analysis."}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Seasonality</p>
              <p>{narrative?.seasonalityAnalysis ?? "Run analysis to view insights."}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Recommendation</p>
              <p>{narrative?.recommendation ?? "Call in September to pre-sell winter fill."}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
