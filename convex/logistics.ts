import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";

// 1. SEEDER
export const seedLogisticsData = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear old data
    const locs = await ctx.db.query("locations").collect();
    for (const l of locs) await ctx.db.delete(l._id);
    const sales = await ctx.db.query("sales_ledger").collect();
    for (const s of sales) await ctx.db.delete(s._id);
    const narratives = await ctx.db.query("sales_narratives").collect();
    for (const n of narratives) await ctx.db.delete(n._id);

    // Create Mrs Higgins
    const locationId = await ctx.db.insert("locations", {
      uprn: "100060485210",
      address: "42 High St, Ventnor, PO38 1LZ",
      postcode: "PO38 1LZ",
      coordinates: { lat: 50.593, lng: -1.203 },
      customerName: "Mrs. Higgins",
      type: "domestic",
      accessNotes: "Narrow lane, baby tanker required",
      status: "verified",
    });

    // Seed History (Winter Heavy)
    const today = Date.now();
    await ctx.db.insert("sales_ledger", { locationId, date: today - 2592000000 * 1, product: "Kerosene", litres: 500, pricePerLitre: 0.65, totalValue: 325 }); // 1 month ago
    await ctx.db.insert("sales_ledger", { locationId, date: today - 2592000000 * 2, product: "Kerosene", litres: 900, pricePerLitre: 0.62, totalValue: 558 }); // 2 months ago
    await ctx.db.insert("sales_ledger", { locationId, date: today - 2592000000 * 6, product: "Kerosene", litres: 0, pricePerLitre: 0, totalValue: 0 }); // Summer (0)
    await ctx.db.insert("sales_ledger", { locationId, date: today - 2592000000 * 10, product: "Kerosene", litres: 1200, pricePerLitre: 0.70, totalValue: 840 }); // Last Winter (Panic buy)

    return "LogisticsOS: Data Seeded";
  },
});

// 2. SMART QUERY (Fixes the Error)
export const getCustomerProfile = query({
  args: { locationId: v.optional(v.id("locations")) }, // <--- NOW OPTIONAL
  handler: async (ctx, args) => {
    let location;
    
    if (args.locationId) {
      location = await ctx.db.get(args.locationId);
    } else {
      // If no ID provided, fetch the first one (Default View)
      location = await ctx.db.query("locations").first();
    }

    if (!location) return null;

    const sales = await ctx.db
      .query("sales_ledger")
      .withIndex("by_location", (q) => q.eq("locationId", location._id))
      .order("desc")
      .collect();

    const narrative = await ctx.db
      .query("sales_narratives")
      .withIndex("by_location", (q) => q.eq("locationId", location._id))
      .order("desc")
      .first();

    return {
      location,
      sales,
      narrative
    };
  },
});

// 3. MOCK ADDRESS VERIFICATION
export const verifyAddress = action({
  args: { address: v.string() },
  handler: async () => {
    // Mock OS API Response
    return {
      uprn: "100060" + Math.floor(Math.random() * 100000),
      lat: 50.5 + Math.random() * 0.1,
      lng: -1.2 + Math.random() * 0.1,
      match: "Strong"
    };
  }
});

// 4. Lookup by UPRN
export const getLocationByUprn = query({
  args: { uprn: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("locations")
      .withIndex("by_uprn", (q) => q.eq("uprn", args.uprn))
      .first();
  },
});

// 4. SAVE NARRATIVE (used by analysis)
export const saveNarrative = mutation({
  args: {
    locationId: v.id("locations"),
    summary: v.string(),
    seasonalityAnalysis: v.string(),
    anomalies: v.string(),
    recommendation: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("sales_narratives", {
      locationId: args.locationId,
      generatedAt: Date.now(),
      summary: args.summary,
      seasonalityAnalysis: args.seasonalityAnalysis,
      anomalies: args.anomalies,
      recommendation: args.recommendation,
    });
  },
});
