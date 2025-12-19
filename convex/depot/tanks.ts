import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireModule } from "../lib/org";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireModule(ctx, "depot");
    return await ctx.db.query("tanks").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect();
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireModule(ctx, "depot");
    const existing = await ctx.db.query("tanks").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect();
    for (const t of existing) await ctx.db.delete(t._id);

    const now = Date.now();
    await ctx.db.insert("tanks", {
      orgId,
      name: "Tank 1A",
      fuelType: "Kerosene",
      capacityLiters: 50000,
      currentLevelLiters: 42500,
      deadstockLiters: 2000,
      lastReadingTime: now,
    });

    await ctx.db.insert("tanks", {
      orgId,
      name: "Tank 1B",
      fuelType: "Gas Oil",
      capacityLiters: 50000,
      currentLevelLiters: 12000,
      deadstockLiters: 2000,
      lastReadingTime: now,
    });

    return "DepotOS seeded";
  },
});

export const recordReading = mutation({
  args: {
    tankId: v.id("tanks"),
    currentLevelLiters: v.number(),
    lastReadingTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireModule(ctx, "depot");
    const tank = await ctx.db.get(args.tankId);
    if (!tank || tank.orgId !== orgId) return;
    await ctx.db.patch(args.tankId, {
      currentLevelLiters: args.currentLevelLiters,
      lastReadingTime: args.lastReadingTime ?? Date.now(),
    });
  },
});

