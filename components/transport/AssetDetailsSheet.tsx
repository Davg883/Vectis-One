"use client";

import { useState } from "react";

export function AssetDetailsSheet({ assetId, reg }: { assetId: string; reg: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-between">
      <div className="text-xs text-slate-500">History & telemetry</div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
      >
        View {reg}
      </button>
      {open && (
        <div className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-sm">
          Details sheet placeholder for {reg} ({assetId}). Integrate real drill-down when ready.
        </div>
      )}
    </div>
  );
}
