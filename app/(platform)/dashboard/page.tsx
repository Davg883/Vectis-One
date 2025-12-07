"use client";

import Link from "next/link";
import {
  Truck,
  ShieldCheck,
  HardHat,
  ChefHat,
  Landmark,
  MapPin,
  ArrowUpRight,
  Lock,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const modules = [
  {
    title: "TransportOS",
    desc: "Fleet compliance, ADR hazardous goods tracking, and maintenance logic.",
    icon: Truck,
    href: "/transport",
    status: "live",
    color: "text-blue-600",
    gradient: "from-blue-500/20 to-blue-500/5",
  },
  {
    title: "LogisticsOS",
    desc: "Customer intelligence, UPRN address verification, and sales ledger analysis.",
    icon: MapPin,
    href: "/logistics",
    status: "live",
    color: "text-purple-600",
    gradient: "from-purple-500/20 to-purple-500/5",
  },
  {
    title: "AegisOS",
    desc: "Strategic legal defence, GDPR vaults, and automated regulatory filings.",
    icon: ShieldCheck,
    href: "/aegis",
    status: "live",
    color: "text-indigo-600",
    gradient: "from-indigo-500/20 to-indigo-500/5",
  },
  {
    title: "CivicOS",
    desc: "Planning intelligence. Anomaly detection for public comments and sentiment.",
    icon: Landmark,
    href: "/civic",
    status: "live",
    color: "text-emerald-600",
    gradient: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    title: "SiteOS",
    desc: "Autonomous safety management. Computer vision for hazard detection.",
    icon: HardHat,
    href: "/site",
    status: "live",
    color: "text-orange-600",
    gradient: "from-orange-500/20 to-orange-500/5",
  },
  {
    title: "ChefOS",
    desc: "Automated hygiene compliance and kitchen intelligence engine.",
    icon: ChefHat,
    href: "/chef",
    status: "beta",
    color: "text-rose-600",
    gradient: "from-rose-500/20 to-rose-500/5",
  },
];

export default function DashboardGateway() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 font-sans">
      {/* ABSTRACT BACKGROUND MESH */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-slate-200 to-transparent -z-10" />
      <div className="absolute -top-40 -right-40 w-[800px] h-[800px] bg-blue-100/50 rounded-full blur-3xl -z-10" />
      <div className="absolute top-40 -left-20 w-[600px] h-[600px] bg-orange-50/50 rounded-full blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto p-8 md:p-16">
        {/* HEADER */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-slate-200 backdrop-blur-sm text-xs font-bold text-slate-600 mb-6 shadow-sm">
            <Activity className="w-3 h-3 text-green-500" />
            SYSTEMS NOMINAL
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-4">
            Vectis One <span className="text-slate-400 font-light">| Interface</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl leading-relaxed">
            Welcome to Vectis One. Select your operational environment. All telemetry streams are synchronized.
          </p>
        </div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod) => (
            <Link
              key={mod.title}
              href={mod.href}
              className="group relative flex flex-col justify-between p-8 rounded-3xl border border-white/40 bg-white/60 backdrop-blur-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {/* Card Gradient Overlay */}
              <div
                className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${mod.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
              />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-300">
                    <mod.icon className={`w-8 h-8 ${mod.color}`} />
                  </div>
                  {mod.status === "beta" ? (
                    <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-slate-200">
                      WAITLIST
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0">
                      LIVE
                    </Badge>
                  )}
                </div>

                <h3 className="text-2xl font-bold text-slate-900 mb-3">{mod.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  {mod.desc}
                </p>
              </div>

              <div className="relative z-10 mt-8 pt-6 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-700 transition-colors">
                  Launch Module
                </span>
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:bg-slate-900 group-hover:text-white transition-all">
                  {mod.status === "beta" ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4" />
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
