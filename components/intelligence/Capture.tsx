"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useOrganization } from "@clerk/nextjs";
import { Camera } from "lucide-react";

type RouterResult = {
  type: "fuel" | "defect" | "knowledge";
  entity: string | null;
  value: number | string | null;
  summary: string;
  severity?: "minor" | "major" | "dangerous";
  defectId?: string;
};

function classificationLabel(classification: RouterResult["type"]) {
  if (classification === "fuel") return "Depot/Fuel";
  if (classification === "defect") return "Transport/Defect";
  return "Knowledge";
}

export function Capture() {
  const { organization } = useOrganization();

  const think = useAction(api.intelligence.brain.think);
  const logFuel = useMutation(api.depot.fuel.logLevel);
  const reportDefect = useMutation(api.transport.defects.reportByRegistrationPublic);
  const generateUploadUrl = useMutation(api.intelligence.media.generateUploadUrl);

  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"capture" | "knowledge">("capture");
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<RouterResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "syncing" | "triage" | "done" | "error">("idle");
  const lastSubmittedRef = useRef<string>("");
  const [syncNote, setSyncNote] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const vehicles = useQuery(api.transport.vehicles.list) || [];
  const [selectedReg, setSelectedReg] = useState("");

  // Triage State
  const [triageSeverity, setTriageSeverity] = useState<"minor" | "major" | "dangerous">("minor");
  const [triageDesc, setTriageDesc] = useState("");
  const [mitigationNotes, setMitigationNotes] = useState("");
  const [triageEntity, setTriageEntity] = useState(""); // Holds reg during review

  const [kbDomain, setKbDomain] = useState<
    "transport_compliance" | "legal" | "depot_safety"
  >("transport_compliance");
  const [kbFileName, setKbFileName] = useState<string>("");
  const kbFileRef = useRef<HTMLInputElement | null>(null);

  const canSubmit = useMemo(() => text.trim().length > 0 && !busy, [text, busy]);

  const uploadAndThink = async (file: File) => {
    if (!organization?.id) {
      const message = "No Organization Selected";
      if (typeof window !== "undefined") window.alert(message);
      setError(message);
      setMode("error");
      return;
    }

    setBusy(true);
    setError(null);
    setLast(null);
    setMode("syncing");
    setSyncNote(`Uploading ${file.name}...`);

    try {
      const postUrl = await generateUploadUrl({ orgId: organization.id });
      const uploadResp = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!uploadResp.ok) {
        const body = await uploadResp.text().catch(() => "");
        throw new Error(`Upload failed (${uploadResp.status}): ${body}`);
      }

      const uploadJson = (await uploadResp.json().catch(() => null)) as { storageId?: string } | null;
      const storageId = uploadJson?.storageId;
      if (!storageId) throw new Error("Upload succeeded but no storageId returned.");

      setSyncNote(`Analyzing ${file.name}...`);
      const result = (await think({
        text: text.trim(),
        orgId: organization.id,
        storageId,
        mediaType: file.type || undefined,
        entity: undefined, // Don't pre-bias with selectedReg in upload flow unless necessary
        dryRun: true,
      })) as unknown as RouterResult;

      void handleAnalysisResult(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setMode("error");
    } finally {
      if (mode !== "done") setBusy(false); // Optimization: keep busy if auto-finishing
    }
  };

  const uploadPdfKnowledge = async (file: File) => {
    if (!organization?.id) {
      const message = "No Organization Selected";
      if (typeof window !== "undefined") window.alert(message);
      setError(message);
      setMode("error");
      return;
    }

    setBusy(true);
    setError(null);
    setLast(null);
    setMode("syncing");
    setSyncNote(`Parsing PDF ${file.name}...`);

    try {
      const form = new FormData();
      form.set("orgId", organization.id);
      form.set("domain", kbDomain);
      form.set("file", file);

      const resp = await fetch("/api/ingest/pdf", { method: "POST", body: form });
      const json = (await resp.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!resp.ok || !json?.ok) {
        throw new Error(json?.error || `PDF ingest failed (${resp.status})`);
      }

      setMode("done");
      setLast({
        type: "knowledge",
        entity: kbDomain,
        value: file.name,
        summary: "PDF ingested into knowledge base.",
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "PDF ingest failed");
      setMode("error");
    } finally {
      setBusy(false);
    }
  };

  const handleAnalysisResult = async (result: RouterResult) => {
    setLast(result);

    if (result.type === "fuel") {
      // Automatic Commit for Fuel
      setSyncNote("Logging Fuel Level...");
      try {
        const numVal = Number(result.value);
        await logFuel({
          orgId: organization?.id!,
          tankName: result.entity || "Tank",
          // currentLevelIndex removed as it is deprecated
          currentLevelLiters: numVal > 100 ? numVal : undefined,
          currentLevelPercent: numVal <= 100 ? numVal : undefined,
        });

        // SUCCESS - Reset and Show Toast interaction (simulated by Mode)
        alert(`Fuel Level Saved: ${result.entity || "Tank"} @ ${result.value}`);
        setMode("idle");
        setLast(null);
        setText("");
        setImageUrl("");
      } catch (e) {
        setError("Failed to auto-log fuel.");
        setMode("error");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (result.type === "defect") {
      setTriageSeverity(result.severity || "minor");
      setTriageDesc(result.summary);
      setTriageEntity(result.entity || (selectedReg || ""));
      setMode("triage"); // Switch to Review Mode
      setBusy(false);
    } else {
      // Knowledge / Other
      setMode("done");
      setBusy(false);
    }
  };

  const confirmDefect = async () => {
    if (!organization?.id || !last) return;
    setBusy(true);
    setSyncNote("Logging defect...");
    setMode("syncing"); // Show spinner again

    try {
      const res = await reportDefect({
        orgId: organization.id,
        registration: triageEntity, // User confirmed reg
        description: triageDesc,
        severity: last.severity || "minor", // Original AI severity or...
        // Actually we want to pass the override.
        manualSeverity: triageSeverity,
        mitigationNotes: mitigationNotes.trim() || undefined,
      });

      // Hack: construct a fake result with the NEW ID for the "Done" screen
      const finalResult: RouterResult = {
        ...last,
        severity: triageSeverity,
        summary: triageDesc,
        entity: triageEntity,
        defectId: res, // ID string returned by mutation
      };
      setLast(finalResult);
      setMode("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Defect log failed");
      setMode("error");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    if (!organization?.id) {
      const message = "No Organization Selected";
      if (typeof window !== "undefined") window.alert(message);
      setError(message);
      setMode("error");
      return;
    }

    lastSubmittedRef.current = text.trim();
    setBusy(true);
    setError(null);
    setLast(null);
    setMode("syncing");
    setSyncNote(lastSubmittedRef.current);

    setText("");
    setImageUrl("");

    try {
      const result = (await think({
        text: lastSubmittedRef.current,
        orgId: organization.id,
        imageUrl: imageUrl.trim() ? imageUrl.trim() : undefined,
        entity: selectedReg || undefined, // Keep explicitly if user selected it? User asked to hide it though.
        dryRun: true,
      })) as unknown as RouterResult;

      void handleAnalysisResult(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Routing failed");
      setMode("error");
      setBusy(false);
    }
    // finally block removed here because handleAnalysisResult manages setBusy based on path
  };

  return (
    <div className="text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Warden</p>
          <p className="text-sm font-semibold">Capture</p>
        </div>
        <motion.button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "glass-panel rounded-full px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/10",
            busy && "opacity-70"
          )}
          animate={
            !open && !busy
              ? {
                scale: [1, 1.03, 1],
                boxShadow: [
                  "0 0 0 rgba(0,0,0,0)",
                  "0 0 24px rgba(246,115,54,0.22)",
                  "0 0 0 rgba(0,0,0,0)",
                ],
              }
              : { scale: 1, boxShadow: "0 0 0 rgba(0,0,0,0)" }
          }
          transition={
            !open && !busy
              ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.2 }
          }
        >
          {open ? "Close" : "Open"}
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="drawer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 glass-panel rounded-2xl p-4 ring-1 ring-white/10">
              <p className="text-sm text-white/80">
                Think before storing. Classification → location anchor → routed write.
              </p>

              <AnimatePresence mode="wait" initial={false}>
                {mode === "syncing" ? (
                  <motion.div
                    key="syncing"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="mt-4 rounded-xl bg-white/5 px-3 py-3 ring-1 ring-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Syncing to Sovereign…</p>
                      <motion.div
                        aria-hidden
                        className="h-2 w-2 rounded-full bg-[var(--color-brand-accent)]"
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-white/70">{syncNote}</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="mt-4 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPanel("capture")}
                        className={cn(
                          "rounded-xl px-3 py-2 text-xs font-semibold ring-1 ring-white/10",
                          panel === "capture" ? "bg-white/10 text-white" : "bg-transparent text-white/70"
                        )}
                      >
                        Capture
                      </button>
                      <button
                        type="button"
                        onClick={() => setPanel("knowledge")}
                        className={cn(
                          "rounded-xl px-3 py-2 text-xs font-semibold ring-1 ring-white/10",
                          panel === "knowledge" ? "bg-white/10 text-white" : "bg-transparent text-white/70"
                        )}
                      >
                        Knowledge Base
                      </button>
                    </div>

                    {panel === "capture" ? (
                      <>
                        <textarea
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          placeholder='Try: "Tank 1A is low" or "Defect: tyre cut on OIL 6595"'
                          className="glass-input w-full rounded-xl px-3 py-2 text-sm outline-none placeholder:text-white/40"
                          rows={4}
                        />

                        {/* Hidden Asset Selector to reduce clutter - relying on AI extraction or Triage step */}
                        {/* 
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-semibold text-white/70">Asset</label>
                          <input
                            list="vehicle-list"
                            placeholder="Search or Type Reg..."
                            value={selectedReg}
                            onChange={(e) => setSelectedReg(e.target.value)}
                            className="glass-input flex-1 rounded-xl px-3 py-2 text-sm outline-none placeholder:text-white/30"
                          />
                          <datalist id="vehicle-list">
                            {vehicles.map((v) => (
                              <option key={v._id} value={v.registration}>
                                {v.make} {v.model}
                              </option>
                            ))}
                          </datalist>
                        </div> 
                        */}
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-semibold text-white/70">Domain</label>
                          <select
                            value={kbDomain}
                            onChange={(e) => setKbDomain(e.target.value as typeof kbDomain)}
                            className="glass-input flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                          >
                            <option value="transport_compliance">Transport</option>
                            <option value="legal">Legal</option>
                            <option value="depot_safety">Depot</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => kbFileRef.current?.click()}
                            disabled={busy}
                            className="glass-panel inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/10 disabled:opacity-50"
                          >
                            <Camera className="h-4 w-4" aria-hidden />
                            Select PDF
                          </button>
                          <input
                            ref={kbFileRef}
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.currentTarget.value = "";
                              if (!file) return;
                              setKbFileName(file.name);
                              void uploadPdfKnowledge(file);
                            }}
                          />
                          <p className="text-xs text-white/60">{kbFileName ? kbFileName : "PDF manuals only"}</p>
                        </div>
                      </div>
                    )}
                    {panel === "capture" && (
                      <>
                        <input
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="Optional image URL (for multimodal classification)"
                          className="glass-input w-full rounded-xl px-3 py-2 text-sm outline-none placeholder:text-white/40"
                        />

                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={busy}
                            className="glass-panel inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/10 disabled:opacity-50"
                            title="Upload image/video"
                          >
                            <Camera className="h-4 w-4" aria-hidden />
                            Camera
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.currentTarget.value = "";
                              if (!file) return;
                              void uploadAndThink(file);
                            }}
                          />
                          <p className="text-xs text-white/60">Upload image/video for analysis.</p>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={submit}
                            disabled={!canSubmit}
                            className="rounded-xl bg-[var(--color-brand-accent)] px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                          >
                            Submit
                          </button>
                          <p className="text-xs text-white/60">Instant routing + save.</p>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {mode === "error" && error && (
                <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {error}
                </div>
              )}

              {mode === "triage" && last && (
                <div className="mt-3 rounded-xl bg-amber-500/10 px-4 py-4 ring-1 ring-amber-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-amber-100">AI Assessment</h3>
                    <span className={cn(
                      "rounded-full px-2 py-1 text-[10px] font-bold uppercase",
                      triageSeverity === "dangerous" ? "bg-red-500 text-white" :
                        triageSeverity === "major" ? "bg-orange-500 text-white" : "bg-yellow-500 text-black"
                    )}>
                      {triageSeverity}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Vehicle Selector Override */}
                    <div>
                      <label className="text-xs text-amber-200/60 block mb-1">Impacted Asset</label>
                      <input
                        list="vehicle-list-triage"
                        className="w-full bg-black/40 rounded-lg px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-amber-500/50"
                        value={triageEntity}
                        onChange={(e) => setTriageEntity(e.target.value)}
                      />
                      <datalist id="vehicle-list-triage">
                        {vehicles.map((v) => (
                          <option key={v._id} value={v.registration}>
                            {v.make} {v.model}
                          </option>
                        ))}
                      </datalist>
                    </div>

                    {/* Description Edit */}
                    <div>
                      <label className="text-xs text-amber-200/60 block mb-1">Defect Description</label>
                      <textarea
                        className="w-full bg-black/40 rounded-lg px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-amber-500/50"
                        rows={3}
                        value={triageDesc}
                        onChange={(e) => setTriageDesc(e.target.value)}
                      />
                    </div>

                    {/* Severity Override */}
                    <div>
                      <label className="text-xs text-amber-200/60 block mb-1">Severity & Risk</label>
                      <select
                        className="w-full bg-black/40 rounded-lg px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-amber-500/50"
                        value={triageSeverity}
                        onChange={(e) => setTriageSeverity(e.target.value as any)}
                      >
                        <option value="minor">Minor - Monitor</option>
                        <option value="major">Major - Affects Operation</option>
                        <option value="dangerous">Dangerous - VOR Immediately</option>
                      </select>
                    </div>

                    {/* Mitigation Notes */}
                    <div>
                      <label className="text-xs text-amber-200/60 block mb-1">Temporary Mitigation / Notes</label>
                      <textarea
                        className="w-full bg-black/40 rounded-lg px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-amber-500/50 placeholder:text-white/20"
                        placeholder="e.g. Red tape applied, driver notified..."
                        rows={2}
                        value={mitigationNotes}
                        onChange={(e) => setMitigationNotes(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setMode("idle")}
                        className="flex-1 rounded-xl bg-white/5 py-2 text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10"
                      >
                        Discard
                      </button>
                      <button
                        onClick={confirmDefect}
                        className="flex-[2] rounded-xl bg-amber-500 py-2 text-sm font-bold text-black hover:bg-amber-400"
                      >
                        Confirm & Log
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {mode === "done" && last && (
                <div className="mt-3 rounded-xl bg-white/5 px-3 py-3 text-sm text-white ring-1 ring-white/10">
                  <div className="font-semibold">
                    Classified: {classificationLabel(last.type)}
                  </div>
                  <div className="mt-1 text-white/80">Entity: {last.entity ?? "-"}</div>
                  <div className="mt-1 text-white/80">Value: {last.value ?? "-"}</div>
                  <div className="mt-1 text-white/80">{last.summary}</div>
                  <button
                    type="button"
                    onClick={() => {
                      setLast(null);
                      setError(null);
                      setMode("idle");
                    }}
                    className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/10"
                  >
                    New Capture
                  </button>
                  {/* "Report as Defect" button hidden for Fuel (which auto-completes) but shown for Knowledge if needed logic is added */}
                  {/* We are only in "done" for knowledge now. */}
                  {last.type === "knowledge" && (
                    <button
                      type="button"
                      onClick={() => {
                        setTriageSeverity(last.severity || "minor");
                        setTriageDesc(last.summary);
                        setTriageEntity(last.entity || "");
                        setMode("triage");
                      }}
                      className="mt-3 ml-2 rounded-xl bg-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-100 ring-1 ring-amber-500/50 hover:bg-amber-500/30"
                    >
                      Report as Defect
                    </button>
                  )}
                  {last.type === "defect" && (
                    <a
                      href={last.defectId ? `/transport?defectId=${last.defectId}` : "/transport"}
                      className="mt-3 ml-2 rounded-xl bg-[var(--color-brand-accent)] px-3 py-2 text-xs font-semibold text-slate-950 ring-1 ring-white/10 inline-block"
                    >
                      View Defect
                    </a>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
