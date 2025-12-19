import { internalQuery, mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import {
  getClerkOrgId,
  getClerkUserId,
  getOptionalClerkOrgId,
  getUserEmail,
  requireIdentity,
} from "../lib/auth";

export const getMyOrganization = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    let clerkOrgId = getOptionalClerkOrgId(identity);

    // Fallback: if the Convex token doesn’t carry org context (missing `org_id`),
    // use our DB linkage as a last resort. This unblocks newly-seeded tenants.
    if (!clerkOrgId) {
      const clerkId = getClerkUserId(identity);
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
        .first();

      if (user?.orgIds?.length === 1) {
        clerkOrgId = user.orgIds[0];
      } else {
        return null;
      }
    }

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", clerkOrgId))
      .first();
    // If the user is signed in but not yet initialized into our tenancy model,
    // return `null` so the UI can route to onboarding instead of crashing.
    return org ?? null;
  },
});

export const ensureMyOrganization = mutation({
  args: {
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    subscriptionPlan: v.optional(v.string()),
    enabledModules: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const clerkOrgId = getClerkOrgId(identity);

    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", clerkOrgId))
      .first();
    if (existing) return existing;

    const name = args.name ?? "Aegis Organization";
    const slug = args.slug ?? clerkOrgId.slice(0, 12).toLowerCase();
    const subscriptionPlan = args.subscriptionPlan ?? "starter";
    const enabledModules = args.enabledModules ?? ["transport", "depot", "legal"];

    const orgDocId = await ctx.db.insert("organizations", {
      name,
      clerkOrgId,
      slug,
      subscriptionPlan,
      enabledModules,
    });

    const org = await ctx.db.get(orgDocId);
    if (!org) throw new ConvexError("Failed to create organization.");

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

    return org;
  },
});

export const getByClerkOrgId = internalQuery({
  args: {
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    return await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();
  },
});
