import { internalQuery } from "../_generated/server";
import { requireIdentity } from "../lib/auth";

export const getMyUser = internalQuery({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});

