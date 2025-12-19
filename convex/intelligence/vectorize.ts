import { internalAction } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

function chunkText(text: string, chunkSize: number, overlap: number) {
  const trimmed = text.replace(/\s+\n/g, "\n").trim();
  if (!trimmed) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < trimmed.length) {
    const end = Math.min(trimmed.length, start + chunkSize);
    const chunk = trimmed.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= trimmed.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

export const processSource = internalAction({
  args: {
    sourceId: v.id("knowledgeSources"),
    text: v.string(),
    domain: v.string(),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new ConvexError("Missing OPENAI_API_KEY (Convex env var).");

    const model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
    const dimensions = Number(process.env.OPENAI_EMBEDDING_DIMENSION) || 1536;
    if (dimensions !== 1536) {
      throw new ConvexError(
        "OPENAI_EMBEDDING_DIMENSION must be 1536 for the current knowledgeChunks vector index."
      );
    }

    const parts = chunkText(args.text, 1000, 200);
    if (parts.length === 0) throw new ConvexError("No text extracted for ingestion.");

    const embeddings: number[][] = [];
    const batchSize = 64;
    for (let i = 0; i < parts.length; i += batchSize) {
      const batch = parts.slice(i, i + batchSize);
      const resp = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: batch,
          dimensions,
        }),
      });

      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        throw new ConvexError(`Embedding request failed (${resp.status}): ${body}`);
      }

      const json = (await resp.json().catch(() => null)) as { data?: Array<{ embedding?: number[] }> } | null;
      const batchEmbeddings = json?.data?.map((d) => d.embedding).filter(Boolean) as number[][];
      if (batchEmbeddings.length !== batch.length) {
        throw new ConvexError("Embedding response length mismatch.");
      }
      embeddings.push(...batchEmbeddings);
    }

    const chunkRows = parts.map((text, idx) => ({ text, embedding: embeddings[idx] }));
    await ctx.runMutation(internal.intelligence.ingest.insertKnowledgeChunks, {
      orgId: args.orgId,
      sourceId: args.sourceId as Id<"knowledgeSources">,
      domain: args.domain,
      chunks: chunkRows,
    });

    return { ok: true, chunks: chunkRows.length };
  },
});

