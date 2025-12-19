import { internalMutation, internalQuery } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { requireModule } from "../lib/org";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export const createJobCard = internalMutation({
  args: {
    defectId: v.id("defects"),
    vendorId: v.id("vendors"),
    instructions: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireModule(ctx, "transport");

    const defect = await ctx.db.get(args.defectId);
    if (!defect || defect.orgId !== orgId) throw new ConvexError("Defect not found");

    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor || vendor.orgId !== orgId) throw new ConvexError("Vendor not found");

    return await ctx.db.insert("jobCards", {
      orgId,
      defectId: args.defectId,
      vendorId: args.vendorId,
      status: "issued",
      instructions: args.instructions,
      externalDispatchId: undefined,
      dispatchStatus: undefined,
      supplierReply: undefined,
      auditLog: [`${new Date().toISOString()} Created`],
      cost: undefined,
      invoiceStorageId: undefined,
      certificateStorageId: undefined,
      aiVerification: undefined,
      completedAt: undefined,
      completedByUserId: undefined,
    });
  },
});

export const getDispatchContext = internalQuery({
  args: {
    defectId: v.id("defects"),
    vendorId: v.id("vendors"),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireModule(ctx, "transport");

    const defect = await ctx.db.get(args.defectId);
    if (!defect || defect.orgId !== orgId) throw new ConvexError("Defect not found");

    const vehicle = await ctx.db.get(defect.vehicleId);
    if (!vehicle || vehicle.orgId !== orgId) throw new ConvexError("Vehicle not found");

    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor || vendor.orgId !== orgId) throw new ConvexError("Vendor not found");

    return { orgId, defect, vehicle, vendor };
  },
});

export const getDefectContext = internalQuery({
  args: { defectId: v.id("defects") },
  handler: async (ctx, args) => {
    const { orgId } = await requireModule(ctx, "transport");
    const defect = await ctx.db.get(args.defectId);
    if (!defect || defect.orgId !== orgId) throw new ConvexError("Defect not found");

    const vehicle = await ctx.db.get(defect.vehicleId);
    if (!vehicle || vehicle.orgId !== orgId) throw new ConvexError("Vehicle not found");
    return { orgId, defect, vehicle };
  },
});

export const ensureVendorByEmail = internalMutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireModule(ctx, "transport");
    const email = normalizeEmail(args.email);
    if (!email) throw new ConvexError("Vendor email required");

    const vendors = await ctx.db.query("vendors").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect();
    const existing = vendors.find((v) => normalizeEmail(v.email) === email);
    if (existing) return existing._id;

    const fallbackName = args.name?.trim() || email.split("@")[0] || "Vendor";
    return await ctx.db.insert("vendors", {
      orgId,
      name: fallbackName,
      email,
      capabilities: [],
    });
  },
});

export const getJobDispatchContext = internalQuery({
  args: { jobCardId: v.id("jobCards") },
  handler: async (ctx, args) => {
    const { orgId } = await requireModule(ctx, "transport");
    const job = await ctx.db.get(args.jobCardId);
    if (!job || job.orgId !== orgId) throw new ConvexError("Job card not found");

    const defect = await ctx.db.get(job.defectId);
    if (!defect || defect.orgId !== orgId) throw new ConvexError("Defect not found");

    const vehicle = await ctx.db.get(defect.vehicleId);
    if (!vehicle || vehicle.orgId !== orgId) throw new ConvexError("Vehicle not found");

    const vendor = await ctx.db.get(job.vendorId);
    if (!vendor || vendor.orgId !== orgId) throw new ConvexError("Vendor not found");

    return { orgId, job, defect, vehicle, vendor };
  },
});

export const setExternalDispatch = internalMutation({
  args: {
    jobCardId: v.id("jobCards"),
    externalDispatchId: v.optional(v.string()),
    dispatchStatus: v.optional(v.string()),
    supplierReply: v.optional(v.string()),
    dispatchError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireModule(ctx, "transport");
    const job = await ctx.db.get(args.jobCardId);
    if (!job || job.orgId !== orgId) throw new ConvexError("Job card not found");

    await ctx.db.patch(args.jobCardId, {
      externalDispatchId: args.externalDispatchId ?? job.externalDispatchId,
      dispatchStatus: args.dispatchStatus ?? job.dispatchStatus,
      supplierReply: args.supplierReply ?? job.supplierReply,
      dispatchError: args.dispatchError ?? job.dispatchError,
    });
    return { ok: true };
  },
});

export const setJobStatusInternal = internalMutation({
  args: { jobCardId: v.id("jobCards"), status: v.string() },
  handler: async (ctx, args) => {
    const { orgId } = await requireModule(ctx, "transport");
    const job = await ctx.db.get(args.jobCardId);
    if (!job || job.orgId !== orgId) throw new ConvexError("Job card not found");
    await ctx.db.patch(args.jobCardId, { status: args.status });
    return { ok: true };
  },
});

export const setDispatchFailed = internalMutation({
  args: {
    jobCardId: v.id("jobCards"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireModule(ctx, "transport");
    const job = await ctx.db.get(args.jobCardId);
    if (!job || job.orgId !== orgId) throw new ConvexError("Job card not found");

    await ctx.db.patch(args.jobCardId, {
      status: "dispatch_failed",
      dispatchError: args.error.slice(0, 2000),
      dispatchStatus: "failed",
    });
    return { ok: true };
  },
});

export const setDispatched = internalMutation({
  args: {
    jobCardId: v.id("jobCards"),
    externalDispatchId: v.optional(v.string()),
    dispatchStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireModule(ctx, "transport");
    const job = await ctx.db.get(args.jobCardId);
    if (!job || job.orgId !== orgId) throw new ConvexError("Job card not found");

    await ctx.db.patch(args.jobCardId, {
      status: "dispatched",
      externalDispatchId: args.externalDispatchId ?? job.externalDispatchId,
      dispatchStatus: args.dispatchStatus ?? "sent",
      dispatchError: undefined,
    });
    return { ok: true };
  },
});

export const appendJobAudit = internalMutation({
  args: {
    jobCardId: v.id("jobCards"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireModule(ctx, "transport");
    const job = await ctx.db.get(args.jobCardId);
    if (!job || job.orgId !== orgId) throw new ConvexError("Job card not found");

    const existing = (job.auditLog ?? []) as string[];
    const next = [...existing, `${new Date().toISOString()} ${args.message}`].slice(-50);
    await ctx.db.patch(args.jobCardId, { auditLog: next });
    return { ok: true };
  },
});
