import { mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { requireOrganization } from "../lib/org";
import { ensureLocationFromQuery } from "../lib/maps";

export const ensureFromQuery = mutation({
  args: {
    orgId: v.string(),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrganization(ctx);
    if (orgId !== args.orgId) throw new Error("Organization mismatch");
    return await ensureLocationFromQuery(ctx, orgId, args.query);
  },
});

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const getCachedGoogleData = query({
  args: { placeId: v.string() },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrganization(ctx);
    const record = await ctx.db
      .query("locations")
      .withIndex("by_google_place_id", (q) => q.eq("googlePlaceId", args.placeId))
      .first();
    if (!record || record.orgId !== orgId) return null;
    if (!record.googleData) return null;
    const googleData = record.googleData as unknown;
    const cachedAt =
      googleData && typeof googleData === "object"
        ? (googleData as Record<string, unknown>)["cachedAt"]
        : undefined;
    if (typeof cachedAt !== "number") return null;
    const expired = cachedAt < Date.now() - THIRTY_DAYS_MS;
    if (expired) return null;
    return googleData;
  },
});

export const cacheGoogleData = mutation({
  args: {
    placeId: v.string(),
    rating: v.number(),
    userRatingsTotal: v.number(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrganization(ctx);
    const locations = await ctx.db
      .query("locations")
      .withIndex("by_google_place_id", (q) => q.eq("googlePlaceId", args.placeId))
      .collect();
    const inOrg = locations.filter((l) => l.orgId === orgId);
    if (inOrg.length === 0) throw new ConvexError("No location found for this placeId");

    const now = Date.now();
    await Promise.all(
      inOrg.map((loc) =>
        ctx.db.patch(loc._id, {
          googlePlaceId: args.placeId,
          googleData: { rating: args.rating, userRatingsTotal: args.userRatingsTotal, cachedAt: now },
        })
      )
    );
    return { updated: inOrg.length };
  },
});

export const migrateLegacyLocations = mutation({
  args: {
    migrationToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const expectedToken = process.env.MIGRATION_TOKEN;
    const tokenOk = Boolean(expectedToken && expectedToken === args.migrationToken);
    if (!identity && !tokenOk) throw new ConvexError("Unauthenticated");

    const locations = await ctx.db.query("locations").collect();

    let patched = 0;

    for (const loc of locations) {
      if (typeof loc.lat === "number" && typeof loc.lng === "number") continue;

      const metadata =
        loc.metadata && typeof loc.metadata === "object"
          ? (loc.metadata as Record<string, unknown>)
          : {};

      const legacyCoordinates =
        (loc as unknown as { coordinates?: { lat?: number; lng?: number } }).coordinates ??
        undefined;
      const legacyLat = legacyCoordinates?.lat;
      const legacyLng = legacyCoordinates?.lng;

      const nextLat =
        typeof legacyLat === "number" ? legacyLat : typeof loc.lat === "number" ? loc.lat : 0;
      const nextLng =
        typeof legacyLng === "number" ? legacyLng : typeof loc.lng === "number" ? loc.lng : 0;

      await ctx.db.patch(loc._id, {
        lat: nextLat,
        lng: nextLng,
        metadata: {
          ...metadata,
          migratedAt: Date.now(),
          legacyCoordinates: typeof legacyLat === "number" || typeof legacyLng === "number",
        },
      });
      patched += 1;
    }

    return { scanned: locations.length, patched };
  },
});
