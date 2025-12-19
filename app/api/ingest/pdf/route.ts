import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const orgId = form.get("orgId");
    const domain = form.get("domain");
    const file = form.get("file");

    if (typeof orgId !== "string" || !orgId.trim()) {
      return NextResponse.json({ ok: false, error: "Missing orgId" }, { status: 400 });
    }
    if (typeof domain !== "string" || !domain.trim()) {
      return NextResponse.json({ ok: false, error: "Missing domain" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json({ ok: false, error: "Missing CONVEX_URL" }, { status: 500 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = await pdfParse(buffer);
    const text = (parsed.text ?? "").trim();

    if (!text) {
      return NextResponse.json({ ok: false, error: "No text extracted from PDF" }, { status: 400 });
    }

    const client = new ConvexHttpClient(convexUrl);
    const { getToken } = await auth();
    const token = await getToken({ template: "convex" });
    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
    }
    client.setAuth(token);

    const result = await client.action(api.intelligence.ingest.saveKnowledge, {
      orgId,
      domain,
      text,
      title: file.name,
    });

    return NextResponse.json({ ok: true, result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "PDF ingest failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
