import { internalAction, mutation } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { requireOrganization } from "../lib/org";
import type { Id } from "../_generated/dataModel";

function toBase64(arrayBuffer: ArrayBuffer) {
  const anyGlobal = globalThis as unknown as { Buffer?: typeof Buffer };
  if (anyGlobal.Buffer) return anyGlobal.Buffer.from(arrayBuffer).toString("base64");

  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export const generateUploadUrl = mutation({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrganization(ctx);
    if (orgId !== args.orgId) throw new ConvexError("Organization mismatch");
    return await ctx.storage.generateUploadUrl();
  },
});

export const analyzeMedia = internalAction({
  args: {
    storageId: v.string(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_GEN_AI_KEY;
    if (!apiKey) throw new Error("Missing GOOGLE_GEN_AI_KEY");

    const fileUrl = await ctx.storage.getUrl(args.storageId as Id<"_storage">);
    if (!fileUrl) throw new Error("File not found");

    if (args.mimeType.startsWith("video/")) {
      return "Video received. Gemini analysis pipeline pending (placeholder).";
    }

    const fileResp = await fetch(fileUrl);
    if (!fileResp.ok) {
      const body = await fileResp.text().catch(() => "");
      throw new Error(`Failed to fetch media (${fileResp.status}): ${body}`);
    }

    const arrayBuffer = await fileResp.arrayBuffer();
    const base64Data = toBase64(arrayBuffer);

    const model = "gemini-3-pro-preview";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Analyze this image for the Aegis Logistics OS. Identify physical defects, fuel levels, or hazards. Return a concise summary.",
              },
              {
                inline_data: {
                  mime_type: args.mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Gemini 3.0 Error:", errorText);
      throw new Error(`Gemini Vision Failed: ${response.status} - ${errorText}`);
    }

    const json = (await response.json().catch(() => null)) as any;
    const analysis: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;

    return analysis?.trim() || "Vision analysis failed";
  },
});
