import { ConvexError } from "convex/values";
import type { UserIdentity } from "convex/server";

export async function requireIdentity(ctx: { auth: { getUserIdentity(): Promise<UserIdentity | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Unauthenticated");
  return identity;
}

export function getClerkOrgId(identity: UserIdentity) {
  const clerkOrgId = getOptionalClerkOrgId(identity);
  if (!clerkOrgId) throw new ConvexError("No active organization. Select an organization in Clerk.");
  return clerkOrgId;
}

export function getOptionalClerkOrgId(identity: UserIdentity) {
  const anyIdentity = identity as unknown as {
    orgId?: string;
    claims?: { org_id?: string; orgId?: string };
  };
  return anyIdentity.orgId ?? anyIdentity.claims?.org_id ?? anyIdentity.claims?.orgId;
}

export function getClerkUserId(identity: UserIdentity) {
  return identity.subject;
}

export function getUserEmail(identity: UserIdentity) {
  const anyIdentity = identity as unknown as { email?: string };
  return anyIdentity.email ?? "";
}
