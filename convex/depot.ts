import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 1. SEEDER: Populate Depot Infrastructure
export const seedDepotData = mutation({
  args: {},
  handler: async (ctx) => {
    // Cleanup
    const tanks = await ctx.db.query("depot_tanks").collect();
    for (const t of tanks) await ctx.db.delete(t._id);
    const equip = await ctx.db.query("depot_equipment").collect();
    for (const e of equip) await ctx.db.delete(e._id);

    // A. STORAGE TANKS (Split 100k Tank)
    await ctx.db.insert("depot_tanks", {
      name: "Tank 1A - Kerosene",
      product: "UN1223",
      capacity: 50000,
      currentLevel: 42500, // 85% Full
      deadstock: 2000,
      status: "active",
      lastDip: Date.now(),
    });

    await ctx.db.insert("depot_tanks", {
      name: "Tank 1B - Gas Oil",
      product: "UN1202",
      capacity: 50000,
      currentLevel: 12000, // 24% (Low Level Warning)
      deadstock: 2000,
      status: "active",
      lastDip: Date.now(),
    });

    // B. CRITICAL EQUIPMENT
    await ctx.db.insert("depot_equipment", {
      name: "Veeder-Root TLS4",
      type: "security", // Monitoring
      serial: "VR-TLS4-001",
      serviceIntervalMonths: 12,
      lastService: new Date("2024-01-15").getTime(),
      status: "operational",
      notes: "Auto-Leak Detection Active (0.76 lph)",
    });

    await ctx.db.insert("depot_equipment", {
      name: "Dixon FT7000 Rack Monitor",
      type: "interceptor", // Safety/Overfill
      serial: "FT7000-X99",
      serviceIntervalMonths: 6,
      lastService: new Date("2024-06-01").getTime(),
      status: "operational",
      notes: "Ground verification active",
    });

    await ctx.db.insert("depot_equipment", {
      name: "Kingspan Separator",
      type: "interceptor",
      serial: "KS-SEP-02",
      serviceIntervalMonths: 6,
      lastService: new Date("2023-12-01").getTime(),
      status: "service_due", // Alert
      notes: "Full commissioning check required",
    });

    await ctx.db.insert("depot_equipment", {
      name: "Pentax Pump Set A",
      type: "pump",
      serial: "CM50-160B",
      serviceIntervalMonths: 12,
      lastService: new Date("2024-03-10").getTime(),
      status: "operational",
      notes: "Flow rate nominal (1300 L/min)",
    });

    return "DepotOS: Infrastructure Online";
  },
});

// 2. DASHBOARD QUERY
export const getDepotDashboard = query({
  args: {},
  handler: async (ctx) => {
    const tanks = await ctx.db.query("depot_tanks").collect();
    const equipment = await ctx.db.query("depot_equipment").collect();
    
    // Calculate Total Stock
    const totalStock = tanks.reduce((acc, t) => acc + t.currentLevel, 0);
    const totalCap = tanks.reduce((acc, t) => acc + t.capacity, 0);

    return {
      tanks,
      equipment,
      kpi: {
        fillLevel: Math.round((totalStock / totalCap) * 100),
        alerts: equipment.filter(e => e.status !== 'operational').length
      }
    };
  },
});
