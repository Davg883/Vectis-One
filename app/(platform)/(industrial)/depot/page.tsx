"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { OrganizationSwitcher, SignInButton, useAuth } from "@clerk/nextjs";
import { RefreshCcw } from "lucide-react";
import { TankGauge } from "@/components/depot/TankGauge";

type Tank = {
  _id: string;
  name: string;
  fuelType: string;
  capacityLiters: number;
  currentLevelLiters: number;
  deadstockLiters: number;
  lastReadingTime: number;
};

const EMPTY_TANKS: Tank[] = [];

export default function DepotPage() {
  const auth = useAuth();
  const canLoadOrg = auth.isLoaded && auth.isSignedIn && Boolean(auth.orgId);
  const org = useQuery(api.core.organizations.getMyOrganization, canLoadOrg ? {} : "skip") as
    | { enabledModules: string[]; name: string }
    | null
    | undefined;
  const moduleEnabled = Boolean(org && org.enabledModules.includes("depot"));

  const tanks =
    ((useQuery(api.depot.tanks.list, moduleEnabled ? {} : "skip") as Tank[] | undefined) ??
      EMPTY_TANKS);
  const seed = useMutation(api.depot.tanks.seed);

  const totalFill =
    tanks.length === 0
      ? 0
      : Math.round(
          (tanks.reduce((acc, t) => acc + t.currentLevelLiters, 0) /
            tanks.reduce((acc, t) => acc + t.capacityLiters, 0)) *
            100
        );

  const lowTanks = useMemo(
    () =>
      tanks.filter((t) => (t.currentLevelLiters / t.capacityLiters) * 100 < 15),
    [tanks]
  );

  if (!auth.isLoaded) {
    return (
      <div className="space-y-4 px-4 py-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">DepotOS</h1>
        <p className="text-sm text-slate-600">Loading identity.</p>
      </div>
    );
  }

  if (!auth.isSignedIn) {
    return (
      <div className="space-y-4 px-4 py-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">DepotOS</h1>
        <p className="text-sm text-slate-600">Sign in with Clerk to access DepotOS.</p>
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
        <h1 className="text-2xl font-semibold text-slate-900">DepotOS</h1>
        <p className="text-sm text-slate-600">Select an organization in Clerk to continue.</p>
        <div className="inline-flex items-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
          <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/depot" afterCreateOrganizationUrl="/depot" />
        </div>
      </div>
    );
  }

  if (org === undefined) {
    return (
      <div className="space-y-4 px-4 py-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">DepotOS</h1>
        <p className="text-sm text-slate-600">Loading organization record.</p>
      </div>
    );
  }

  if (org === null) {
    return (
      <div className="space-y-4 px-4 py-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">DepotOS</h1>
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
            <h1 className="text-2xl font-semibold text-slate-900">DepotOS</h1>
            <p className="text-sm text-slate-600">This module is disabled for {org.name}.</p>
          </div>
          <div className="inline-flex items-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
            <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/depot" afterCreateOrganizationUrl="/depot" />
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
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
          DepotOS
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">
            DepotOS | Wet Stock Management
          </h1>
          <button
            type="button"
            onClick={() => seed()}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Seed Tanks
          </button>
        </div>
        <p className="text-sm text-slate-600">
          Live storage telemetry and critical infrastructure status.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-100">
          <p className="text-sm font-semibold text-slate-900">Total Stock</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totalFill}%</p>
          <p className="text-sm text-slate-600">
            {lowTanks.length > 0 ? `${lowTanks.length} low-level warning${lowTanks.length > 1 ? "s" : ""}` : "Above safety thresholds"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {tanks.map((tank) => (
          <TankGauge
            key={tank._id}
            name={tank.name}
            fuelType={tank.fuelType}
            currentLevelLiters={tank.currentLevelLiters}
            capacityLiters={tank.capacityLiters}
            deadstockLiters={tank.deadstockLiters}
          />
        ))}
      </div>
    </div>
  );
}
