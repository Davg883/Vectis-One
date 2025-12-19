import { mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { requireModule } from "../lib/org";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireModule(ctx, "transport");
    return await ctx.db.query("vendors").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    capabilities: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireModule(ctx, "transport");
    if (!args.name.trim()) throw new ConvexError("Vendor name required");
    if (!args.email.trim()) throw new ConvexError("Vendor email required");

    return await ctx.db.insert("vendors", {
      orgId,
      name: args.name.trim(),
      email: args.email.trim(),
      capabilities: args.capabilities,
    });
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireModule(ctx, "transport");
    const existing = await ctx.db.query("vendors").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect();
    for (const vDoc of existing) await ctx.db.delete(vDoc._id);

    await ctx.db.insert("vendors", {
      orgId,
      name: "Isle Tyre & Service",
      email: "workshop@example.com",
      capabilities: ["tyres", "brakes"],
    });
    await ctx.db.insert("vendors", {
      orgId,
      name: "Solent Fleet Engineering",
      email: "fleet@example.com",
      capabilities: ["engine", "electrical"],
    });
    return "Vendors seeded";
  },
});

