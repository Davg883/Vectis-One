"use client";

type TankGaugeProps = {
  name: string;
  fuelType: "Kerosene" | "Gas Oil" | "Diesel" | string;
  currentLevelLiters: number;
  capacityLiters: number;
  deadstockLiters: number;
};

const fuelGradient: Record<string, string> = {
  Kerosene: "from-amber-300 via-amber-400 to-orange-500",
  "Gas Oil": "from-rose-500 via-red-500 to-amber-800",
  Diesel: "from-sky-500 via-blue-500 to-indigo-600",
};

export function TankGauge({
  name,
  fuelType,
  currentLevelLiters,
  capacityLiters,
  deadstockLiters,
}: TankGaugeProps) {
  const pct = Math.max(0, Math.min(100, (currentLevelLiters / capacityLiters) * 100));
  const low = pct < 15;
  const gradient = fuelGradient[fuelType] ?? "from-slate-400 via-slate-500 to-slate-600";

  return (
    <div className="glass-panel flex flex-col rounded-2xl p-4 text-white ring-1 ring-white/10">
      <div className="flex items-center justify-between text-sm font-semibold text-white">
        <span>{name}</span>
        <span className="text-xs font-mono text-white/60">{fuelType}</span>
      </div>
      <div className="mt-3 flex items-end gap-4">
        <div className="relative h-48 w-16 overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${gradient}`}
            style={{ height: `${pct}%` }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-semibold text-white">
              {currentLevelLiters.toLocaleString()} L
            </span>
            <span className="text-[11px] text-white/60">{pct.toFixed(0)}%</span>
          </div>
        </div>
        <div className="flex flex-col text-sm text-white/80">
          <span>Capacity: {capacityLiters.toLocaleString()} L</span>
          <span>Deadstock: {deadstockLiters.toLocaleString()} L</span>
          {low && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-[11px] font-semibold text-red-700">
              Low Level Warning
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
