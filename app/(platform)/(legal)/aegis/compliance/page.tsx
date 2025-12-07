"use client";

export default function AegisCompliancePage() {
  return (
    <div className="space-y-4 px-4 py-6 md:px-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Aegis</p>
        <h1 className="text-2xl font-semibold text-slate-900">Compliance Overview</h1>
        <p className="text-sm text-slate-600">
          Regulatory posture, obligations, and cross-module health. (Detailed view coming soon.)
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm shadow-slate-100">
        Compliance dashboards are being aligned with Mission Control. Use the main Command Centre for live KPIs.
      </div>
    </div>
  );
}
