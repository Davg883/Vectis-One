import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// 1. SEEDER: Populates the "Feb 2025" Snapshot
export const seedTransportData = mutation({
  args: {},
  handler: async (ctx) => {
    // Clean Slate
    const assets = await ctx.db.query("assets").collect();
    for (const a of assets) await ctx.db.delete(a._id);
    const ops = await ctx.db.query("operators").collect();
    for (const o of ops) await ctx.db.delete(o._id);
    const events = await ctx.db.query("maintenance_events").collect();
    for (const e of events) await ctx.db.delete(e._id);

    // --- FLEET ASSETS ---

    // TRUCK 1: OIL 6595 (The Problem Child - Grounded)
    const asset1 = await ctx.db.insert("assets", {
      reg: "OIL 6595",
      make: "MAN",
      model: "TGL 12.220",
      vin: "WMAN15ZZ6AY246106",
      type: "rigid_tanker",
      technicalSpecs: { tankCode: "LGBF", tankManufacturer: "Road Tankers Northern", pmiIntervalWeeks: 6 },
      hazchemProfile: { unNumbers: ["UN1202"], switchLoading: true, vapourRecovery: true },
      compliance: {
        motExpiry: new Date("2023-03-31").getTime(), // EXPIRED (Critical)
        adrExpiry: new Date("2025-06-01").getTime(),
        tachoExpiry: new Date("2023-01-08").getTime(), // EXPIRED
        pmiNextDue: new Date("2022-04-13").getTime(), // EXPIRED
        tankTestExpiry: new Date("2024-06-01").getTime(),
        slpExpiry: new Date("2023-12-31").getTime(),
      },
      status: "grounded",
    });

    // TRUCK 2: YJ65 PNM (Working, but PMI Due Soon)
    await ctx.db.insert("assets", {
      reg: "YJ65 PNM",
      make: "DAF",
      model: "LF 260",
      vin: "XLRAE4500L29384",
      type: "rigid_tanker",
      technicalSpecs: { tankCode: "LGBF", tankManufacturer: "Magyar", pmiIntervalWeeks: 6 },
      hazchemProfile: { unNumbers: ["UN1202", "UN1203"], switchLoading: false, vapourRecovery: true },
      compliance: {
        motExpiry: new Date("2025-09-30").getTime(), 
        adrExpiry: new Date("2025-08-15").getTime(),
        tachoExpiry: new Date("2026-01-20").getTime(),
        pmiNextDue: new Date("2025-02-20").getTime(), // DUE SOON
      },
      status: "operational",
    });

    // TRUCK 3: CN18 HHL (Support Van)
    await ctx.db.insert("assets", {
      reg: "CN18 HHL",
      make: "CITROEN",
      model: "Relay",
      vin: "VF7Y492288192",
      type: "van",
      technicalSpecs: { tankCode: "N/A", tankManufacturer: "N/A", pmiIntervalWeeks: 12 },
      hazchemProfile: { unNumbers: [], switchLoading: false, vapourRecovery: false },
      compliance: {
        motExpiry: new Date("2025-11-20").getTime(), 
        adrExpiry: new Date("2099-01-01").getTime(),
        tachoExpiry: new Date("2099-01-01").getTime(),
        pmiNextDue: new Date("2025-04-01").getTime(),
      },
      status: "operational",
    });

    // --- OPERATORS ---

    // DRIVER 1: Brendan Rudge (Suspended)
    await ctx.db.insert("operators", {
      name: "Brendan Rudge",
      dob: "1974-02-23",
      licence: { number: "RUDGE702234BA9LR", expiry: new Date("2024-02-19").getTime(), categories: ["C", "CE"], checkFrequency: 3, lastChecked: new Date("2022-05-12").getTime() },
      adr: { exists: true, expiry: new Date("2027-02-16").getTime(), classes: ["3"], modes: ["Tanks"] },
      cpcExpiry: new Date("2024-09-09").getTime(), // EXPIRED
      tachoCardExpiry: new Date("2022-11-19").getTime(), // EXPIRED
      mandateSigned: true, handbookSigned: true, status: "suspended",
    });

    // DRIVER 2: David Grannum (Active)
    await ctx.db.insert("operators", {
      name: "David Grannum",
      dob: "1980-06-15",
      licence: { number: "GRANN806154BW1MS", expiry: new Date("2030-06-14").getTime(), categories: ["C", "CE"], checkFrequency: 3, lastChecked: new Date("2024-12-01").getTime() },
      adr: { exists: true, expiry: new Date("2026-05-20").getTime(), classes: ["3"], modes: ["Tanks"] },
      cpcExpiry: new Date("2026-09-09").getTime(),
      tachoCardExpiry: new Date("2026-01-15").getTime(),
      mandateSigned: true, handbookSigned: true, status: "active",
    });

    // --- HISTORY ---
    await ctx.db.insert("maintenance_events", {
        assetId: asset1, date: new Date("2022-03-15").getTime(), type: "MOT", odometer: 256801, provider: "DVSA / Stag Lane", result: "pass", notes: "Historical Record"
    });

    return "TransportOS Seeded.";
  },
});

// 2. DASHBOARD QUERY
export const getDashboardData = query({
  args: {},
  handler: async (ctx) => {
    const assets = await ctx.db.query("assets").collect();
    const operators = await ctx.db.query("operators").collect();
    
    const groundedAssets = assets.filter(a => a.status === "grounded").length;
    const suspendedDrivers = operators.filter(o => o.status === "suspended").length;

    return {
      assets,
      operators,
      kpi: {
        groundedAssets,
        suspendedDrivers,
        totalFleet: assets.length,
        totalDrivers: operators.length
      }
    };
  },
});

// 3. DRILL DOWN QUERY
export const getAssetDetails = query({
    args: { id: v.id("assets") },
    handler: async (ctx, args) => {
        const asset = await ctx.db.get(args.id);
        const history = await ctx.db
            .query("maintenance_events")
            .filter((q) => q.eq(q.field("assetId"), args.id))
            .collect();
        return { asset, history };
    }
});

// 4. UPDATE LOGIC (AI & Manual)
export const updateAssetCompliance = internalMutation({
  args: { reg: v.string(), type: v.string(), date: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    // Simple matching logic for demo
    const assets = await ctx.db.query("assets").collect();
    // Fuzzy match reg (remove spaces)
    const asset = assets.find(a => a.reg.replace(/\s/g, "") === args.reg.replace(/\s/g, ""));
    
    if (asset && args.type === "MOT") {
        await ctx.db.patch(asset._id, {
            compliance: { ...asset.compliance, motExpiry: new Date(args.date).getTime() },
            status: "operational"
        });
    }
  }
});
