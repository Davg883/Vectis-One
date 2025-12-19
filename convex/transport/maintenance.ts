import { action, internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { requireModule } from "../lib/org";
import { api, internal } from "../_generated/api";

export const listIssuedJobsForAgent = internalQuery({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const orgId = args.orgId.trim();
    if (!orgId) return [];

    const jobCards = await ctx.db
      .query("jobCards")
      .filter((q) => q.eq(q.field("orgId"), orgId))
      .collect();

    const issued = jobCards.filter((j) => j.status === "issued");
    const jobs: Array<{ jobId: string; vendorEmail: string; subject: string; text: string }> = [];

    for (const job of issued) {
      const defect = await ctx.db.get(job.defectId);
      if (!defect || defect.orgId !== orgId) continue;
      const vehicle = await ctx.db.get(defect.vehicleId);
      if (!vehicle || vehicle.orgId !== orgId) continue;
      const vendor = await ctx.db.get(job.vendorId);
      if (!vendor || vendor.orgId !== orgId) continue;

      const emailBody = `
URGENT WORK ORDER - AEGIS LOGISTICS
------------------------------------------------
Vehicle: ${vehicle.registration} (${vehicle.make} ${vehicle.model})
Defect: ${defect.description}
Severity: ${String(defect.severity).toUpperCase()}

Please confirm availability to repair.
Ref: Job ID: ${String(job._id)}
`;

      const jobId = String(job._id);
      jobs.push({
        jobId,
        vendorEmail: vendor.email,
        subject: `URGENT WORK ORDER - ${vehicle.registration} - Job ${jobId}`,
        text: emailBody.trim(),
      });
    }

    return jobs;
  },
});

export const getPendingDispatches = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Return all 'issued' jobs. In a real multi-tenant app, we might filter by orgId, 
    // but the Agent acts as a global dispatcher here.
    const issued = await ctx.db
      .query("jobCards")
      .filter((q) => q.eq(q.field("status"), "issued"))
      .collect();

    const jobs = [];

    for (const job of issued) {
      const defect = await ctx.db.get(job.defectId);
      if (!defect) continue;
      const vehicle = await ctx.db.get(defect.vehicleId);
      if (!vehicle) continue;
      const vendor = await ctx.db.get(job.vendorId);
      if (!vendor) continue;

      const emailBody = `
URGENT WORK ORDER - AEGIS LOGISTICS
------------------------------------------------
Vehicle: ${vehicle.registration} (${vehicle.make} ${vehicle.model})
Defect: ${defect.description}
Severity: ${String(defect.severity).toUpperCase()}

Please confirm availability to repair.
Ref: Job ID: ${String(job._id)}
`;

      jobs.push({
        _id: job._id,
        vehicle: `${vehicle.registration} (${vehicle.make} ${vehicle.model})`,
        defect: defect.description,
        vendorEmail: vendor.email,
        text: emailBody.trim(),
      });
    }

    return jobs;
  },
});

export const updateJobStatus = internalMutation({
  args: {
    jobId: v.string(),
    status: v.string(),
    reply: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const jobCardId = ctx.db.normalizeId("jobCards", args.jobId);
    if (!jobCardId) throw new ConvexError("Job card not found");

    const job = await ctx.db.get(jobCardId);
    if (!job) throw new ConvexError("Job card not found");

    const updates: Record<string, unknown> = {
      dispatchError: undefined,
    };

    const existing = (job.auditLog ?? []) as string[];
    const now = new Date().toISOString();

    updates["status"] = args.status;

    if (args.reply) {
      updates["supplierReply"] = args.reply;
      const msg = `${now} [Vendor]: ${args.reply.slice(0, 500)}`;
      updates["auditLog"] = [...existing, msg].slice(-50);
    } else {
      const msg = `${now} Status: ${args.status}`;
      updates["auditLog"] = [...existing, msg].slice(-50);
    }

    await ctx.db.patch(jobCardId, updates);

    const defectId = job.defectId;
    const defect = await ctx.db.get(defectId);
    if (!defect || defect.orgId !== job.orgId) return { ok: true };

    if (args.status === "work_in_progress") {
      await ctx.db.patch(defectId, { status: "in_progress" });
      console.log("Defect status updated to in_progress for", defectId);
    } else if (args.status === "completed") {
      await ctx.db.patch(defectId, { status: "rectified" });
      console.log("Defect status updated to rectified for", defectId);
    }
    return { ok: true };
  },
});

export const listJobCards = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireModule(ctx, "transport");
    return await ctx.db.query("jobCards").filter((q) => q.eq(q.field("orgId"), orgId)).collect();
  },
});

export const listJobCardsByDefect = query({
  args: { defectId: v.id("defects") },
  handler: async (ctx, args) => {
    const { orgId } = await requireModule(ctx, "transport");
    const cards = await ctx.db.query("jobCards").withIndex("by_defect", (q) => q.eq("defectId", args.defectId)).collect();
    return cards.filter((c) => c.orgId === orgId);
  },
});

