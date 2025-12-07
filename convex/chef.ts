import { mutation, query } from "./_generated/server";

// Seed initial kitchen and fridges
export const seedChefData = mutation({
  args: {},
  handler: async (ctx) => {
    const kitchens = await ctx.db.query("kitchens").collect();
    for (const k of kitchens) await ctx.db.delete(k._id);
    const fridges = await ctx.db.query("fridges").collect();
    for (const f of fridges) await ctx.db.delete(f._id);
    const logs = await ctx.db.query("temp_logs").collect();
    for (const l of logs) await ctx.db.delete(l._id);

    const kitchenId = await ctx.db.insert("kitchens", {
      name: "The Royal Hotel - Seafront",
      manager: "Head Chef",
      status: "open",
      hygieneRating: 5,
    });

    await ctx.db.insert("fridges", {
      kitchenId,
      name: "Walk-In Veg",
      type: "fridge",
      targetTemp: 3,
      currentTemp: 3,
      status: "safe",
      lastCheck: Date.now(),
    });

    await ctx.db.insert("fridges", {
      kitchenId,
      name: "Meat Fridge",
      type: "fridge",
      targetTemp: 3,
      currentTemp: 7,
      status: "critical",
      lastCheck: Date.now(),
    });

    await ctx.db.insert("fridges", {
      kitchenId,
      name: "Main Freezer",
      type: "freezer",
      targetTemp: -19,
      currentTemp: -19,
      status: "safe",
      lastCheck: Date.now(),
    });

    return "ChefOS seeded";
  },
});

export const getChefDashboard = query({
  args: {},
  handler: async (ctx) => {
    const kitchen = await ctx.db.query("kitchens").first();
    const fridges = kitchen
      ? await ctx.db.query("fridges").withIndex("by_kitchen", (q) => q.eq("kitchenId", kitchen._id)).collect()
      : [];
    return { kitchen, fridges };
  },
});
