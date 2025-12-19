"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { OrganizationSwitcher, SignInButton, useAuth } from "@clerk/nextjs";
import { RefreshCcw } from "lucide-react";

type Deadline = {
  _id: string;
  title: string;
  dueDate: number;
  severity: string;
  status: string;
};

export default function LegalDeadlinesPage() {
  const auth = useAuth();
  const canLoadOrg = auth.isLoaded && auth.isSignedIn && Boolean(auth.orgId);
  const org = useQuery(api.core.organizations.getMyOrganization, canLoadOrg ? {} : "skip") as
    | { enabledModules: string[]; name: string }
    | null
    | undefined;
  const moduleEnabled = Boolean(org && org.enabledModules.includes("legal"));

  const deadlines =
    ((useQuery(api.legal.deadlines.list, moduleEnabled ? {} : "skip") as Deadline[] | undefined) ?? []);
  const seed = useMutation(api.legal.deadlines.seed);

  if (!auth.isLoaded) {
    return (
      <div className="space-y-4 px-4 py-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">Legal Defence</h1>
        <p className="text-sm text-slate-600">Loading identity.</p>
      </div>
    );
  }

  if (!auth.isSignedIn) {
    return (
      <div className="space-y-4 px-4 py-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">Legal Defence</h1>
        <p className="text-sm text-slate-600">Sign in with Clerk to access Legal Defence.</p>
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
        <h1 className="text-2xl font-semibold text-slate-900">Legal Defence</h1>
        <p className="text-sm text-slate-600">Select an organization in Clerk to continue.</p>
        <div className="inline-flex items-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
          <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/aegis/legal" afterCreateOrganizationUrl="/aegis/legal" />
        </div>
      </div>
    );
  }

  if (org === undefined) {
    return (
      <div className="space-y-4 px-4 py-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">Legal Defence</h1>
        <p className="text-sm text-slate-600">Loading organization record.</p>
      </div>
    );
  }

  if (org === null) {
    return (
      <div className="space-y-4 px-4 py-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">Legal Defence</h1>
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
            <h1 className="text-2xl font-semibold text-slate-900">Legal Defence</h1>
            <p className="text-sm text-slate-600">This module is disabled for {org.name}.</p>
          </div>
          <div className="inline-flex items-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
            <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/aegis/legal" afterCreateOrganizationUrl="/aegis/legal" />
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
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Legal Defence</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">Compliance Deadlines</h1>
          <button
            type="button"
            onClick={() => seed()}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Seed Deadlines
          </button>
        </div>
        <p className="text-sm text-slate-600">Deadlines are scoped to the active organization.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
        <p className="text-sm font-semibold text-slate-900">Timeline</p>
        <div className="mt-3 space-y-2">
          {deadlines.length === 0 ? (
            <p className="text-sm text-slate-500">No deadlines found.</p>
          ) : (
            deadlines.map((d) => {
              const isOverdue = d.status === "overdue";
              return (
                <div
                  key={d._id}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ring-1 ${
                    isOverdue ? "bg-red-50 text-red-800 ring-red-100" : "bg-slate-50 text-slate-800 ring-slate-100"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{d.title}</span>
                    <span className="text-xs opacity-80">
                      {d.severity} · {d.status}
                    </span>
                  </div>
                  <span className="text-xs">{new Date(d.dueDate).toLocaleDateString()}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
