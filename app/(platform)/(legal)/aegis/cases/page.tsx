"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type CaseRecord = {
  _id: string;
  title?: string;
  counterparty?: string;
  strategy?: string;
  financialExposure?: number;
  probabilityOfSuccess?: number;
  nextActionDate?: number;
  status?: string;
};

const badgeClass = (status?: string) => {
  const s = (status ?? "").toLowerCase();
  if (s === "critical") return "bg-red-100 text-red-700";
  return "bg-blue-100 text-blue-700";
};

export default function AegisCasesPage() {
  const cases = (useQuery(api.aegis.getAllCases) as CaseRecord[] | undefined) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">AegisOS</p>
          <h1 className="text-2xl font-semibold text-slate-900">Case Docket | Active Litigation</h1>
          <p className="text-sm text-slate-600">
            Strategic disputes with risk posture, exposure, and next actions.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
        >
          Register New Dispute
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100">
        <table className="w-full border-collapse text-sm text-slate-800">
          <thead>
            <tr className="bg-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 text-left">Ref ID</th>
              <th className="px-4 py-3 text-left">Opponent / Title</th>
              <th className="px-4 py-3 text-left">Strategy</th>
              <th className="px-4 py-3 text-left">Exposure</th>
              <th className="px-4 py-3 text-left">Probability</th>
              <th className="px-4 py-3 text-left">Next Action</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {cases.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-slate-500">
                  No active cases.
                </td>
              </tr>
            )}
            {cases.map((c) => {
              const refId = c.title ? `LEG-${c.title.slice(0, 3).toUpperCase()}-${(c._id ?? "").slice(-4)}` : c._id;
              const exposure = c.financialExposure ?? 0;
              const prob = c.probabilityOfSuccess ?? 0;
              const next = c.nextActionDate
                ? new Date(c.nextActionDate).toLocaleDateString(undefined, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "TBD";
              return (
                <tr key={c._id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{refId}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{c.counterparty ?? "Opponent"}</div>
                    <div className="text-xs text-slate-500">{c.title ?? "Case Title"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                      {c.strategy ?? "TBD"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    £{exposure.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <span className="font-semibold">{prob}%</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{next}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${badgeClass(c.status)}`}>
                      {c.status ?? "Active"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
