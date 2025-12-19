import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getClerkUserId, getOptionalClerkOrgId, requireIdentity } from "./auth";

export type EnabledModule = "transport" | "depot" | "legal";

type Ctx = QueryCtx | MutationCtx;

export async function requireOrganization(ctx: Ctx) {
  const identity = await requireIdentity(ctx);
  let clerkOrgId = getOptionalClerkOrgId(identity);

  if (!clerkOrgId) {
    const clerkId = getClerkUserId(identity);
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (user?.orgIds?.length === 1) {
      clerkOrgId = user.orgIds[0];
    } else {
      throw new ConvexError("No active organization. Select an organization in Clerk.");
    }
  }

  const org = await ctx.db
    .query("organizations")
    .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", clerkOrgId))
    .first();

  if (!org) throw new ConvexError("Organization not found. Run organization initialization.");
  return { identity, org: org as Doc<"organizations">, orgId: clerkOrgId };
}

export async function requireModule(
  ctx: Ctx,
  moduleName: EnabledModule
) {
  const { identity, org, orgId } = await requireOrganization(ctx);
  if (!org.enabledModules.includes(moduleName)) {
    throw new ConvexError(`Module disabled: ${moduleName}`);
  }
  return { identity, org, orgId };
}

export async function requireAnyModule(
  ctx: Ctx,
  modules: EnabledModule[]
) {
  const { identity, org, orgId } = await requireOrganization(ctx);
  if (!modules.some((m) => org.enabledModules.includes(m))) {
    throw new ConvexError("No enabled modules for this organization.");
  }
  return { identity, org, orgId };
}
