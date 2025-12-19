"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useRef, useState } from "react";

type Defect = {
  _id: Id<"defects">;
  vehicleId: Id<"vehicles">;
  description: string;
  severity: "minor" | "major" | "dangerous";
  status: "open" | "in_progress" | "rectified";
  timestamp: number;
  imageUrl?: string | null;
  photoStorageId?: string;
};

type Vehicle = {
  _id: Id<"vehicles">;
  registration: string;
  make: string;
  model: string;
  type: string;
};

type Vendor = {
  _id: Id<"vendors">;
  name: string;
  email: string;
  capabilities: string[];
};

type JobCard = {
  _id: Id<"jobCards">;
  defectId: Id<"defects">;
  vendorId: Id<"vendors">;
  status: string;
  dispatchStatus?: string;
  supplierReply?: string;
  dispatchError?: string;
  auditLog?: string[];
  certificateStorageId?: string;
  completedAt?: number;
  auditFlag?: string;
  invoiceData?: {
    net: number;
    vat: number;
    total: number;
    vehicleMatch: boolean;
    items: string;
    summary?: string;
    extractedReg?: string | null;
  };
};

function JobTimeline({ status }: { status: string }) {
  const steps = ["Created", "Dispatched", "Accepted", "Completed"];
  const isAudit = status === "verification_pending" || status === "verification_failed";

  const idx =
    status === "completed"
      ? 3
      : isAudit
        ? 2 // Between accepted and completed
        : status === "work_in_progress"
          ? 2
          : status === "dispatched"
            ? 1
            : 0;

  return (
    <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-white/60">
      {steps.map((label, i) => (
        <div key={label} className="flex flex-1 items-center gap-2">
          <span
            className={`inline-flex h-2 w-2 rounded-full ${i <= idx ? "bg-[var(--color-brand-accent)]" : "bg-white/20"
              }`}
            aria-hidden
          />
          <span className={i === idx ? "text-white" : ""}>{label}</span>
          {i < steps.length - 1 ? <span className="ml-auto text-white/20">→</span> : null}
        </div>
      ))}
    </div>
  );
}

