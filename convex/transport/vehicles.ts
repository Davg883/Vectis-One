import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireModule } from "../lib/org";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireModule(ctx, "transport");
    return await ctx.db.query("vehicles").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect();
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireModule(ctx, "transport");
    const existing = await ctx.db.query("vehicles").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect();
    for (const vDoc of existing) await ctx.db.delete(vDoc._id);

    const now = Date.now();
    await ctx.db.insert("vehicles", {
      orgId,
      registration: "OIL 6595",
      make: "MAN",
      model: "TGL 12.220",
      type: "HGV",
      isVOR: true,
      vorReason: "Inspection overdue",
      nextInspectionDate: now - 7 * 24 * 60 * 60 * 1000,
    });

    await ctx.db.insert("vehicles", {
      orgId,
      registration: "YJ65 PNM",
      make: "DAF",
      model: "LF 260",
      type: "HGV",
      isVOR: false,
      nextInspectionDate: now + 10 * 24 * 60 * 60 * 1000,
    });

    await ctx.db.insert("vehicles", {
      orgId,
      registration: "CN18 HHL",
      make: "CITROEN",
      model: "Relay",
      type: "Van",
      isVOR: false,
      nextInspectionDate: now + 35 * 24 * 60 * 60 * 1000,
    });

    return "TransportOS seeded";
  },
});

export const setVOR = mutation({
  args: {
    vehicleId: v.id("vehicles"),
    isVOR: v.boolean(),
    vorReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireModule(ctx, "transport");
    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle || vehicle.orgId !== orgId) return;
    await ctx.db.patch(args.vehicleId, { isVOR: args.isVOR, vorReason: args.vorReason });
  },
});
