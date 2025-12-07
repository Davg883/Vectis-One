import { query } from "./_generated/server";

export const getExecutiveSummary = query({
  args: {},
  handler: async (ctx) => {
    // 1. TRANSPORT STATUS
    const assets = await ctx.db.query("assets").collect();
    const groundedAssets = assets.filter((a) => a.status === "grounded");
    
    // 2. AEGIS STATUS (Legal)
    const cases = await ctx.db.query("cases").collect();
    const criticalCases = cases.filter((c) => c.status === "critical").length;
    
    const legalEvents = await ctx.db.query("legal_events").collect();
    const pendingLegal = legalEvents
        .filter((e) => e.completed === false)
        .sort((a, b) => (a.date ?? Infinity) - (b.date ?? Infinity))[0];

    // 3. CIVIC STATUS (Planning)
    const comments = await ctx.db.query("planning_comments").collect();
    // Use optional chaining or explicit check
    const anomalyCount = comments.filter((c) => c.anomalyDetected === true).length;

    // 4. SITE STATUS (Safety)
    const hazards = await ctx.db.query("site_hazards").collect();
    const openCriticalHazards = hazards.filter(
        (h) => h.severity === "critical" && h.rectified === false
    ).length;

    // 5. GLOBAL FEED (Unified Timeline)
    // Cast to 'any' to normalize different table shapes for the feed
    const feed = [
        ...legalEvents.map(e => ({
            type: "legal" as const,
            title: e.title ?? "Legal deadline",
            date: e.date ?? Date.now(),
            severity: "critical" as const
        })),
        ...hazards.filter(h => h.severity === 'critical').map(h => ({
            type: "site" as const,
            title: h.title ?? "Critical site hazard",
            date: h.date ?? Date.now(), // Hazards default to now
            severity: "critical" as const
        }))
    ].sort((a, b) => (b.date ?? 0) - (a.date ?? 0)).slice(0, 5);

    return {
      transport: {
        groundedCount: groundedAssets.length,
        criticalVehicle: groundedAssets[0]?.reg || null,
      },
      aegis: {
        criticalCases,
        nextDeadline: pendingLegal?.date || null,
      },
      civic: {
        anomalyCount,
      },
      site: {
        openCriticalHazards,
      },
      feed,
    };
  },
});