export function MaintenanceConsole({ highlightId }: { highlightId?: string }) {
  const auth = useAuth();
  const orgId = auth.orgId;

  const defects = (useQuery(api.transport.defects.getOpenDefects, orgId ? {} : "skip") as Defect[] | undefined) ?? [];
  const vehicles = (useQuery(api.transport.vehicles.list, orgId ? {} : "skip") as Vehicle[] | undefined) ?? [];
  const vendors = (useQuery(api.transport.vendors.list, orgId ? {} : "skip") as Vendor[] | undefined) ?? [];
  const jobCards = (useQuery(api.transport.maintenance.listJobCards, orgId ? {} : "skip") as JobCard[] | undefined) ?? [];

  const dispatchJob = useAction(api.transport.maintenance.dispatchJob);
  const dispatchJobCard = useAction(api.transport.maintenance.dispatchJobCard);
  const certifyRepair = useMutation(api.transport.compliance.certifyRepair);
  const generateUploadUrl = useMutation(api.intelligence.media.generateUploadUrl);
  const seedVendors = useMutation(api.transport.vendors.seed);
  const seedDefect = useMutation(api.transport.defects.seedDefect);
  const approvePayment = useMutation(api.transport.compliance.approvePayment);
  const rejectInvoice = useMutation(api.transport.compliance.rejectInvoice);

  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "archive">("active");
  const [instructions, setInstructions] = useState<string | null>(null);
  const [vendorChoice, setVendorChoice] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [closingJobId, setClosingJobId] = useState<Id<"jobCards"> | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [expandedDefects, setExpandedDefects] = useState<Record<string, boolean>>({});
  const [analysisView, setAnalysisView] = useState<{ text: string; imageUrl?: string | null } | null>(null);



  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [String(v._id), v])), [vehicles]);
  const vendorById = useMemo(() => new Map(vendors.map((v) => [String(v._id), v])), [vendors]);
  const jobByDefectId = useMemo(() => {
    const map = new Map<string, JobCard>();
    for (const job of jobCards) map.set(String(job.defectId), job);
    return map;
  }, [jobCards]);


  // Determine relevant defects based on tab
  // Active: All open defects, OR defects with active jobs (not completed)
  // Archive: Defects that are rectified/closed AND have a completed job

  const relevantDefects = useMemo(() => {
    return defects.filter(d => {
      const job = jobByDefectId.get(String(d._id));
      if (activeTab === "active") {
        // Show if defect is open OR job exists but is not completed
        if (d.status !== "rectified") return true;
        if (job && job.status !== "completed") return true;
        return false;
      } else {
        // Archive: Show only completed jobs
        return job && job.status === "completed";
      }
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [defects, jobByDefectId, activeTab]);

  const activeDefects = relevantDefects; // Re-use existing variable name to minimize refactor, though logic changed

  useEffect(() => {
    if (highlightId && activeDefects.length > 0) {
      const el = cardRefs.current[highlightId];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [highlightId, activeDefects.length]);

  const doDispatch = async (defectId: Id<"defects">) => {
    const selectedVendorId = vendorChoice[String(defectId)];
    const selectedVendor = selectedVendorId ? vendorById.get(String(selectedVendorId)) : null;
    const defaultEmail = selectedVendor?.email ?? "";
    const email = (typeof window !== "undefined"
      ? window.prompt("Vendor email for dispatch:", defaultEmail)
      : defaultEmail
    )?.trim();
    if (!email) return;
    setBusy(true);
    try {
      const res = (await dispatchJob({
        defectId,
        vendorEmail: email,
      })) as unknown as { jobCardId: Id<"jobCards">; ok?: boolean; error?: string };
      if (res?.ok === false) {
        setInstructions(`Dispatch failed: ${res.error ?? "Unknown error"}`);
      } else {
        setInstructions(`Dispatched to ${email}. JobCard: ${String(res.jobCardId)}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const retryDispatch = async (jobCardId: Id<"jobCards">) => {
    setBusy(true);
    try {
      const res = (await dispatchJobCard({ jobCardId })) as unknown as {
        ok?: boolean;
        error?: string;
      };
      if (res?.ok === false) setInstructions(`Retry failed: ${res.error ?? "Unknown error"}`);
      else setInstructions("Dispatch retried successfully.");
    } finally {
      setBusy(false);
    }
  };

  const uploadAndCertify = async (file: File) => {
    if (!orgId || !closingJobId) return;
    setBusy(true);
    try {
      const postUrl = await generateUploadUrl({ orgId });
      const uploadResp = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploadResp.ok) throw new Error(`Upload failed (${uploadResp.status})`);
      const uploadJson = (await uploadResp.json().catch(() => null)) as { storageId?: string } | null;
      if (!uploadJson?.storageId) throw new Error("Upload returned no storageId");

      await certifyRepair({ jobCardId: closingJobId, certificateStorageId: uploadJson.storageId });
      setClosingJobId(null);
    } finally {
      setBusy(false);
    }
  };

  const confirmPayment = async (jobCardId: Id<"jobCards">) => {
    if (!window.confirm("Are you sure you want to Override/Approve this payment?")) return;
    setBusy(true);
    try {
      await approvePayment({ jobCardId });
    } finally {
      setBusy(false);
    }
  };

  const rejectJob = async (jobCardId: Id<"jobCards">) => {
    if (!window.confirm("Reject this invoice and ask vendor to re-submit?")) return;
    setBusy(true);
    try {
      await rejectInvoice({ jobCardId });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4 text-white ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Workshop</p>
          <div className="mt-1 flex items-center gap-4">
            <h2 className="text-sm font-semibold">Maintenance Console</h2>
            <div className="flex rounded-lg bg-white/5 p-1 ring-1 ring-white/10">
              <button
                onClick={() => setActiveTab("active")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${activeTab === "active" ? "bg-white/10 text-white shadow-sm" : "text-white/50 hover:text-white/80"}`}
              >
                Active
              </button>
              <button
                onClick={() => setActiveTab("archive")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${activeTab === "archive" ? "bg-white/10 text-white shadow-sm" : "text-white/50 hover:text-white/80"}`}
              >
                Archive
              </button>
            </div>
          </div>
        </div>
        {activeTab === "active" && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => seedVendors()}
              disabled={busy}
              className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/10 disabled:opacity-60"
            >
              Seed Vendors
            </button>
            <button
              type="button"
              onClick={() => seedDefect({})}
              disabled={busy}
              className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/10 disabled:opacity-60"
            >
              Seed Defect
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {activeTab === "active" && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-white/60">Active defects: {activeDefects.length}</p>
          </div>
        )}
        {activeDefects.length === 0 ? (
          <div className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/70 ring-1 ring-white/10">
            No active defects.
          </div>
        ) : (
          activeDefects.map((d) => {
            const vehicle = vehicleById.get(String(d.vehicleId));
            const job = jobByDefectId.get(String(d._id));
            const vendor = job ? vendorById.get(String(job.vendorId)) : null;
            const badge =
              job?.status === "dispatch_failed"
                ? { label: "Failed to Email", cls: "bg-red-500/15 text-red-100 ring-red-500/30" }
                : job?.status === "work_in_progress"
                  ? { label: "Garage Accepted", cls: "bg-sky-500/15 text-sky-100 ring-sky-500/30" }
                  : job?.status === "dispatched"
                    ? { label: "Email Sent - Waiting for Garage", cls: "bg-amber-500/15 text-amber-100 ring-amber-500/30" }
                    : job?.status === "verification_pending"
                      ? { label: "🤖 Auditor Active", cls: "bg-purple-500/15 text-purple-100 ring-purple-500/30 animate-pulse" }
                      : job?.status === "verification_failed"
                        ? { label: "AUDIT FAILED", cls: "bg-red-500 text-white ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" }
                        : job?.status === "verification_passed"
                          ? { label: "Ready for Approval", cls: "bg-emerald-500 text-white ring-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse" }
                          : job?.status === "completed"
                            ? { label: "Closed", cls: "bg-emerald-500/15 text-emerald-100 ring-emerald-500/30" }
                            : { label: "Pending", cls: "bg-white/10 text-white ring-white/10" };

            const analysisMarker = "\n\n[Visual Analysis]:";
            const hasAnalysis = d.description.includes(analysisMarker);
            const [cleanDesc, analysisText] = hasAnalysis ? d.description.split(analysisMarker) : [d.description, null];
            const isExpanded = expandedDefects[String(d._id)];

            return (
              <div
                key={String(d._id)}
                ref={(el) => { cardRefs.current[String(d._id)] = el; }}
                className={`rounded-xl bg-white/5 px-3 py-3 ring-1 transition-all duration-500 ${String(d._id) === highlightId
                  ? "ring-[var(--color-brand-accent)] shadow-[0_0_30px_-5px_var(--color-brand-accent)] bg-white/10"
                  : "ring-white/10"
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/60">
                      {vehicle ? `${vehicle.registration} • ${vehicle.make} ${vehicle.model}` : "Vehicle"}
                    </p>

                    <div className="mt-1">
                      <p className={`text-sm text-slate-400 whitespace-pre-wrap ${isExpanded ? "" : "line-clamp-2"}`}>
                        {cleanDesc}
                      </p>
                      {(cleanDesc.length > 120 || cleanDesc.split('\n').length > 2) && (
                        <button
                          onClick={() => setExpandedDefects(prev => ({ ...prev, [String(d._id)]: !prev[String(d._id)] }))}
                          className="text-[10px] font-bold uppercase tracking-wider text-white/50 hover:text-white mt-1"
                        >
                          {isExpanded ? "Show Less" : "Read More"}
                        </button>
                      )}

                      {hasAnalysis && (
                        <button
                          onClick={() => setAnalysisView({ text: analysisText || "", imageUrl: d.imageUrl })}
                          className="mt-2 flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1.5 text-xs font-medium text-sky-200 transition-colors hover:bg-white/10 hover:text-sky-100"
                        >
                          <span>📷</span> View AI Analysis
                        </button>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-white/60">
                      Severity: {d.severity.toUpperCase()} • {new Date(d.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>

                {d.imageUrl && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setLightboxUrl(d.imageUrl!)}
                      className="group relative h-20 w-20 overflow-hidden rounded-lg bg-black/40 ring-1 ring-white/10 transition-all hover:ring-white/30"
                    >
                      <img src={d.imageUrl} alt="Defect evidence" className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100" />
                      {/* Very simplistic video detection - in prod use mime type */}
                      {d.imageUrl.includes(".mp4") || d.imageUrl.includes("video") ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="rounded-full bg-white/20 p-1 backdrop-blur-sm">
                            <div className="h-0 w-0 border-b-[6px] border-l-[10px] border-t-[6px] border-b-transparent border-l-white border-t-transparent ml-0.5" />
                          </div>
                        </div>
                      ) : null}
                    </button>
                  </div>
                )}

                <JobTimeline status={job?.status ?? "issued"} />

                {!job ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select
                      value={vendorChoice[String(d._id)] ?? ""}
                      onChange={(e) => setVendorChoice((m) => ({ ...m, [String(d._id)]: e.target.value }))}
                      className="glass-input min-w-[220px] rounded-xl px-3 py-2 text-sm outline-none"
                      disabled={busy}
                    >
                      <option value="">Optional vendor…</option>
                      {vendors.map((v) => (
                        <option key={String(v._id)} value={String(v._id)}>
                          {v.name} ({v.capabilities.join(", ")})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => doDispatch(d._id)}
                      disabled={busy}
                      className="rounded-xl bg-[var(--color-brand-accent)] px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                    >
                      Dispatch to Vendor
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-white/70">
                      Vendor: {vendor ? `${vendor.name} (${vendor.email})` : String(job.vendorId)}
                    </p>
                    <div className="flex items-center gap-2">
                      {job.status === "dispatch_failed" ? (
                        <button
                          type="button"
                          onClick={() => retryDispatch(job._id)}
                          disabled={busy}
                          className="rounded-xl bg-red-500/20 px-4 py-2 text-sm font-semibold text-white ring-1 ring-red-500/30 disabled:opacity-50"
                        >
                          Retry
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => {
                          setClosingJobId(job._id);
                          fileRef.current?.click();
                        }}
                        disabled={busy || job.status !== "work_in_progress"}
                        className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 disabled:opacity-50"
                      >
                        Upload Certificate & Close
                      </button>
                    </div>
                  </div>
                )}

                {job?.dispatchError ? (
                  <div className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-100 ring-1 ring-red-500/20">
                    <p className="text-[11px] uppercase tracking-wide text-red-100/70">Dispatch Error</p>
                    <p className="mt-1 whitespace-pre-wrap">{job.dispatchError}</p>
                  </div>
                ) : null}

                {job?.status === "work_in_progress" && job?.supplierReply ? (
                  <div className="mt-3 border-l-4 border-blue-500 bg-blue-500/10 p-3 text-sm italic text-blue-200">
                    <p className="whitespace-pre-wrap" title={job.supplierReply}>
                      {`"${(() => {
                        const clean = job.supplierReply.replace(/^Re:\s*/i, "").trim();
                        return clean.length > 100 ? clean.slice(0, 100) + "..." : clean;
                      })()}" - Vendor`}
                    </p>
                  </div>
                ) : null}

                {job?.auditLog && job.auditLog.length > 0 ? (
                  <div className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-xs text-white/70 ring-1 ring-white/10">
                    <p className="text-[11px] uppercase tracking-wide text-white/60">Audit</p>
                    <div className="mt-1 space-y-1">
                      {job.auditLog.slice(-5).map((line, idx) => (
                        <p key={`${String(job._id)}-${idx}`} className="whitespace-pre-wrap">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>

                ) : null}

                {job?.status === "verification_failed" && (
                  <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-xl">
                        ⚠️
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-red-100">Invoice Audit Failed</h4>
                        <p className="mt-1 text-xs text-red-200/70">
                          The AI Auditor detected a discrepancy in the uploaded invoice.
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-4 rounded-lg bg-black/20 p-3 text-xs">
                          <div>
                            <span className="block text-white/40 uppercase tracking-widest text-[10px]">Reason</span>
                            <span className="text-white font-mono">{job.auditFlag || "Unknown Mismatch"}</span>
                          </div>
                          <div>
                            <span className="block text-white/40 uppercase tracking-widest text-[10px]">Vehicle Match</span>
                            <span className={job.invoiceData?.vehicleMatch ? "text-emerald-400" : "text-red-400"}>
                              {job.invoiceData?.vehicleMatch ? "PASS" : "FAIL"}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => rejectJob(job._id)}
                            disabled={busy}
                            className="rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50"
                          >
                            Reject Invoice
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmPayment(job._id)}
                            disabled={busy}
                            className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
                          >
                            Manual Override
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {job?.status === "verification_passed" && (
                  <div className="mt-4 rounded-xl border border-emerald-500/50 bg-emerald-900/30 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="text-emerald-400">✨</div>
                      <h4 className="font-bold text-emerald-100">AI Verification Successful</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-emerald-200/70">Invoice Total</p>
                        <p className="text-lg font-mono text-white font-bold">£{job.invoiceData?.total.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-emerald-200/70">Vehicle Match</p>
                        <p className="text-white font-medium flex items-center gap-1">
                          ✅ {job.invoiceData?.extractedReg || "Verified"}
                        </p>
                      </div>
                    </div>

                    <div className="bg-black/20 p-3 rounded-lg mb-4">
                      <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1">AI Scan Summary</p>
                      <p className="italic text-white text-sm">"{job.invoiceData?.summary || job.invoiceData?.items}"</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmPayment(job._id)}
                        disabled={busy}
                        className="flex-1 rounded-lg bg-emerald-500 py-2 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
                      >
                        Approve & Pay
                      </button>
                      <button
                        onClick={() => rejectJob(job._id)}
                        disabled={busy}
                        className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept="image/*,application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.currentTarget.value = "";
          if (!file) return;
          void uploadAndCertify(file);
        }}
      />

      {
        instructions ? (
          <div className="mt-4 rounded-xl bg-white/5 px-3 py-3 text-sm text-white ring-1 ring-white/10">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-white/70">Draft Work Order</p>
              <button
                type="button"
                onClick={() => setInstructions(null)}
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/10"
              >
                Hide
              </button>
            </div>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-white/80">{instructions}</pre>
          </div>
        ) : null
      }

      {
        lightboxUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm" onClick={() => setLightboxUrl(null)}>
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            >
              ✕
            </button>
            <div className="relative max-h-full max-w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10" onClick={(e) => e.stopPropagation()}>
              {lightboxUrl.includes(".mp4") || lightboxUrl.includes("video") ? (
                <video src={lightboxUrl} controls autoPlay className="max-h-[85vh] max-w-full" />
              ) : (
                <img src={lightboxUrl} alt="Evidence" className="max-h-[85vh] max-w-full object-contain" />
              )}
            </div>
          </div>
        )
      }
      {
        analysisView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm" onClick={() => setAnalysisView(null)}>
            <div className="glass-panel relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6 ring-1 ring-white/10" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setAnalysisView(null)}
                className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              >
                ✕
              </button>
              <h3 className="text-lg font-semibold text-white">AI Analysis Report</h3>
              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">Visual Evidence</h4>
                  {analysisView.imageUrl ? (
                    <div className="mt-2 overflow-hidden rounded-xl border border-white/10">
                      {analysisView.imageUrl.includes("video") || analysisView.imageUrl.includes(".mp4") ? (
                        <video src={analysisView.imageUrl} controls className="h-full w-full object-cover" />
                      ) : (
                        <img src={analysisView.imageUrl} alt="Defect Evidence" className="h-full w-full object-cover" />
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 flex h-32 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs text-white/40">
                      No image available
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">Analysis Findings</h4>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                    {analysisView.text.trim()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
