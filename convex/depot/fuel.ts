import { mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { requireModule } from "../lib/org";

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function canonicalizeName(value: string) {
  return normalizeName(value).replace(/[^a-z0-9]+/g, "");
}

function computeNextLevel(args: { currentLevelLiters?: number; currentLevelPercent?: number }, capacityLiters: number) {
  const pct = args.currentLevelPercent;
  if (typeof args.currentLevelLiters === "number") return args.currentLevelLiters;
  if (typeof pct === "number") {
    return Math.round((Math.max(0, Math.min(100, pct)) / 100) * capacityLiters);
  }
  return null;
}

export const listTankNames = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireModule(ctx, "depot");
    if (orgId !== args.orgId) throw new ConvexError("Organization mismatch");

    const tanks = await ctx.db
      .query("tanks")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

    return tanks
      .map((t) => t.name)
      .filter((name) => typeof name === "string" && name.trim().length > 0)
      .sort((a, b) => a.localeCompare(b));
  },
});

export const logLevel = mutation({
  args: {
    orgId: v.string(),
    tankName: v.string(),
    currentLevelLiters: v.optional(v.number()),
    currentLevelPercent: v.optional(v.number()),
    lastReadingTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireModule(ctx, "depot");
    if (orgId !== args.orgId) throw new ConvexError("Organization mismatch");

    const tanks = await ctx.db
      .query("tanks")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

    const targetName = args.tankName.trim();
    const normalizedTarget = normalizeName(targetName);
    const canonicalTarget = canonicalizeName(targetName);

    let tank =
      tanks.find((t) => normalizeName(t.name) === normalizedTarget) ??
      tanks.find((t) => canonicalizeName(t.name) === canonicalTarget) ??
      null;

    if (!tank && (normalizedTarget.length > 0 || canonicalTarget.length > 0)) {
      const prefixMatches = tanks.filter((t) => {
        const n = normalizeName(t.name);
        const c = canonicalizeName(t.name);
        return (
          (normalizedTarget.length > 0 && n.startsWith(normalizedTarget)) ||
          (canonicalTarget.length > 0 && c.startsWith(canonicalTarget))
        );
      });

      if (prefixMatches.length === 1) tank = prefixMatches[0];
      if (prefixMatches.length > 1) {
        const available = prefixMatches.map((t) => t.name).slice(0, 12).join(", ");
        throw new ConvexError(`Tank "${targetName}" not found. Available tanks: ${available}`);
      }
    }

    if (!tank && canonicalTarget.length > 0) {
      const fuzzy = tanks.filter((t) => {
        const c = canonicalizeName(t.name);
        if (c === canonicalTarget) return true;
        if (canonicalTarget.length <= 4) return c.endsWith(canonicalTarget);
        return c.includes(canonicalTarget);
      });
      if (fuzzy.length === 1) tank = fuzzy[0];
      if (fuzzy.length > 1) {
        const available = fuzzy.map((t) => t.name).slice(0, 12).join(", ");
        throw new ConvexError(`Tank "${targetName}" not found. Available tanks: ${available}`);
      }
    }

    if (!tank) {
      const knownNames = tanks.map((t) => t.name).filter((name) => typeof name === "string");
      const available = knownNames.length ? knownNames.join(", ") : "(none)";
      throw new ConvexError(`Tank "${targetName}" not found. Available tanks: ${available}`);
    }

    const nextLevel = computeNextLevel(args, tank.capacityLiters);

    if (nextLevel === null) throw new ConvexError("Provide currentLevelLiters or currentLevelPercent");

    await ctx.db.patch(tank._id, {
      currentLevelLiters: nextLevel,
      lastReadingTime: args.lastReadingTime ?? Date.now(),
    });

    return await ctx.db.get(tank._id);
  },
});
