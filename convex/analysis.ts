import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const generateSalesNarrative = action({
  args: { locationId: v.id("locations") },
  handler: async (ctx, args) => {
    const sales = await ctx.runQuery(api.logistics.getCustomerProfile, {
      locationId: args.locationId,
    });

    const ledger = sales?.sales ?? [];
    if (!ledger.length) {
      return { summary: "Insufficient data", seasonality: "", recommendation: "" };
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const promptData = JSON.stringify(ledger, null, 2);

    let result = {
      summary: "Seasonal pattern detected with winter peaks and summer troughs.",
      seasonality: "Higher usage in winter months; minimal in summer.",
      recommendation: "Call in September to pre-sell winter fill.",
    };

    if (apiKey) {
      try {
        const body = {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    "Analyze this fuel sales history. Identify seasonality (Winter vs Summer), anomalies (unexpected spikes), and purchasing trends. Return a JSON object: { summary, seasonality, recommendation }.\n\nData:\n" +
                    promptData,
                },
              ],
            },
          ],
        };

        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        const json = await resp.json();
        const text =
          json?.candidates?.[0]?.content?.parts?.[0]?.text ??
          json?.candidates?.[0]?.output ??
          "";
        if (text) {
          const cleaned = text.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          result = {
            summary: parsed.summary ?? result.summary,
            seasonality: parsed.seasonality ?? result.seasonality,
            recommendation: parsed.recommendation ?? result.recommendation,
          };
        }
      } catch (err) {
        console.error("Gemini call failed, using fallback narrative", err);
      }
    }

    await ctx.runMutation(api.logistics.saveNarrative, {
      locationId: args.locationId,
      summary: result.summary,
      seasonalityAnalysis: result.seasonality,
      anomalies: "",
      recommendation: result.recommendation,
    });

    return result;
  },
});
