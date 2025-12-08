import { query } from "./_generated/server";

export const getExecutiveSummary = query({
  args: {},
  handler: async (ctx) => {
    const assets = (await ctx.db.query("assets").collect()) || [];
    const cases = (await ctx.db.query("cases").collect()) || [];
    const legalEvents = (await ctx.db.query("legal_events").collect()) || [];
    const comments = (await ctx.db.query("planning_comments").collect()) || [];
    const hazards = (await ctx.db.query("site_hazards").collect()) || [];

    const groundedAssets = assets.filter((a) => a.status === "grounded");
    const criticalCases = cases.filter((c) => c.status === "critical").length;

    const sortedEvents = [...legalEvents].sort(
      (a, b) => (a.date ?? Infinity) - (b.date ?? Infinity)
    );
    const pendingLegal = sortedEvents.find((e) => e.completed === false);

    const anomalyCount = comments.filter((c) => c.anomalyDetected === true).length;

    const openCriticalHazards = hazards.filter(
      (h) => h.severity === "critical" && h.rectified === false
    ).length;

    const legalItems = legalEvents.map((e) => ({
      type: "legal" as const,
      title: e.title ?? "Legal deadline",
      date: e.date ?? Date.now(),
      severity: "critical" as const,
    }));

    const hazardItems = hazards
      .filter((h) => h.severity === "critical")
      .map((h) => ({
        type: "site" as const,
        title: (h as any).title ?? (h as any).description ?? "Critical site hazard",
        date: h.date ?? Date.now(),
        severity: "critical" as const,
      }));

    const feed = [...legalItems, ...hazardItems]
      .sort((a, b) => (b.date ?? 0) - (a.date ?? 0))
      .slice(0, 5);

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
