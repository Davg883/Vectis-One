import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

type CachedGoogleData = {
  rating: number;
  userRatingsTotal: number;
  cachedAt: number;
};

export async function POST(req: Request) {
  const internalToken = process.env.BFF_INTERNAL_TOKEN;
  const headerToken = req.headers.get("x-internal-token");
  if (!internalToken || headerToken !== internalToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { placeId?: string } | null;
  const placeId = body?.placeId?.trim();
  if (!placeId) return NextResponse.json({ error: "Missing placeId" }, { status: 400 });

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const convexAdminKey = process.env.CONVEX_ADMIN_KEY;
  if (!convexUrl) return NextResponse.json({ error: "Missing NEXT_PUBLIC_CONVEX_URL" }, { status: 500 });
  if (!convexAdminKey) {
    return NextResponse.json(
      { error: "Missing CONVEX_ADMIN_KEY (required for server-side Convex cache checks)" },
      { status: 500 }
    );
  }

  const client = new ConvexHttpClient(convexUrl);
  (client as unknown as { setAdminAuth: (token: string, identity?: { subject: string; issuer: string }) => void })
    .setAdminAuth(convexAdminKey, { subject: "bff-google", issuer: "bff" });

  const cached = (await client.query(api.intelligence.locations.getCachedGoogleData, {
    placeId,
  })) as CachedGoogleData | null;

  if (cached) {
    return NextResponse.json({
      source: "cache",
      place: {
        id: placeId,
        rating: cached.rating,
        userRatingCount: cached.userRatingsTotal,
        cachedAt: cached.cachedAt,
      },
    });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing GOOGLE_PLACES_API_KEY" }, { status: 500 });

  const resp = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,displayName,photos,rating,userRatingCount,regularOpeningHours",
    },
  });

  const json = (await resp.json().catch(() => null)) as
    | {
        id?: string;
        rating?: number;
        userRatingCount?: number;
      }
    | null;

  if (resp.ok && json?.rating != null && json?.userRatingCount != null) {
    await client
      .mutation(api.intelligence.locations.cacheGoogleData, {
        placeId,
        rating: json.rating,
        userRatingsTotal: json.userRatingCount,
      })
      .catch(() => undefined);
  }

  return NextResponse.json({ source: "google", place: json }, { status: resp.status });
}
