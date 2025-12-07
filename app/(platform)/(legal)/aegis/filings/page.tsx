"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type DashboardData = {
  deadlines: Array<{
    _id: string;
    title?: string;
    date?: number;
    deadline?: number;
    type?: string;
    completed?: boolean;
  }>;
};

export default function FilingsPage() {
  const data = useQuery(api.aegis.getAegisDashboard) as DashboardData | undefined;
  const filings = data?.deadlines ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">AegisOS</p>
        <h1 className="text-2xl font-semibold text-slate-900">Regulatory Submission Log</h1>
        <p className="text-sm text-slate-600">
          Upcoming filings and standstill agreements.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100">
        <div className="grid grid-cols-4 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Title</span>
          <span>Type</span>
          <span>Deadline</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-slate-100 text-sm">
          {filings.length === 0 && (
            <div className="px-4 py-3 text-slate-600">No filings scheduled.</div>
          )}
          {filings.map((f) => (
            <div key={f._id} className="grid grid-cols-4 px-4 py-3">
              <span className="font-semibold text-slate-900">{f.title ?? "Filing"}</span>
              <span className="text-slate-600">{f.type ?? "General"}</span>
              <span className="text-slate-600">
                {f.deadline ? new Date(f.deadline).toLocaleDateString() : "TBD"}
              </span>
              <span className="text-slate-600">{f.completed ? "Submitted" : "Pending"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
