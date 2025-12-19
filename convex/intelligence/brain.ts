import { action } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

type Decision = {
  type: "fuel" | "defect" | "knowledge";
  entity: string | null;
  value: number | string | null;
  summary: string;
  severity?: "minor" | "major" | "dangerous";
  defectId?: string;
};

async function embedText(text: string) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error("Missing OPENAI_API_KEY (Convex env var).");

  const model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
  const dimensions = Number(process.env.OPENAI_EMBEDDING_DIMENSION) || 1536;
  if (dimensions !== 1536) {
    throw new Error("OPENAI_EMBEDDING_DIMENSION must be 1536 for the current vector index.");
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
    throw new Error(`Embedding request failed (${resp.status}): ${body}`);
  }

  const json = (await resp.json().catch(() => null)) as { data?: Array<{ embedding?: number[] }> } | null;
  const embedding = json?.data?.[0]?.embedding;
  if (!embedding) throw new Error("Embedding response missing vector.");
  if (embedding.length !== dimensions) {
    throw new Error(`Embedding dimension mismatch (expected ${dimensions}, got ${embedding.length})`);
  }
  return embedding;
}

export const think = action({
  args: {
    text: v.string(),
    orgId: v.optional(v.string()), // Made optional for safety
    storageId: v.optional(v.string()),
    mediaType: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    entity: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!args.orgId) throw new Error("No Organization ID provided to Brain.");
    const orgId = args.orgId;

    const tankNames = (await ctx.runQuery(api.depot.fuel.listTankNames, {
      orgId,
    })) as string[];

    const mediaType = args.mediaType ?? "";
    if (args.storageId && mediaType.startsWith("video/")) {
      return {
        type: "knowledge",
        entity: null,
        value: null,
        summary: "Video stored (analysis pipeline pending).",
      } satisfies Decision;
    }

    let visualAnalysis = "";
    let lawText = "";

    if (args.storageId && args.mediaType) {
      visualAnalysis = (await ctx.runAction(internal.intelligence.media.analyzeMedia, {
        storageId: args.storageId,
        mimeType: args.mediaType,
      })) as string;

      const embedding = await embedText(visualAnalysis);
      const relevant = (await ctx.vectorSearch("knowledgeChunks", "by_embedding_domain", {
        vector: embedding,
        limit: 20,
        filter: (q) => q.eq("orgId", orgId),
      })) as Array<{ _id: Id<"knowledgeChunks">; _score: number }>;

      const hydrated = (await ctx.runQuery(internal.intelligence.search.hydrateChunks, {
        orgId,
        domain: undefined,
        chunkIds: relevant.map((r) => r._id),
        limit: 3,
      })) as Array<{ text: string; domain: string; sourceTitle: string }>;

      lawText = hydrated
        .map((c, idx) => `[#${idx + 1}] SOURCE: ${c.sourceTitle}\nDOMAIN: ${c.domain}\n${c.text}`)
        .join("\n---\n");
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY (Convex env var).");

    const model = process.env.OPENAI_ROUTER_MODEL || "gpt-4o-mini";

    const systemPrompt = `You are the Aegis Logistics Router.
Analyze the input.
Known Tanks: ${tankNames?.join(", ") || "None"}.
${visualAnalysis ? `\n[VISUAL ANALYSIS]: ${visualAnalysis}` : ""}
${lawText ? `\n[RELEVANT LAWS/RULES]:\n${lawText}\n` : ""}
INSTRUCTIONS:
- Return JSON ONLY in the exact shape below.
- If the input mentions a Tank or fuel level (low, high, %), it is ALWAYS "type": "fuel". It is NOT a defect.
- If this is a defect, YOU MUST estimate severity ("minor", "major", "dangerous").
- If this is a defect and relevant rules are provided, cite the specific Rule/Section from [RELEVANT LAWS/RULES] in the summary.

Return JSON ONLY:
{
  "type": "fuel" | "defect" | "knowledge",
  "entity": "Exact Tank Name" | "Vehicle Reg" | null,
  "value": number | string | null,
  "summary": "Short description",
  "severity": "minor" | "major" | "dangerous" (optional, required for defects)
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: args.text,
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`OpenAI request failed (${response.status}): ${body}`);
    }

    const json = (await response.json().catch(() => null)) as
      | { choices?: Array<{ message?: { content?: string } }> }
      | null;

    const raw = json?.choices?.[0]?.message?.content;
    if (!raw) throw new Error("OpenAI response missing content.");

    // Clean markup if present
    const cleanRaw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    let merged: Decision;
    try {
      merged = JSON.parse(cleanRaw) as Decision;
    } catch (e) {
      console.error("JSON Parse Error on LLM Output:", cleanRaw);
      throw new Error("Failed to parse AI decision.");
    }

    if (args.dryRun) {
      if (visualAnalysis) {
        merged.summary += `\n\n[Visual Analysis]: ${visualAnalysis}`;
      }
      return merged;
    }

    if (merged.type === "fuel") {
      const numeric = typeof merged.value === "number" ? merged.value : Number(merged.value);
      if (!Number.isFinite(numeric)) throw new Error("Fuel decision.value must be a number.");

      // For fuel, preferentially use the entity from the LLM (which matches Known Tanks),
      // unless args.entity was provided and matches a known tank? 
      // Actually, args.entity comes from the VEHICLE selector. We should IGNORE it for fuel 
      // unless we want to support a tank selector in the future. 
      // For now, let's rely on merged.entity (LLM) or fallback to "Tank".
      // args.entity is DANGEROUS here if the user selected a vehicle but typed about fuel.

      await ctx.runMutation(api.depot.fuel.logLevel, {
        orgId,
        tankName: merged.entity || "Tank",
        ...(numeric <= 100
          ? { currentLevelPercent: numeric }
          : { currentLevelLiters: numeric }),
      });
    }

    if (merged.type === "defect") {
      const registration = args.entity || merged.entity;

      // Force Entity Override if provided by client (Asset Selector)
      if (args.entity) {
        merged.entity = args.entity;
      }

      if (registration) {
        // Auto-create defect
        try {
          const reportDefectId = await ctx.runMutation(internal.transport.defects.reportByRegistration, {
            orgId,
            registration: registration,
            description: args.text + (visualAnalysis ? `\n\n[Visual Analysis]: ${visualAnalysis}` : ""),
            severity: merged.severity || "minor",
          });
          if (reportDefectId) {
            merged.defectId = reportDefectId;
          }
        } catch (e: unknown) {
          console.error("Auto-defect creation failed:", e);
          // Not fatal - we still return the classification so the UI shows the result
          merged.summary += " (Warning: Auto-creation failed - Vehicle not found?)";
        }
      }
    }

    return merged;
  },
});
