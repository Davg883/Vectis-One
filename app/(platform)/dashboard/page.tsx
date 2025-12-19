"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { RedirectToSignIn } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { Activity, ArrowUpRight, HardHat, LayoutDashboard, Lock, ShieldCheck, Truck } from "lucide-react";

type EnabledModule = "transport" | "depot" | "legal";
type ModuleCard = {
  key: string;
  title: string;
  desc: string;
  icon: typeof LayoutDashboard;
  href: string;
  status: "live" | "beta";
  color: string;
  gradient: string;
  requires?: EnabledModule;
};

const modules: ModuleCard[] = [
  {
    key: "mission",
    title: "Mission Control",
    desc: "Cross-module intelligence feed and global safety score.",
    icon: LayoutDashboard,
    href: "/aegis",
    status: "live",
    color: "text-slate-900",
    gradient: "from-slate-500/20 to-slate-500/5",
  },
  {
    key: "transport",
    title: "TransportOS",
    desc: "Vehicles, inspections, and defects.",
    icon: Truck,
    href: "/transport",
    status: "live",
    color: "text-blue-600",
    gradient: "from-blue-500/20 to-blue-500/5",
    requires: "transport",
  },
  {
    key: "depot",
    title: "DepotOS",
    desc: "Fuel tanks and wet stock visibility.",
    icon: HardHat,
    href: "/depot",
    status: "live",
    color: "text-orange-600",
    gradient: "from-orange-500/20 to-orange-500/5",
    requires: "depot",
  },
  {
    key: "legal",
    title: "Legal Defence",
    desc: "Compliance deadlines and filings control.",
    icon: ShieldCheck,
    href: "/aegis/legal",
    status: "live",
    color: "text-indigo-600",
    gradient: "from-indigo-500/20 to-indigo-500/5",
    requires: "legal",
  },
];

export default function DashboardPage() {
  return (
    <>
      <AuthLoading>
        <div className="flex h-screen w-full items-center justify-center bg-[#0f172a]">
          <div className="animate-pulse text-white">Loading Sovereign OS...</div>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <RedirectToSignIn />
      </Unauthenticated>

      <Authenticated>
        <DashboardGateway />
      </Authenticated>
    </>
  );
}

function DashboardGateway() {
  const org = useQuery(api.core.organizations.getMyOrganization) as
    | { enabledModules: string[] }
    | null
    | undefined;

  if (org === undefined) return null;

  const enabled = new Set(org?.enabledModules ?? []);
  const visibleModules = modules.filter((m) => !m.requires || enabled.has(m.requires));

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 font-sans">
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-slate-200 to-transparent -z-10" />
      <div className="absolute -top-40 -right-40 w-[800px] h-[800px] bg-blue-100/50 rounded-full blur-3xl -z-10" />
      <div className="absolute top-40 -left-20 w-[600px] h-[600px] bg-orange-50/50 rounded-full blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto p-8 md:p-16">
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-slate-200 backdrop-blur-sm text-xs font-bold text-slate-600 mb-6 shadow-sm">
            <Activity className="w-3 h-3 text-green-500" />
            SYSTEMS NOMINAL
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-4">
            Aegis Logistics <span className="text-slate-400 font-light">| Interface v19.6</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl leading-relaxed">
            Select your operational environment. Links render only for modules enabled on your organization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {org === null && (
            <div className="col-span-full rounded-3xl border border-slate-200 bg-white/80 p-6 text-sm text-slate-600 shadow-sm">
              Select an organization in Clerk, then initialize it from <span className="font-semibold">Mission Control</span>.
            </div>
          )}
          {visibleModules.map((mod) => (
            <Link
              key={mod.key}
              href={mod.href}
              className="group relative flex flex-col justify-between p-8 rounded-3xl border border-white/40 bg-white/60 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div
                className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${mod.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
              />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-300">
                    <mod.icon className={`w-8 h-8 ${mod.color}`} />
                  </div>
                  {mod.status === "beta" ? (
                    <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200">
                      WAITLIST
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0">
                      LIVE
                    </Badge>
                  )}
                </div>

                <h3 className="text-2xl font-bold text-slate-900 mb-3">{mod.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">{mod.desc}</p>
              </div>

              <div className="relative z-10 mt-8 pt-6 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-700 transition-colors">
                  Launch Module
                </span>
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:bg-slate-900 group-hover:text-white transition-all">
                  {mod.status === "beta" ? <Lock className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
