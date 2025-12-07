"use client";

type CaseCardProps = {
  title: string;
  counterparty: string;
  status: string;
  risk?: string;
  nextDeadline?: string;
};

export function CaseCard({
  title,
  counterparty,
  status,
  risk = "Critical",
  nextDeadline = "Standstill Agreement",
}: CaseCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Active Dispute</p>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-600">Counterparty: {counterparty}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-red-100 px-3 py-1 text-[11px] font-semibold text-red-700">
            {risk}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
            {status}
          </span>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-slate-500">Next Deadline</span>
          <span className="font-semibold">{nextDeadline}</span>
        </div>
      </div>
    </div>
  );
}
