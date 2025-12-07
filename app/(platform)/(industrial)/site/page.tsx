import { HardHat, Waves } from "lucide-react";

export default function SitePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
              SiteOS
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              On-site operations & field telemetry
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[var(--color-brand-bg)] px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-black/20">
            <HardHat className="h-4 w-4" />
            Field mode
          </div>
        </div>
        <p className="text-sm text-slate-600">
          Field teams, site beacons, and safety checks consolidated into a single stream.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Active sites", value: "62", note: "7 in commissioning" },
          { label: "Beacon uptime", value: "99.2%", note: "Minor drift at 2 sites" },
          { label: "Crew check-ins", value: "412 today", note: "All acknowledged" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-100"
          >
            <p className="text-sm font-semibold text-slate-900">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
            <p className="text-sm text-slate-600">{item.note}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Environment
            </p>
            <p className="text-lg font-semibold text-slate-900">
              Site conditions
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            <Waves className="h-4 w-4 text-[var(--color-brand-accent)]" />
            Stable air quality
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            { label: "Weather holds", value: "0" },
            { label: "Noise monitors", value: "12 readings elevated" },
            { label: "Safety briefings", value: "38 completed" },
            { label: "Power quality", value: "1.02 p.u." },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
            >
              <span className="font-semibold text-slate-900">{item.label}</span>
              <span>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
