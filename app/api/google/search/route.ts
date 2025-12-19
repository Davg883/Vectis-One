import { NextResponse } from "next/server";

type LatLng = { lat: number; lng: number };

export async function POST(req: Request) {
  const internalToken = process.env.BFF_INTERNAL_TOKEN;
  const headerToken = req.headers.get("x-internal-token");
  if (!internalToken || headerToken !== internalToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { textQuery?: string; locationBias?: LatLng }
    | null;

  const textQuery = body?.textQuery?.trim();
  if (!textQuery) return NextResponse.json({ error: "Missing textQuery" }, { status: 400 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing GOOGLE_PLACES_API_KEY" }, { status: 500 });

  const requestBody: Record<string, unknown> = { textQuery };
  const bias = body?.locationBias;
  if (bias && Number.isFinite(bias.lat) && Number.isFinite(bias.lng)) {
    requestBody.locationBias = {
      circle: {
        center: { latitude: bias.lat, longitude: bias.lng },
        radius: 2500,
      },
    };
  }

  const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify(requestBody),
  });

  const json = await resp.json().catch(() => ({}));
  return NextResponse.json(json, { status: resp.status });
}

