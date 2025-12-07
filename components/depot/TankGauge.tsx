"use client";

type TankGaugeProps = {
  name: string;
  product: "UN1202" | "UN1223" | "UN1203";
  current: number;
  capacity: number;
};

const productGradient: Record<TankGaugeProps["product"], string> = {
  UN1223: "from-amber-300 via-amber-400 to-orange-500", // Kero
  UN1202: "from-rose-500 via-red-500 to-amber-800", // Gas Oil
  UN1203: "from-sky-500 via-blue-500 to-indigo-600", // Petrol
};

export function TankGauge({ name, product, current, capacity }: TankGaugeProps) {
  const pct = Math.max(0, Math.min(100, (current / capacity) * 100));
  const low = pct < 15;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
      <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
        <span>{name}</span>
        <span className="text-xs font-mono text-slate-500">{product}</span>
      </div>
      <div className="mt-3 flex items-end gap-4">
        <div className="relative h-48 w-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${productGradient[product]}`}
            style={{ height: `${pct}%` }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-semibold text-slate-900">
              {current.toLocaleString()} L
            </span>
            <span className="text-[11px] text-slate-500">{pct.toFixed(0)}%</span>
          </div>
        </div>
        <div className="flex flex-col text-sm text-slate-600">
          <span>Capacity: {capacity.toLocaleString()} L</span>
          <span>Deadstock: {(capacity * 0.04).toLocaleString()} L (est)</span>
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
