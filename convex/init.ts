import { mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getClerkOrgId, getClerkUserId, getOptionalClerkOrgId, getUserEmail, requireIdentity } from "./lib/auth";

export const seedAegisData = mutation({
  args: {
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const clerkOrgId = args.orgId ?? getOptionalClerkOrgId(identity);
    if (!clerkOrgId) {
      throw new ConvexError("Organization ID required for seeding.");
    }

    const enabledModules = ["transport", "depot", "legal", "civic"];

    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", clerkOrgId))
      .first();

    let orgDocId: Id<"organizations">;
    if (!existingOrg) {
      orgDocId = await ctx.db.insert("organizations", {
        name: "Aegis Organization",
        clerkOrgId,
        slug: clerkOrgId.slice(0, 12).toLowerCase(),
        subscriptionPlan: "starter",
        enabledModules,
      });
    } else {
      orgDocId = existingOrg._id;
      await ctx.db.patch(existingOrg._id, { enabledModules });
    }

    const clerkId = getClerkUserId(identity);
    const email = getUserEmail(identity);
    const userExisting = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!userExisting) {
      await ctx.db.insert("users", {
        email,
        clerkId,
        orgIds: [clerkOrgId],
        role: "admin",
      });
    } else if (!userExisting.orgIds.includes(clerkOrgId)) {
      await ctx.db.patch(userExisting._id, { orgIds: [...userExisting.orgIds, clerkOrgId] });
    }

    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_org", (q) => q.eq("orgId", clerkOrgId))
      .collect();
    for (const vDoc of vehicles) await ctx.db.delete(vDoc._id);

    const tanks = await ctx.db
      .query("tanks")
      .withIndex("by_org", (q) => q.eq("orgId", clerkOrgId))
      .collect();
    for (const tDoc of tanks) await ctx.db.delete(tDoc._id);

    const [overdue, pending, submitted] = await Promise.all([
      ctx.db
        .query("legalDeadlines")
        .withIndex("by_org_status", (q) => q.eq("orgId", clerkOrgId).eq("status", "overdue"))
        .collect(),
      ctx.db
        .query("legalDeadlines")
        .withIndex("by_org_status", (q) => q.eq("orgId", clerkOrgId).eq("status", "pending"))
        .collect(),
      ctx.db
        .query("legalDeadlines")
        .withIndex("by_org_status", (q) => q.eq("orgId", clerkOrgId).eq("status", "submitted"))
        .collect(),
    ]);
    for (const d of [...overdue, ...pending, ...submitted]) await ctx.db.delete(d._id);

    const now = Date.now();
    await ctx.db.insert("vehicles", {
      orgId: clerkOrgId,
      registration: "AEGIS 001",
      make: "DAF",
      model: "CF",
      type: "HGV",
      isVOR: false,
      vorReason: undefined,
      nextInspectionDate: now + 30 * 24 * 60 * 60 * 1000,
    });

    const capacityLiters = 50000;
    await ctx.db.insert("tanks", {
      orgId: clerkOrgId,
      name: "Tank 1A",
      fuelType: "Kerosene",
      capacityLiters,
      currentLevelLiters: Math.round(capacityLiters * 0.42),
      deadstockLiters: 2000,
      lastReadingTime: now,
    });

    await ctx.db.insert("legalDeadlines", {
      orgId: clerkOrgId,
      title: "GDPR SAR Response",
      dueDate: now + 7 * 24 * 60 * 60 * 1000,
      severity: "critical",
      status: "pending",
      relatedCaseFileId: undefined,
    });

    const org = await ctx.db.get(orgDocId);
    return { ok: true, org };
  },
});
