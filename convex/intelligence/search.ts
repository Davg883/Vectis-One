import { action, internalQuery } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import { getOptionalClerkOrgId, requireIdentity } from "../lib/auth";
import type { Id } from "../_generated/dataModel";

type RetrievedChunk = {
  text: string;
  domain: string;
  sourceTitle: string;
};

export const hydrateChunks = internalQuery({
  args: {
    orgId: v.string(),
    domain: v.optional(v.string()),
    chunkIds: v.array(v.id("knowledgeChunks")),
    limit: v.number(),
  },
  handler: async (ctx, args): Promise<RetrievedChunk[]> => {
    const chunks: Array<{
      sourceId: Id<"knowledgeSources">;
      text: string;
      domain: string;
    }> = [];

    for (const id of args.chunkIds) {
      const doc = await ctx.db.get(id);
      if (!doc) continue;
      if (doc.orgId !== args.orgId) continue;
      if (args.domain && doc.domain !== args.domain) continue;
      chunks.push({ sourceId: doc.sourceId, text: doc.text, domain: doc.domain });
      if (chunks.length >= args.limit) break;
    }

    const uniqueSourceIds = Array.from(new Set(chunks.map((c) => String(c.sourceId)))) as Array<
      Id<"knowledgeSources">
    >;
    const sources = await Promise.all(uniqueSourceIds.map((id) => ctx.db.get(id)));
    const titleById = new Map<string, string>();
    for (const src of sources) {
      if (!src) continue;
      if (src.orgId !== args.orgId) continue;
      titleById.set(String(src._id), (src.title ?? "Untitled") as string);
    }

    return chunks.map((c) => ({
      text: c.text,
      domain: c.domain,
      sourceTitle: titleById.get(String(c.sourceId)) ?? "Untitled",
    }));
  },
});

async function embedQuery(text: string) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new ConvexError("Missing OPENAI_API_KEY (Convex env var).");

  const model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
  const dimensions = Number(process.env.OPENAI_EMBEDDING_DIMENSION) || 1536;
  if (dimensions !== 1536) {
    throw new ConvexError("OPENAI_EMBEDDING_DIMENSION must be 1536 for the current vector index.");
  }

  const resp = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: text, dimensions }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new ConvexError(`Embedding request failed (${resp.status}): ${body}`);
  }

  const json = (await resp.json().catch(() => null)) as { data?: Array<{ embedding?: number[] }> } | null;
  const embedding = json?.data?.[0]?.embedding;
  if (!embedding) throw new ConvexError("Embedding response missing vector.");
  if (embedding.length !== dimensions) {
    throw new ConvexError(`Embedding dimension mismatch (expected ${dimensions}, got ${embedding.length})`);
  }
  return embedding;
}

export const ask = action({
  args: {
    query: v.string(),
    domain: v.optional(v.string()),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const activeOrgId = getOptionalClerkOrgId(identity);
    const user = (await ctx.runQuery(internal.core.users.getMyUser, {})) as { orgIds?: string[] } | null;

    const isMember =
      (activeOrgId != null && activeOrgId === args.orgId) || Boolean(user?.orgIds?.includes(args.orgId));
    if (!isMember) throw new ConvexError("Organization access denied.");

    const org = (await ctx.runQuery(internal.core.organizations.getByClerkOrgId, {
      clerkOrgId: args.orgId,
    })) as unknown | null;
    if (!org) throw new ConvexError("Organization not initialized");

    const queryText = args.query.trim();
    if (!queryText) throw new ConvexError("Query required");

    const embedding = await embedQuery(queryText);

    const vectorResults = (await ctx.vectorSearch("knowledgeChunks", "by_embedding_domain", {
      vector: embedding,
      limit: args.domain ? 20 : 3,
      filter: (q) => q.eq("orgId", args.orgId),
    })) as Array<{ _id: Id<"knowledgeChunks">; _score: number }>;

    const chunks = (await ctx.runQuery(internal.intelligence.search.hydrateChunks, {
      orgId: args.orgId,
      domain: args.domain,
      chunkIds: vectorResults.map((r) => r._id),
      limit: 3,
    })) as RetrievedChunk[];

    const context = chunks
      .map(
        (c, idx) =>
          `[#${idx + 1}] SOURCE: ${c.sourceTitle}\nDOMAIN: ${c.domain}\nCONTENT:\n${c.text}\n`
      )
      .join("\n---\n");

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new ConvexError("Missing OPENAI_API_KEY (Convex env var).");

    const model = process.env.OPENAI_RAG_MODEL || "gpt-4o";
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are Aegis. Answer using ONLY the provided context. If the context is insufficient, say you don't know. Cite the source title(s) you used.",
          },
          { role: "user", content: `Question:\n${queryText}\n\nContext:\n${context || "(no context found)"}` },
        ],
      }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new ConvexError(`OpenAI request failed (${resp.status}): ${body}`);
    }

    const json = (await resp.json().catch(() => null)) as
      | { choices?: Array<{ message?: { content?: string } }> }
      | null;
    const answer = json?.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new ConvexError("LLM response missing content.");

    return { answer, sources: chunks.map((c) => ({ title: c.sourceTitle, domain: c.domain })) };
  },
});
