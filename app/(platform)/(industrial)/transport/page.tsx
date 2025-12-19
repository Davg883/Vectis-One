"use client";

import { Suspense, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { OrganizationSwitcher, SignInButton, useAuth } from "@clerk/nextjs";
import { RefreshCcw } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { MaintenanceConsole } from "@/components/transport/MaintenanceConsole";
import { useSearchParams } from "next/navigation";

type Vehicle = {
  _id: Id<"vehicles">;
  registration: string;
  make: string;
  model: string;
  type: string;
  isVOR: boolean;
  vorReason?: string;
  nextInspectionDate: number;
};

type Defect = {
  _id: Id<"defects">;
  vehicleId: Id<"vehicles">;
  description: string;
  severity: "minor" | "major" | "dangerous";
  status: "open" | "in_progress" | "rectified";
  timestamp: number;
};

const EMPTY_VEHICLES: Vehicle[] = [];
const EMPTY_DEFECTS: Defect[] = [];

export default function TransportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading TransportOS...</div>}>
      <TransportContent />
    </Suspense>
  );
}

function TransportContent() {
  const auth = useAuth();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("defectId") || undefined;

  const canLoadOrg = auth.isLoaded && auth.isSignedIn && Boolean(auth.orgId);
  const org = useQuery(api.core.organizations.getMyOrganization, canLoadOrg ? {} : "skip") as
    | { enabledModules: string[]; name: string }
    | null
    | undefined;
  const moduleEnabled = Boolean(org && org.enabledModules.includes("transport"));

  const vehicles =
    ((useQuery(api.transport.vehicles.list, moduleEnabled ? {} : "skip") as Vehicle[] | undefined) ??
      EMPTY_VEHICLES);
  const defects =
    ((useQuery(api.transport.defects.listOpen, moduleEnabled ? {} : "skip") as Defect[] | undefined) ??
      EMPTY_DEFECTS);

  const seed = useMutation(api.transport.vehicles.seed);
  const reportDefect = useMutation(api.transport.defects.reportPublic);

  const [defectVehicleId, setDefectVehicleId] = useState<Id<"vehicles"> | "">("");
  const [defectSeverity, setDefectSeverity] = useState<"minor" | "major" | "dangerous">("minor");
  const [defectDescription, setDefectDescription] = useState("");

  const totalFleet = vehicles.length;
  const grounded = vehicles.filter((v) => v.isVOR).length;
  const availabilityPct =
    totalFleet > 0 ? Math.round(((totalFleet - grounded) / totalFleet) * 100) : 0;

  const nextInspectionDate = useMemo(() => {
    if (vehicles.length === 0) return null;
    return vehicles.reduce(
      (min, v) => (v.nextInspectionDate < min ? v.nextInspectionDate : min),
      vehicles[0].nextInspectionDate
    );
  }, [vehicles]);

  const submitDefect = async () => {
    if (!defectVehicleId || !defectDescription.trim()) return;
    await reportDefect({
      vehicleId: defectVehicleId as Id<"vehicles">,
      severity: defectSeverity,
      description: defectDescription.trim(),
    });
    setDefectDescription("");
  };

  if (!auth.isLoaded) {
    return (
      <div className="space-y-4 px-4 py-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">TransportOS</h1>
        <p className="text-sm text-slate-600">Loading identity.</p>
      </div>
    );
  }

  if (!auth.isSignedIn) {
    return (
      <div className="space-y-4 px-4 py-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">TransportOS</h1>
        <p className="text-sm text-slate-600">Sign in with Clerk to access TransportOS.</p>
        <SignInButton mode="modal">
          <button
            type="button"
            className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Sign in
          </button>
        </SignInButton>
      </div>
    );
  }

  if (!auth.orgId) {
    return (
      <div className="space-y-4 px-4 py-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">TransportOS</h1>
        <p className="text-sm text-slate-600">Select an organization in Clerk to continue.</p>
        <div className="inline-flex items-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
          <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/transport" afterCreateOrganizationUrl="/transport" />
        </div>
      </div>
    );
  }

  if (org === undefined) {
    return (
      <div className="space-y-4 px-4 py-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">TransportOS</h1>
        <p className="text-sm text-slate-600">Loading organization record.</p>
      </div>
    );
  }

  if (org === null) {
    return (
      <div className="space-y-4 px-4 py-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">TransportOS</h1>
        <p className="text-sm text-slate-600">
          Your active Clerk organization has no database record yet. Initialize tenancy in Mission Control first.
        </p>
        <a
          className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          href="/aegis"
        >
          Go to Mission Control
        </a>
      </div>
    );
  }

  if (!moduleEnabled) {
    return (
      <div className="space-y-4 px-4 py-6 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">TransportOS</h1>
            <p className="text-sm text-slate-600">This module is disabled for {org.name}.</p>
          </div>
          <div className="inline-flex items-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
            <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/transport" afterCreateOrganizationUrl="/transport" />
          </div>
        </div>
        <a
          className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          href="/aegis"
        >
          Manage modules in Mission Control
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 md:px-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">TransportOS</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">TransportOS | Fleet Command</h1>
          <button
            type="button"
            onClick={() => seed()}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Seed Vehicles
          </button>
        </div>
        <p className="text-sm text-slate-600">Multi-tenant fleet register with VOR status and inspections.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-100">
          <p className="text-sm font-semibold text-slate-900">Total Fleet</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totalFleet}</p>
          <p className="text-sm text-slate-600">Vehicles in org</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-100">
          <p className="text-sm font-semibold text-slate-900">Fleet Availability</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{availabilityPct}%</p>
          <p className="text-sm text-slate-600">{grounded} VOR</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-100">
          <p className="text-sm font-semibold text-slate-900">Next Inspection</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {nextInspectionDate ? new Date(nextInspectionDate).toLocaleDateString() : "—"}
          </p>
          <p className="text-sm text-slate-600">Soonest due</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Fleet</p>
          <p className="text-lg font-semibold text-slate-900">Vehicles</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {vehicles.map((v) => (
              <div
                key={v._id}
                className={`rounded-xl border px-4 py-3 shadow-sm ${v.isVOR ? "border-red-200 bg-red-50/50" : "border-slate-100 bg-slate-50"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">{v.registration}</p>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${v.isVOR ? "bg-red-100 text-red-700" : "bg-emerald-50 text-emerald-700"
                      }`}
                  >
                    {v.isVOR ? "VOR" : "OK"}
                  </span>
                </div>
                <p className="text-sm text-slate-700">
                  {v.make} {v.model} · {v.type}
                </p>
                <p className="text-xs text-slate-500">
                  Next inspection: {new Date(v.nextInspectionDate).toLocaleDateString()}
                </p>
                {v.isVOR && v.vorReason && <p className="mt-2 text-xs text-red-700">{v.vorReason}</p>}
              </div>
            ))}
            {vehicles.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 sm:col-span-2">
                No vehicles yet. Seed to load the demo fleet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Defects</p>
          <p className="text-lg font-semibold text-slate-900">Report Defect</p>
          <div className="mt-4 space-y-3">
            <select
              value={defectVehicleId}
              onChange={(e) => setDefectVehicleId(e.target.value as Id<"vehicles"> | "")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select vehicle…</option>
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.registration} ({v.type})
                </option>
              ))}
            </select>

            <select
              value={defectSeverity}
              onChange={(e) =>
                setDefectSeverity(e.target.value as "minor" | "major" | "dangerous")
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="minor">Minor</option>
              <option value="major">Major</option>
              <option value="dangerous">Dangerous</option>
            </select>

            <textarea
              value={defectDescription}
              onChange={(e) => setDefectDescription(e.target.value)}
              placeholder="Describe the defect…"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              rows={4}
            />

            <button
              type="button"
              onClick={submitDefect}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Submit
            </button>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-900">Active Defects</p>
            <div className="mt-3 space-y-2">
              {defects.length === 0 ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  No active defects.
                </div>
              ) : (
                defects
                  .slice()
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((d) => (
                    <div
                      key={d._id}
                      className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{d.severity.toUpperCase()}</span>
                        <span className="text-xs font-mono text-slate-500">{d.status}</span>
                      </div>
                      <p className="text-slate-700">{d.description}</p>
                      <p className="text-xs text-slate-500">{new Date(d.timestamp).toLocaleString()}</p>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      <MaintenanceConsole highlightId={highlightId} />
    </div>
  );
}
