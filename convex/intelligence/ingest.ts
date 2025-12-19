import { action, internalMutation, mutation, query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { requireOrganization } from "../lib/org";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { getOptionalClerkOrgId, requireIdentity } from "../lib/auth";

export const createSource = internalMutation({
  args: {
    text: v.string(),
    domain: v.string(),
    title: v.string(),
    orgId: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrganization(ctx);
    if (orgId !== args.orgId) throw new ConvexError("Organization mismatch");

    return await ctx.db.insert("knowledgeSources", {
      orgId,
      locationId: undefined,
      kind: "knowledge",
      title: args.title,
      sourceUrl: undefined,
      rawText: args.text,
      storageId: undefined,
      mediaType: undefined,
      mediaAnalysis: undefined,
      domain: args.domain,
      sourceFormat: "pdf",
      metadata: {
        type: args.type,
        status: "processing",
      },
      createdAt: Date.now(),
    });
  },
});

export const insertKnowledgeChunks = internalMutation({
  args: {
    orgId: v.string(),
    sourceId: v.id("knowledgeSources"),
    domain: v.string(),
    chunks: v.array(
      v.object({
        text: v.string(),
        embedding: v.array(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrganization(ctx);
    if (orgId !== args.orgId) throw new ConvexError("Organization mismatch");

    const expectedDimensions = Number(process.env.OPENAI_EMBEDDING_DIMENSION) || 1536;
    if (expectedDimensions !== 1536) {
      throw new ConvexError(
        "OPENAI_EMBEDDING_DIMENSION must be 1536 for the current knowledgeChunks vector index."
      );
    }

    if (args.chunks.length === 0) return { inserted: 0 };
    for (const chunk of args.chunks) {
      if (chunk.embedding.length !== expectedDimensions) {
        throw new ConvexError(
          `Embedding dimension mismatch (expected ${expectedDimensions}, got ${chunk.embedding.length})`
        );
      }
      await ctx.db.insert("knowledgeChunks", {
        orgId,
        sourceId: args.sourceId,
        domain: args.domain,
        text: chunk.text,
        embedding: chunk.embedding,
      });
    }

    return { inserted: args.chunks.length };
  },
});

export const saveKnowledge = action({
  args: {
    text: v.string(),
    domain: v.string(),
    title: v.string(),
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const activeOrgId = getOptionalClerkOrgId(identity);
    const user = (await ctx.runQuery(internal.core.users.getMyUser, {})) as { orgIds?: string[] } | null;

    const isMember =
      (activeOrgId != null && activeOrgId === args.orgId) ||
      Boolean(user?.orgIds?.includes(args.orgId));
    if (!isMember) throw new ConvexError("Organization access denied.");

    const org = (await ctx.runQuery(internal.core.organizations.getByClerkOrgId, {
      clerkOrgId: args.orgId,
    })) as unknown | null;
    if (!org) throw new ConvexError("Organization not initialized");

    const sourceId = (await ctx.runMutation(internal.intelligence.ingest.createSource, {
      text: args.text,
      domain: args.domain,
      title: args.title,
      orgId: args.orgId,
      type: "pdf_upload",
    })) as Id<"knowledgeSources">;

    await ctx.runAction(internal.intelligence.vectorize.processSource, {
      sourceId,
      text: args.text,
      domain: args.domain,
      orgId: args.orgId,
    });

    return { success: true, sourceId };
  },
});

export const save = mutation({
  args: {
    orgId: v.string(),
    kind: v.string(),
    title: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    rawText: v.optional(v.string()),
    locationId: v.optional(v.id("locations")),
    storageId: v.optional(v.string()),
    mediaType: v.optional(v.string()),
    mediaAnalysis: v.optional(v.string()),
    domain: v.optional(v.string()),
    sourceFormat: v.optional(v.string()),
    metadata: v.any(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireOrganization(ctx);
    if (orgId !== args.orgId) throw new Error("Organization mismatch");

    const recordId = await ctx.db.insert("knowledgeSources", {
      orgId,
      locationId: args.locationId,
      kind: args.kind,
      title: args.title,
      sourceUrl: args.sourceUrl,
      rawText: args.rawText,
      storageId: args.storageId,
      mediaType: args.mediaType,
      mediaAnalysis: args.mediaAnalysis,
      domain: args.domain ?? "general",
      sourceFormat: args.sourceFormat ?? "text",
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    return await ctx.db.get(recordId);
  },
});

export const getRecent = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireOrganization(ctx);
    const records = await ctx.db
      .query("knowledgeSources")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .order("desc")
      .take(20);

    const mediaUrls = await Promise.all(
      records.map(async (record) => {
        if (!record.storageId) return null;
        return await ctx.storage.getUrl(record.storageId as Id<"_storage">);
      })
    );

    return records.map((record, idx) => ({
      ...record,
      mediaUrl: mediaUrls[idx],
    }));
  },
});