export const dispatchJob = action({
  args: {
    defectId: v.id("defects"),
    vendorEmail: v.string(),
  },
  handler: async (ctx, args): Promise<{ ok: boolean; jobCardId: Id<"jobCards">; error?: string }> => {
    const hookUrl = process.env.N8N_WEBHOOK_URL;
    if (!hookUrl) throw new ConvexError("Missing N8N_WEBHOOK_URL (Convex env var).");

    const ctxData = await ctx.runQuery(internal.transport.maintenanceCore.getDefectContext, {
      defectId: args.defectId,
    });

    const vendorId = await ctx.runMutation(internal.transport.maintenanceCore.ensureVendorByEmail, {
      email: args.vendorEmail,
    });

    const instructions = `Work Order\n\nVendor: ${args.vendorEmail}\nVehicle: ${ctxData.vehicle.registration} (${ctxData.vehicle.make} ${ctxData.vehicle.model})\nSeverity: ${ctxData.defect.severity}\nDefect: ${ctxData.defect.description}\n`;

    const jobCardId = await ctx.runMutation(internal.transport.maintenanceCore.createJobCard, {
      defectId: args.defectId,
      vendorId,
      instructions,
    });

    await ctx.runMutation(internal.transport.maintenanceCore.setJobStatusInternal, { jobCardId, status: "issued" });

    const dispatched = await ctx.runAction(api.transport.maintenance.dispatchJobCard, { jobCardId });
    return dispatched;
  },
});

export const dispatchJobCard = action({
  args: { jobCardId: v.id("jobCards") },
  handler: async (ctx, args): Promise<{ ok: boolean; jobCardId: Id<"jobCards">; error?: string }> => {
    const hookUrl = process.env.N8N_WEBHOOK_URL;
    if (!hookUrl) throw new ConvexError("Missing N8N_WEBHOOK_URL (Convex env var).");

    const secret = process.env.N8N_WEBHOOK_SECRET;
    const ctxData = await ctx.runQuery(internal.transport.maintenanceCore.getJobDispatchContext, {
      jobCardId: args.jobCardId,
    });

    const emailBody = `
URGENT WORK ORDER - AEGIS LOGISTICS
------------------------------------------------
Vehicle: ${ctxData.vehicle.registration} (${ctxData.vehicle.make} ${ctxData.vehicle.model})
Defect: ${ctxData.defect.description}
Severity: ${String(ctxData.defect.severity).toUpperCase()}

Please confirm availability to repair.
Ref: Job ID: ${String(args.jobCardId)}
Evidence: ${ctxData.defect.photoStorageId ? await ctx.storage.getUrl(ctxData.defect.photoStorageId) : "None"}
`;

    const imageUrl = ctxData.defect.photoStorageId ? await ctx.storage.getUrl(ctxData.defect.photoStorageId) : null;

    const payload = {
      jobId: String(args.jobCardId),
      vehicle: `${ctxData.vehicle.registration} (${ctxData.vehicle.make} ${ctxData.vehicle.model})`,
      defect: `${ctxData.defect.description} (${String(ctxData.defect.severity).toUpperCase()})`,
      vendorEmail: ctxData.vendor.email,
      text: emailBody.trim(),
      imageUrl: imageUrl ?? undefined,
    };
    try {
      const resp = await fetch(hookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { "x-n8n-token": secret } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        const error = `n8n webhook failed (${resp.status}): ${body}`;
        console.error(error);
        await ctx.runMutation(internal.transport.maintenanceCore.setDispatchFailed, {
          jobCardId: args.jobCardId,
          error,
        });
        return { ok: false, jobCardId: args.jobCardId, error };
      }

      const json = (await resp.json().catch(() => null)) as { externalDispatchId?: string; status?: string } | null;
      await ctx.runMutation(internal.transport.maintenanceCore.setDispatched, {
        jobCardId: args.jobCardId,
        externalDispatchId: json?.externalDispatchId,
        dispatchStatus: json?.status ?? "sent",
      });
      return { ok: true, jobCardId: args.jobCardId };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Dispatch failed";
      console.error("Dispatch exception:", message);
      await ctx.runMutation(internal.transport.maintenanceCore.setDispatchFailed, {
        jobCardId: args.jobCardId,
        error: message,
      });
      return { ok: false, jobCardId: args.jobCardId, error: message };
    }
  },
});

export const seedJobCard = mutation({
  args: {
    defectId: v.id("defects"),
    vendorEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireModule(ctx, "transport");
    const defect = await ctx.db.get(args.defectId);
    if (!defect || defect.orgId !== orgId) throw new ConvexError("Defect not found");

    const vendors = await ctx.db.query("vendors").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect();
    const vendor = vendors.find((v) => v.email.toLowerCase() === args.vendorEmail.trim().toLowerCase());
    if (!vendor) throw new ConvexError("Vendor not found (create vendor first or use dispatchJob).");

    return await ctx.db.insert("jobCards", {
      orgId,
      defectId: args.defectId,
      vendorId: vendor._id,
      status: "issued",
      instructions: undefined,
      externalDispatchId: undefined,
      dispatchStatus: undefined,
      supplierReply: undefined,
      cost: undefined,
      invoiceStorageId: undefined,
      certificateStorageId: undefined,
      aiVerification: undefined,
      completedAt: undefined,
      completedByUserId: undefined,
    });
  },
});

export const setJobStatus = mutation({
  args: {
    jobCardId: v.id("jobCards"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireModule(ctx, "transport");
    const card = await ctx.db.get(args.jobCardId);
    if (!card || card.orgId !== orgId) throw new ConvexError("Job card not found");
    await ctx.db.patch(args.jobCardId, { status: args.status });
  },
});
