"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FileText, ShieldAlert } from "lucide-react";
import { IntelligenceModal } from "@/components/civic/IntelligenceModal";
import { Id } from "@/convex/_generated/dataModel";

type PlanningData = {
  application?: {
    _id?: Id<"planning_applications">;
    title?: string;
    address?: string;
    ref?: string;
  };
  documents?: Array<{ title?: string; url?: string }>;
  sentimentScore?: number;
  botAnomalies?: number;
  comments?: Array<{ author?: string; text?: string; stance?: string }>;
};

export default function CivicPage() {
  const data = useQuery(api.civic.getPlanningDashboard) as PlanningData | undefined;
  const seed = useMutation(api.civic.seedPlanningData);

  const application = data?.application ?? {
    title: "Medina Wharf Redevelopment",
    address: "West Medina Mills, Isle of Wight",
    ref: "IW/24/PLN/042",
  };

  const documents =
    data?.documents ??
    [
      { title: "Design & Access Statement.pdf", url: "#" },
      { title: "Environmental Impact Assessment.pdf", url: "#" },
      { title: "Transport Assessment.pdf", url: "#" },
    ];

  const comments =
    data?.comments ??
    [
      { author: "Resident A", text: "Concern about traffic and noise.", stance: "objection" },
      { author: "Resident B", text: "Support improved waterfront access.", stance: "support" },
      { author: "Resident C", text: "Request for better ecological mitigation.", stance: "neutral" },
    ];

  const sentiment = data?.sentimentScore ?? 35;
  const anomalies = data?.botAnomalies ?? 2;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">CivicOS</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            CivicOS | Planning Intelligence
          </h1>
          <p className="text-sm text-slate-600">
            Live planning application sentiment, bot detection, and public reaction.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => seed()}
            className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
          >
            Initialize Planning Data
          </button>
          {application._id ? (
            <IntelligenceModal appId={application._id} />
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left: Proposal */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm shadow-emerald-50">
            <p className="text-sm font-semibold text-slate-900">Active Application</p>
            <h2 className="mt-2 text-lg font-semibold text-emerald-700">{application.title}</h2>
            <p className="text-sm text-slate-600">{application.address}</p>
            <p className="text-xs font-mono text-slate-500">Ref: {application.ref}</p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm shadow-emerald-50">
            <p className="text-sm font-semibold text-slate-900">Submission Documents</p>
            <div className="mt-3 space-y-2">
              {documents.map((doc, idx) => (
                <div
                  key={`${doc.title}-${idx}`}
                  className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-emerald-100"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-700 ring-1 ring-emerald-100">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-slate-900">{doc.title}</span>
                  </div>
                  <a
                    href={doc.url}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Reaction */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm shadow-emerald-50">
            <p className="text-sm font-semibold text-slate-900">Sentiment Heatmap</p>
            <p className="text-xs text-slate-500">Score: {sentiment}% positive</p>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500"
                style={{ width: `${sentiment}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm shadow-emerald-50">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Security Alert</p>
              <ShieldAlert className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-xs text-slate-500">Bot Detection</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {anomalies} Detected Anomalies
            </p>
            <p className="text-sm text-slate-600">
              Duplicate submissions and coordinated sentiment patterns flagged.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm shadow-emerald-50">
            <p className="text-sm font-semibold text-slate-900">Comment Feed</p>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {comments.map((c, idx) => (
                <div
                  key={`${c.author}-${idx}`}
                  className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-emerald-50"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{c.author ?? "Resident"}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        (c.stance ?? "").toLowerCase() === "support"
                          ? "bg-emerald-100 text-emerald-700"
                          : (c.stance ?? "").toLowerCase() === "objection"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {c.stance ?? "neutral"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{c.text ?? ""}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
