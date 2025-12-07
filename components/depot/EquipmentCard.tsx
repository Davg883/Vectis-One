"use client";

type EquipmentCardProps = {
  name: string;
  serial: string;
  status: "operational" | "defect" | "service_due";
  nextServiceDate?: number;
};

export function EquipmentCard({ name, serial, status, nextServiceDate }: EquipmentCardProps) {
  const isOperational = status === "operational";
  const isServiceDue = status === "service_due";
  const badgeClasses = isOperational
    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
    : "bg-amber-50 text-amber-700 ring-amber-100";

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              isOperational ? "bg-[var(--color-status-good)]" : "bg-[var(--color-status-warning)]"
            }`}
          />
          <p className="text-sm font-semibold text-slate-900">{name}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${badgeClasses}`}>
          {isOperational ? "Operational" : isServiceDue ? "Service Required" : "Defect"}
        </span>
      </div>
      <p className="mt-2 text-xs font-mono text-slate-500">SN: {serial}</p>
      {nextServiceDate && (
        <p className="text-xs text-slate-600">
          Next Service: {new Date(nextServiceDate).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
