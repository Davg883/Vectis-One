import { action, internalAction, internalMutation, mutation } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { ConvexError, v } from "convex/values";
import { getClerkUserId } from "../lib/auth";
import { requireModule } from "../lib/org";
import type { Id } from "../_generated/dataModel";

function toBase64(arrayBuffer: ArrayBuffer) {
  const anyGlobal = globalThis as unknown as { Buffer?: typeof Buffer };
  if (anyGlobal.Buffer) return anyGlobal.Buffer.from(arrayBuffer).toString("base64");

  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}


export const certifyRepair = mutation({
  args: {
    jobCardId: v.id("jobCards"),
    certificateStorageId: v.string(),
  },
  handler: async (ctx, args) => {
    const { identity, orgId } = await requireModule(ctx, "transport");
    const userId = getClerkUserId(identity);

    if (!args.certificateStorageId.trim()) {
      throw new ConvexError("Certificate file required to complete a repair.");
    }

    const job = await ctx.db.get(args.jobCardId);
    if (!job || job.orgId !== orgId) throw new ConvexError("Job card not found");

    await ctx.db.patch(args.jobCardId, {
      status: "verification_pending",
      certificateStorageId: args.certificateStorageId.trim(),
    });

    await ctx.scheduler.runAfter(0, internal.transport.compliance.auditInvoice, {
      jobCardId: args.jobCardId,
      orgId,
      storageId: args.certificateStorageId.trim(),
    });

    return { ok: true, status: "verification_pending" };
  },
});

export const approvePayment = mutation({
  args: {
    jobCardId: v.id("jobCards"),
  },
  handler: async (ctx, args) => {
    const { identity, orgId } = await requireModule(ctx, "transport");
    const userId = getClerkUserId(identity);

    const job = await ctx.db.get(args.jobCardId);
    if (!job || job.orgId !== orgId) throw new ConvexError("Job card not found");

    // Only allow if verification passed or failed (allow override)
    if (job.status !== "verification_passed" && job.status !== "verification_failed") {
      throw new ConvexError("Job is not ready for payment approval.");
    }

    await ctx.db.patch(args.jobCardId, {
      status: "completed",
      completedAt: Date.now(),
      completedByUserId: userId,
      auditLog: [...(job.auditLog ?? []), `${new Date().toISOString()} [User]: Payment Approved & Closed`],
    });

    const defect = await ctx.db.get(job.defectId);
    if (defect) {
      await ctx.db.patch(job.defectId, { status: "rectified" });
      const vehicle = await ctx.db.get(defect.vehicleId);
      if (vehicle) await ctx.db.patch(vehicle._id, { isVOR: false, vorReason: undefined });
    }
  },
});

export const rejectInvoice = mutation({
  args: {
    jobCardId: v.id("jobCards"),
  },
  handler: async (ctx, args) => {
    const { identity, orgId } = await requireModule(ctx, "transport");

    const job = await ctx.db.get(args.jobCardId);
    if (!job || job.orgId !== orgId) throw new ConvexError("Job card not found");

    await ctx.db.patch(args.jobCardId, {
      status: "work_in_progress",
      auditFlag: undefined,
      invoiceData: undefined,
      certificateStorageId: undefined, // Clear the rejected file reference? Optional. I'll keep it or clear it. Let's clear it to force re-upload.
    });
  },
});

