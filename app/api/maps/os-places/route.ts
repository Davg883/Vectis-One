import { NextResponse } from "next/server";

type ResolveRequest = {
  query: string;
};

type ResolveResult = {
  uprn: string;
  address: string;
  lat: number;
  lng: number;
  metadata: Record<string, unknown>;
} | null;

export async function POST(req: Request) {
  const internalToken = process.env.BFF_INTERNAL_TOKEN;
  const headerToken = req.headers.get("x-internal-token");
  if (!internalToken || headerToken !== internalToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as ResolveRequest | null;
  const query = body?.query?.trim();
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const osPlacesKey = process.env.OS_PLACES_API_KEY;
  if (!osPlacesKey) {
    return NextResponse.json({ result: null satisfies ResolveResult });
  }

  const baseUrl = process.env.OS_PLACES_BASE_URL ?? "https://api.os.uk/search/places/v1/find";
  const url = new URL(baseUrl);
  url.searchParams.set("query", query);
  url.searchParams.set("key", osPlacesKey);

  try {
    const resp = await fetch(url.toString(), { method: "GET" });
    if (!resp.ok) {
      return NextResponse.json({ result: null satisfies ResolveResult });
    }
    const json = (await resp.json().catch(() => null)) as unknown;
    const anyJson = json as {
      results?: Array<{ DPA?: unknown; LPI?: unknown }>;
    } | null;

    const firstRaw = anyJson?.results?.[0]?.DPA ?? anyJson?.results?.[0]?.LPI ?? null;
    const first = (firstRaw && typeof firstRaw === "object" ? (firstRaw as Record<string, unknown>) : null);

    const uprn = String(first?.["UPRN"] ?? "").trim();
    if (!uprn) {
      return NextResponse.json({ result: null satisfies ResolveResult });
    }

    const address =
      String(first?.["ADDRESS"] ?? query).trim();

    const location = first?.["LOCATION"];
    const locationRec =
      location && typeof location === "object" ? (location as Record<string, unknown>) : null;
    const lat =
      Number(first?.["LAT"] ?? first?.["LATITUDE"] ?? locationRec?.["LAT"]) || 0;
    const lng =
      Number(first?.["LNG"] ?? first?.["LONGITUDE"] ?? locationRec?.["LNG"]) || 0;

    const result: ResolveResult = {
      uprn,
      address,
      lat,
      lng,
      metadata: {
        source: "os-places",
        query,
        raw: anyJson?.results?.[0] ?? null,
      },
    };

    return NextResponse.json({ result });
  } catch {
    return NextResponse.json({ result: null satisfies ResolveResult });
  }
}
