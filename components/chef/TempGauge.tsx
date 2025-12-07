"use client";

type TempGaugeProps = {
  name: string;
  temp: number;
  target: number;
  status: "safe" | "warning" | "critical";
  type: "fridge" | "freezer";
};

export function TempGauge({ name, temp, target, status, type }: TempGaugeProps) {
  // Status fallback logic
  let tone: "critical" | "warning" | "safe" = status;
  if (type === "fridge" && temp > 5) tone = "critical";
  if (type === "freezer" && temp > -18) tone = "warning";

  const color =
    tone === "critical" ? "text-red-600" : tone === "warning" ? "text-amber-600" : "text-emerald-600";
  const ring =
    tone === "critical" ? "bg-red-100" : tone === "warning" ? "bg-amber-100" : "bg-emerald-100";

  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
      <p className="text-sm font-semibold text-slate-900">{name}</p>
      <p className="text-xs text-slate-500">Target {target}°C</p>

      <div className="mt-4 flex h-28 w-28 items-center justify-center rounded-full bg-slate-50 ring-4 ring-white shadow-inner">
        <div className={`flex h-24 w-24 flex-col items-center justify-center rounded-full ${ring}`}>
          <span className={`text-2xl font-bold ${color}`}>{temp}°C</span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {tone === "critical" ? "Critical" : tone === "warning" ? "Warning" : "Safe"}
          </span>
        </div>
      </div>
    </div>
  );
}