export const auditInvoice = internalAction({
  args: {
    jobCardId: v.id("jobCards"),
    orgId: v.string(),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_GEN_AI_KEY;
    if (!apiKey) throw new Error("Missing GOOGLE_GEN_AI_KEY");

    // 1. Get context
    const ctxData = await ctx.runQuery(internal.transport.maintenanceCore.getJobDispatchContext, {
      jobCardId: args.jobCardId,
    });

    const imageUrl = await ctx.storage.getUrl(args.storageId as Id<"_storage">);
    if (!imageUrl) throw new Error("Could not get invoice URL");

    const fileResp = await fetch(imageUrl);
    if (!fileResp.ok) throw new Error(`Failed to fetch media (${fileResp.status})`);

    const arrayBuffer = await fileResp.arrayBuffer();
    const base64Data = toBase64(arrayBuffer);

    // 2. Perform AI Analysis with Gemini
    const model = "gemini-1.5-pro-latest"; // Using 1.5 Pro for specific invoice extraction
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `Analyze this workshop invoice image.
    EXPECTED Vehicle Registration: "${ctxData.vehicle.registration}".
    EXPECTED Vehicle Make: "${ctxData.vehicle.make}".
    Expected Defect Fix: "${ctxData.defect.description}".

    CRITICAL INSTRUCTION: 
    1. Extract the Vehicle Registration from the invoice.
    2. COMPARE it against the EXPECTED Registration "${ctxData.vehicle.registration}".
    3. If they do NOT match exactly (ignoring spaces), you MUST set "vehicleMatch": false and "auditFlag": "Vehicle Mismatch: Found [InvoiceReg], Expected ${ctxData.vehicle.registration}".
    4. Do not be fuzzy. Exact alphanumeric match only.

    TASKS:
    1. Extract Net, VAT, and Grand Total amounts. Check logic: (Net + VAT) approx equals Total.
    2. Perform the Registration Check as above.
    3. SUMMARIZE: Read the line items. Create a short English summary (e.g. 'Replaced LH Mirror + 1hr Labour').
    
    Return JSON ONLY:
    {
      "net": number,
      "vat": number,
      "total": number,
      "vehicleMatch": boolean,
      "items": "full extracted line items text if possible, else summary",
      "summary": "Short readable summary of work done",
      "extractedReg": "The registration string found on invoice (or null)",
      "mathValid": boolean,
      "auditFlag": "Price Mismatch" | "Vehicle Mismatch: Found X, Expected Y" | "Math Error" | null (if passed)
    }`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/jpeg", data: base64Data } },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini Audit Failed", err);
      throw new Error("AI Audit Failed");
    }

    const json = (await response.json().catch(() => null)) as any;
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

    // Simple JSON extraction if markdown code blocks are used
    const cleanJson = rawText?.replace(/```json/g, "").replace(/```/g, "").trim();
    let analysis;

    try {
      analysis = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse AI response", rawText);
      // Fallback or retry logic could go here
      analysis = {
        net: 0, vat: 0, total: 0,
        vehicleMatch: false, items: "AI Parse Error", mathValid: false, auditFlag: "AI Error"
      };
    }

    console.log(`AI Audit Result for Job ${args.jobCardId}:`, analysis);

    // 3. Save Result
    await ctx.runMutation(internal.transport.compliance.saveAuditResult, {
      jobCardId: args.jobCardId,
      invoiceData: {
        net: Number(analysis.net) || 0,
        vat: Number(analysis.vat) || 0,
        total: Number(analysis.total) || 0,
        vehicleMatch: !!analysis.vehicleMatch,
        items: analysis.items || "No items extracted",
        summary: analysis.summary || analysis.items || "No summary",
        extractedReg: analysis.extractedReg || null,
      },
      // Ensure if vehicleMatch is false, we HAVE a flag
      auditFlag: !analysis.vehicleMatch && !analysis.auditFlag ? "Vehicle Mismatch (Unknown)" : analysis.auditFlag,
      passed: analysis.vehicleMatch && analysis.mathValid && !analysis.auditFlag
    });
  }
});

export const saveAuditResult = internalMutation({
  args: {
    jobCardId: v.id("jobCards"),
    invoiceData: v.object({
      net: v.number(),
      vat: v.number(),
      total: v.number(),
      vehicleMatch: v.boolean(),
      items: v.string(),
      summary: v.optional(v.string()),
      extractedReg: v.optional(v.string()),
    }),
    auditFlag: v.optional(v.string()),
    passed: v.boolean()
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobCardId);
    if (!job) return;

    const updates: any = {
      invoiceData: args.invoiceData,
      auditFlag: args.auditFlag,
      status: args.passed ? "verification_passed" : "verification_failed",
      completedAt: undefined, // Wait for human sign-off
    };

    await ctx.db.patch(args.jobCardId, updates);

    // Auto-completion removed. We now wait for manual "approvePayment" mutation.
  }
});


