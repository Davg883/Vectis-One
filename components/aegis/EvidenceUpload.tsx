"use client";

export function EvidenceUpload() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Upload supporting evidence, filings, or transcripts to the vault.
      </p>
      <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-white">
        <input type="file" className="hidden" />
        Drop files or click to upload
      </label>
      <p className="text-xs text-slate-500">Accepted: PDF, DOCX, media.</p>
    </div>
  );
}
