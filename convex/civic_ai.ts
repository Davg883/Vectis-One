import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

type Analysis = {
  sourceType?: string;
  sentiment?: string;
  strategicImpact?: string;
  recommendedAction?: string;
};

const SYSTEM_PROMPT = `
You are a Strategic Planning Consultant. Analyze this input regarding a controversial infrastructure project.
Determine:
- Source Type: 'Public Comment', 'Official Letter', 'Political Correspondence (MP/Council)', 'Legal Threat'.
- Sentiment: 'Hostile', 'Neutral', 'Supportive'.
- Strategic Impact: 'Low', 'Medium', 'High'.
- Recommended Action: One sentence advice (e.g. 'Draft formal response', 'Ignore', 'Flag for Legal').
Return JSON.`;

export const analyzeCivicInput = action({
  args: {
    text: v.string(),
    appId: v.id("planning_applications"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ id: Id<"planning_intelligence">; analysis: Analysis; raw: string }> => {
    const apiKey = process.env.GEMINI_API_KEY;
    let raw = "";
    let parsed: Analysis = {
      sourceType: "Public Comment",
      sentiment: "Neutral",
      strategicImpact: "Low",
      recommendedAction: "Log and monitor.",
    };

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "models/gemini-3-pro-preview" });
        const result = await model.generateContent([
          SYSTEM_PROMPT.trim(),
          `Input:\n${args.text}`,
        ]);
        raw = result.response.text();
        parsed = safeParse(raw, parsed);
      } catch (err) {
        raw = `AI error: ${String(err)}`;
      }
    } else {
      raw = "GEMINI_API_KEY missing; used default analysis.";
    }

    const id: Id<"planning_intelligence"> = await ctx.runMutation(
      internal.civic_ai.recordPlanningIntelligence,
      {
        applicationId: args.appId,
        text: args.text,
        sourceType: parsed.sourceType,
        sentiment: parsed.sentiment,
        strategicImpact: parsed.strategicImpact,
        recommendedAction: parsed.recommendedAction,
        raw,
      }
    );

    return { id, analysis: parsed, raw };
  },
});

function safeParse(raw: string, fallback: Analysis): Analysis {
  try {
    const obj = JSON.parse(raw);
    return {
      sourceType: obj.sourceType ?? fallback.sourceType,
      sentiment: obj.sentiment ?? fallback.sentiment,
      strategicImpact: obj.strategicImpact ?? fallback.strategicImpact,
      recommendedAction: obj.recommendedAction ?? fallback.recommendedAction,
    };
  } catch {
    return fallback;
  }
}

export const recordPlanningIntelligence = internalMutation({
  args: {
    applicationId: v.id("planning_applications"),
    text: v.string(),
    sourceType: v.optional(v.string()),
    sentiment: v.optional(v.string()),
    strategicImpact: v.optional(v.string()),
    recommendedAction: v.optional(v.string()),
    raw: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("planning_intelligence", {
      applicationId: args.applicationId,
      text: args.text,
      sourceType: args.sourceType,
      sentiment: args.sentiment,
      strategicImpact: args.strategicImpact,
      recommendedAction: args.recommendedAction,
      raw: args.raw,
      createdAt: Date.now(),
    });
  },
});
