"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Activity, AlertTriangle, Bot, Fuel, HardHat, Shield, Truck, Warehouse, Circle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TankGauge } from "@/components/depot/TankGauge";
import { AnomalyChart } from "@/components/dashboard/AnomalyChart";

export default function AegisMissionControl() {
  const summary = useQuery(api.dashboard.getExecutiveSummary);
  const depot = useQuery(api.depot.getDepotDashboard);
  const transport = useQuery(api.transport.getDashboardData);

  const transportKpi = summary?.transport;
  const siteKpi = summary?.site;
  const civicKpi = summary?.civic;
  const feed = summary?.feed ?? [];

  const depotFill = depot?.kpi?.fillLevel ?? 0;
  const totalFleet = transport?.kpi?.totalFleet ?? 0;
  const grounded = transport?.kpi?.groundedAssets ?? 0;
  const fleetAvailability = totalFleet > 0 ? Math.round(((totalFleet - grounded) / totalFleet) * 100) : 0;

  const groundedAssets = transport?.assets?.filter((a) => a.status === "grounded") ?? [];

  return (
    <div className="space-y-6 px-4 py-6 md:px-8 bg-grid-pattern">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Aegis</p>
          <h1 className="text-3xl font-semibold text-slate-900">Aegis Logistics | Mission Control</h1>
          <p className="text-sm text-slate-600">Aggregated view across fleet, fuel, and intelligence.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          System Heartbeat
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          title="Global Safety Score"
          value="92%"
          icon={Shield}
          tone="ok"
          subtitle="Rolling safety posture"
        />
        <KpiCard
          title="Fleet Availability"
          value={`${fleetAvailability}%`}
          icon={Truck}
          tone={grounded > 0 ? "alert" : "ok"}
          subtitle={`${grounded} grounded`}
        />
        <KpiCard
          title="Fuel Stock"
          value={`${depotFill}%`}
          icon={Fuel}
          tone={depotFill < 25 ? "warn" : "ok"}
          subtitle="DepotOS live levels"
        />
        <KpiCard
          title="Active Legal Risks"
          value={summary?.aegis?.criticalCases ?? 0}
          icon={AlertTriangle}
          tone={(summary?.aegis?.criticalCases ?? 0) > 0 ? "alert" : "ok"}
          subtitle="Critical disputes"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm shadow-slate-100">
            <CardHeader>
              <p className="text-sm font-semibold text-slate-900">Live Physical Status</p>
              <p className="text-xs text-slate-500">Fuel infrastructure and grounded fleet alerts.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {depot?.tanks?.map((tank) => (
                  <TankGauge
                    key={tank._id}
                    name={tank.name}
                    product={tank.product}
                    current={tank.currentLevel}
                    capacity={tank.capacity}
                  />
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Grounded Assets
                </div>
                {groundedAssets.length === 0 ? (
                  <p className="text-sm text-slate-600">No grounded assets detected.</p>
                ) : (
                  <div className="space-y-2">
                    {groundedAssets.map((asset) => (
                      <div
                        key={asset._id}
                        className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-100"
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                          <Truck className="h-4 w-4" />
                          <span className="font-semibold">{asset.reg}</span>
                        </div>
                        <span className="text-xs">ADR/PMI overdue</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <Card className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm shadow-slate-100">
            <CardHeader>
              <p className="text-sm font-semibold text-slate-900">Intelligence Feed</p>
              <p className="text-xs text-slate-500">Legal deadlines, safety alerts, and ops signals.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {feed.length === 0 && <p className="text-sm text-slate-600">No recent activity.</p>}
              {feed.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-800 ring-1 ring-slate-200">
                      <FeedIcon type={item.type} />
                    </span>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">{item.title ?? "Event"}</span>
                      <span className="text-xs text-slate-500">
                        {item.date ? new Date(item.date).toLocaleDateString() : "No date"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-slate-500">
                    {item.type ?? "signal"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm shadow-slate-100">
            <CardHeader>
              <p className="text-sm font-semibold text-slate-900">Bot Activity</p>
              <p className="text-xs text-slate-500">CivicOS anomaly detection.</p>
            </CardHeader>
            <CardContent>
              <AnomalyChart />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  subtitle,
  tone = "ok",
}: {
  title: string;
  value: string | number;
  icon: any;
  subtitle?: string;
  tone?: "ok" | "warn" | "alert";
}) {
  const toneClass =
    tone === "alert"
      ? "border-red-200 bg-red-50/70 text-red-800"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50/70 text-amber-800"
      : "border-emerald-200 bg-emerald-50/70 text-emerald-800";

  return (
    <Card className={`rounded-2xl border shadow-sm shadow-slate-100 ${toneClass}`}>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 text-slate-800 ring-1 ring-white/60">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-slate-600">{title}</span>
            <span className="text-lg font-semibold text-slate-900">{value}</span>
            {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FeedIcon({ type }: { type?: string }) {
  if (type === "legal") return <AlertTriangle className="h-4 w-4 text-indigo-600" />;
  if (type === "site") return <HardHat className="h-4 w-4 text-orange-600" />;
  if (type === "transport") return <Truck className="h-4 w-4 text-emerald-600" />;
  if (type === "depot") return <Warehouse className="h-4 w-4 text-slate-700" />;
  if (type === "civic") return <Bot className="h-4 w-4 text-amber-600" />;
  return <Activity className="h-4 w-4 text-slate-500" />;
}
