"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RefreshCcw } from "lucide-react";
import { CaseCard } from "@/components/aegis/CaseCard";
import { EvidenceUpload } from "@/components/aegis/EvidenceUpload";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type AegisData = {
  cases: Array<{
    title: string;
    counterparty: string;
    status: string;
    nextDeadline?: string;
    risk?: string;
  }>;
  deadlines: Array<{
    title: string;
    date: number;
    type?: string;
  }>;
};

export default function AegisLegalPage() {
  const data = useQuery(api.aegis.getAegisDashboard) as AegisData | undefined;
  const seed = useMutation(api.aegis.seedAegisData);

  const dispute = data?.cases?.[0];
  const deadlines = data?.deadlines ?? [];

  return (
    <div className="space-y-6 px-4 py-6 md:px-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">AegisOS</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">AegisOS | Strategic Defence</h1>
          <button
            type="button"
            onClick={() => seed()}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Initialize War Room
          </button>
        </div>
        <p className="text-sm text-slate-600">
          Active disputes, evidence vault, and regulatory deadlines.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {dispute ? (
            <CaseCard
              title={dispute.title}
              counterparty={dispute.counterparty}
              status={dispute.status}
              risk={dispute.risk ?? "Critical"}
              nextDeadline={dispute.nextDeadline ?? "Standstill Agreement"}
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm shadow-slate-100">
              No active cases. Initialize to load Phillips 66 dispute.
            </div>
          )}

          <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm shadow-slate-100">
            <CardHeader>
              <p className="text-sm font-semibold text-slate-900">Strategic Context</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Current Posture</p>
                <p className="text-lg font-semibold text-slate-900">FREEZE &amp; SQUEEZE</p>
              </div>
              <p className="text-sm text-slate-700">
                We are holding off enforcement via the Standstill Agreement while compelling disclosure of
                internal P66 emails via GDPR Subject Access Request. Objective is to prove collusive intent
                to protect Certas Energy.
              </p>
              <p className="text-xs text-slate-500">Precedent: Propel Fuels vs Phillips 66 (California Judgment)</p>
            </CardContent>
          </Card>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
            <p className="text-sm font-semibold text-slate-900">Timeline</p>
            <div className="mt-3 space-y-2">
              {deadlines.length === 0 && <p className="text-sm text-slate-500">No upcoming deadlines.</p>}
              {deadlines.map((d, idx) => (
                <div
                  key={`${d.title}-${idx}`}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900">{d.title}</span>
                    {d.type && <span className="text-xs text-slate-500">{d.type}</span>}
                  </div>
                  <span className="text-xs text-slate-600">{new Date(d.date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
          <p className="text-sm font-semibold text-slate-900">Evidence Vault</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span>P66 Case Overview.pdf</span>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                Uploaded
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span>Letter Before Action</span>
              <span className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700">
                Received
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span>GDPR SAR</span>
              <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                Sent
              </span>
            </div>
          </div>
          <div className="mt-4">
            <EvidenceUpload />
          </div>
        </div>
      </div>
    </div>
  );
}
