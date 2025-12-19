import type { MutationCtx, QueryCtx } from "../_generated/server";
import { ConvexError } from "convex/values";

type ReadCtx = QueryCtx | MutationCtx;

export type ResolvedLocation = {
  uprn: string;
  address: string;
  lat: number;
  lng: number;
  metadata: Record<string, unknown>;
};

function normalizeUprn(uprn: string) {
  return uprn.replace(/\s+/g, "");
}

function stableHash(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export async function findLocationByUprn(ctx: ReadCtx, orgId: string, uprn: string) {
  const record = await ctx.db
    .query("locations")
    .withIndex("by_uprn", (q) => q.eq("uprn", normalizeUprn(uprn)))
    .first();
  if (!record) return null;
  if (record.orgId !== orgId) return null;
  return record;
}

export async function findLocationByGooglePlaceId(
  ctx: ReadCtx,
  orgId: string,
  googlePlaceId: string
) {
  const location = await ctx.db
    .query("locations")
    .withIndex("by_google_place_id", (q) => q.eq("googlePlaceId", googlePlaceId))
    .first();
  if (!location) return null;
  if (location.orgId !== orgId) return null;
  return location;
}

async function resolveViaBff(query: string): Promise<ResolvedLocation | null> {
  const baseUrl = process.env.BFF_BASE_URL;
  const token = process.env.BFF_INTERNAL_TOKEN;
  if (!baseUrl) throw new ConvexError("Missing BFF_BASE_URL (Convex env var).");
  if (!token) throw new ConvexError("Missing BFF_INTERNAL_TOKEN (Convex env var).");

  const resp = await fetch(`${baseUrl.replace(/\/$/, "")}/api/maps/os-places`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-token": token,
    },
    body: JSON.stringify({ query }),
  });

  const json = (await resp.json().catch(() => null)) as { result?: ResolvedLocation | null } | null;
  return json?.result ?? null;
}

export async function ensureLocationFromQuery(ctx: MutationCtx, orgId: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const locations = await ctx.db
    .query("locations")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .collect();

  const exact = locations.find((l) => l.address.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;

  const looksLikeUprn = /^\d{6,}$/.test(trimmed);
  if (looksLikeUprn) {
    const byUprn = await findLocationByUprn(ctx, orgId, trimmed);
    if (byUprn) return byUprn;
  }

  const resolved = await resolveViaBff(trimmed);
  if (resolved) {
    const cachedByUprn = await findLocationByUprn(ctx, orgId, resolved.uprn);
    if (cachedByUprn) return cachedByUprn;

    const meta = resolved.metadata as unknown;
    const googlePlaceId =
      meta && typeof meta === "object"
        ? ((meta as Record<string, unknown>)["googlePlaceId"] as string | undefined)
        : undefined;
    if (googlePlaceId) {
      const cachedByPlaceId = await findLocationByGooglePlaceId(ctx, orgId, googlePlaceId);
      if (cachedByPlaceId) return cachedByPlaceId;
    }

    const locationId = await ctx.db.insert("locations", {
      orgId,
      uprn: normalizeUprn(resolved.uprn),
      address: resolved.address,
      lat: resolved.lat,
      lng: resolved.lng,
      metadata: resolved.metadata,
      googlePlaceId,
    });
    return await ctx.db.get(locationId);
  }

  const internalUprn = `INTERNAL-${stableHash(`${orgId}:${trimmed}`)}`;
  const cachedInternal = await findLocationByUprn(ctx, orgId, internalUprn);
  if (cachedInternal) return cachedInternal;

  const locationId = await ctx.db.insert("locations", {
    orgId,
    uprn: internalUprn,
    address: trimmed,
    lat: 0,
    lng: 0,
    metadata: { source: "internal", query: trimmed },
  });
  return await ctx.db.get(locationId);
}
