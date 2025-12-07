"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FileText, Gavel, Mail, RefreshCcw } from "lucide-react";

type EvidenceItem = {
  _id: string;
  title?: string;
  sender?: string;
  sentiment?: string;
  date?: number;
  summary?: string;
};

const sentimentBadge = (sentiment?: string) => {
  const s = sentiment?.toLowerCase();
  if (s === "hostile") return "bg-red-100 text-red-700";
  if (s === "positive") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-600";
};

const pickIcon = (title?: string) => {
  const t = title?.toLowerCase() ?? "";
  if (t.includes("filing") || t.includes("court") || t.includes("regulatory")) return Gavel;
  if (t.includes("letter") || t.includes("email") || t.includes("correspondence")) return Mail;
  return FileText;
};

export default function EvidencePage() {
  const [search, setSearch] = useState("");
  const seed = useMutation(api.aegis.seedAegisData);
  const evidence = (useQuery(api.aegis.getAllEvidence) as EvidenceItem[] | undefined) ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return evidence;
    const q = search.toLowerCase();
    return evidence.filter(
      (e) =>
        e.title?.toLowerCase().includes(q) ||
        e.sender?.toLowerCase().includes(q) ||
        e.summary?.toLowerCase().includes(q)
    );
  }, [evidence, search]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">AegisOS</p>
        <h1 className="text-2xl font-semibold text-slate-900">Secure Evidence Vault | Index</h1>
        <p className="text-sm text-slate-600">Transcripts, filings, and correspondence.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transcripts, filings, and correspondence..."
            className="w-full max-w-xl rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => seed()}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Load Demo Evidence
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm shadow-slate-100 md:col-span-2 lg:col-span-3">
            No evidence uploaded.
          </div>
        )}

        {filtered.map((item) => {
          const Icon = pickIcon(item.title);
          return (
            <div
              key={item._id}
              className="relative flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-900 ring-1 ring-slate-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-slate-900">
                      {item.title ?? "Document"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.sender ?? "Unknown"} •{" "}
                      {item.date ? new Date(item.date).toLocaleDateString() : "No date"}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${sentimentBadge(
                    item.sentiment
                  )}`}
                >
                  {item.sentiment ?? "Neutral"}
                </span>
              </div>
              <p className="line-clamp-2 text-sm text-slate-700">
                {item.summary ?? "No summary provided."}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
