import { mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { requireModule } from "../lib/org";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireModule(ctx, "legal");
    const [overdue, pending, submitted] = await Promise.all([
      ctx.db
        .query("legalDeadlines")
        .withIndex("by_org_status", (q) => q.eq("orgId", orgId).eq("status", "overdue"))
        .collect(),
      ctx.db
        .query("legalDeadlines")
        .withIndex("by_org_status", (q) => q.eq("orgId", orgId).eq("status", "pending"))
        .collect(),
      ctx.db
        .query("legalDeadlines")
        .withIndex("by_org_status", (q) => q.eq("orgId", orgId).eq("status", "submitted"))
        .collect(),
    ]);

    return [...overdue, ...pending, ...submitted].sort((a, b) => a.dueDate - b.dueDate);
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireModule(ctx, "legal");
    const existing = await Promise.all([
      ctx.db
        .query("legalDeadlines")
        .withIndex("by_org_status", (q) => q.eq("orgId", orgId).eq("status", "overdue"))
        .collect(),
      ctx.db
        .query("legalDeadlines")
        .withIndex("by_org_status", (q) => q.eq("orgId", orgId).eq("status", "pending"))
        .collect(),
      ctx.db
        .query("legalDeadlines")
        .withIndex("by_org_status", (q) => q.eq("orgId", orgId).eq("status", "submitted"))
        .collect(),
    ]).then((chunks) => chunks.flat());
    for (const d of existing) await ctx.db.delete(d._id);

    const now = Date.now();
    await ctx.db.insert("legalDeadlines", {
      orgId,
      title: "GDPR SAR Response",
      dueDate: now + 5 * 24 * 60 * 60 * 1000,
      severity: "critical",
      status: "pending",
    });

    await ctx.db.insert("legalDeadlines", {
      orgId,
      title: "Disclosure Pack Submission",
      dueDate: now + 14 * 24 * 60 * 60 * 1000,
      severity: "standard",
      status: "pending",
    });

    await ctx.db.insert("legalDeadlines", {
      orgId,
      title: "Standstill Agreement Signature",
      dueDate: now - 2 * 24 * 60 * 60 * 1000,
      severity: "critical",
      status: "overdue",
    });

    return "Legal Defence seeded";
  },
});

export const create = mutation({
  args: {
    orgId: v.string(),
    title: v.string(),
    dueDate: v.number(),
    severity: v.union(v.literal("critical"), v.literal("standard")),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireModule(ctx, "legal");
    if (orgId !== args.orgId) throw new ConvexError("Organization mismatch");

    const id = await ctx.db.insert("legalDeadlines", {
      orgId,
      title: args.title,
      dueDate: args.dueDate,
      severity: args.severity,
      status: args.dueDate < Date.now() ? "overdue" : "pending",
      relatedCaseFileId: undefined,
    });
    return await ctx.db.get(id);
  },
});

export const setStatus = mutation({
  args: {
    orgId: v.string(),
    deadlineId: v.id("legalDeadlines"),
    status: v.union(v.literal("pending"), v.literal("submitted"), v.literal("overdue")),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireModule(ctx, "legal");
    if (orgId !== args.orgId) throw new ConvexError("Organization mismatch");
    const record = await ctx.db.get(args.deadlineId);
    if (!record || record.orgId !== orgId) return null;
    await ctx.db.patch(args.deadlineId, { status: args.status });
    return await ctx.db.get(args.deadlineId);
  },
});

