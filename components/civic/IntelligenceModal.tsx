"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

type IntelligenceModalProps = {
  appId: string;
};

export function IntelligenceModal({ appId }: IntelligenceModalProps) {
  const analyzeInput = useAction(api.civic_ai.analyzeCivicInput);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"text" | "upload">("text");
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await analyzeInput({
        appId,
        text: content,
      });
      const classification = res?.analysis?.sourceType ?? "Intelligence captured";
      const impact = res?.analysis?.strategicImpact
        ? ` (${res.analysis.strategicImpact})`
        : "";
      setResult(`Identified: ${classification}${impact}`);
      setContent("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md">
          Add Intelligence
        </button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Submit Intelligence</h3>
          <div className="flex gap-2 text-xs font-semibold text-slate-500">
            <button
              onClick={() => setTab("text")}
              className={`rounded-full px-3 py-1 ring-1 ring-slate-200 ${
                tab === "text" ? "bg-emerald-50 text-emerald-700" : "bg-white"
              }`}
            >
              Paste Text
            </button>
            <button
              onClick={() => setTab("upload")}
              className={`rounded-full px-3 py-1 ring-1 ring-slate-200 ${
                tab === "upload" ? "bg-emerald-50 text-emerald-700" : "bg-white"
              }`}
            >
              Upload Document
            </button>
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-slate-600">Author</label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Resident name or source"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-slate-600">Content</label>
            {tab === "text" ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Paste email, letter, or comment text..."
              />
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-600">
                Document uploads coming soon. Paste text for now.
              </div>
            )}
          </div>

          {result ? (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">
              {result}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={() => setOpen(false)}
            className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className={`rounded-full px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-[1px] hover:shadow-md ${
              loading ? "bg-emerald-400" : "bg-emerald-600"
            }`}
          >
            {loading ? "Processing Strategy..." : "Analyze & Submit"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
