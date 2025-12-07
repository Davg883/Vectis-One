import { mutation, query } from "./_generated/server";

export const seedAegisData = mutation({
  args: {},
  handler: async (ctx) => {
    // clear
    const cases = await ctx.db.query("cases").collect();
    for (const c of cases) await ctx.db.delete(c._id);
    const legalEvents = await ctx.db.query("legal_events").collect();
    for (const e of legalEvents) await ctx.db.delete(e._id);

    // seed case
    await ctx.db.insert("cases", {
      title: "Phillips 66 Dispute",
      status: "critical",
      counterparty: "Phillips 66",
      risk: "Critical",
      strategy: "Freeze & Squeeze (GDPR Lever)",
      financialExposure: 150000,
      probabilityOfSuccess: 75,
      nextActionDate: 1739577600000,
      description:
        "Dispute arising from sudden credit withdrawal. Asserting Abuse of Dominance under Competition Act 1998.",
    });

    const now = Date.now();
    await ctx.db.insert("legal_events", {
      title: "Standstill Agreement",
      date: now + 7 * 24 * 60 * 60 * 1000,
      deadline: now + 7 * 24 * 60 * 60 * 1000,
      completed: false,
      type: "Agreement",
    });
    await ctx.db.insert("legal_events", {
      title: "Disclosure Pack",
      date: now + 14 * 24 * 60 * 60 * 1000,
      deadline: now + 14 * 24 * 60 * 60 * 1000,
      completed: false,
      type: "Disclosure",
    });
    await ctx.db.insert("legal_events", {
      title: "GDPR SAR Response Deadline",
      date: 1740009600000,
      deadline: 1740009600000,
      completed: false,
      type: "disclosure",
    });

    // seed evidence
    await ctx.db.insert("evidence", {
      title: "P66 Case Overview.pdf",
      sender: "Legal Team",
      sentiment: "neutral",
      date: now,
      url: "#",
      summary: "Executive summary of dispute, chronology, and requested remedies.",
    });
    await ctx.db.insert("evidence", {
      title: "Letter Before Action",
      sender: "Phillips 66 Counsel",
      sentiment: "hostile",
      date: now - 2 * 24 * 60 * 60 * 1000,
      url: "#",
      summary: "Formal notice disputing claims; requests withdrawal of allegations.",
    });
    await ctx.db.insert("evidence", {
      title: "GDPR SAR",
      sender: "Vectis Legal",
      sentiment: "neutral",
      date: 1739577600000,
      url: "#",
      summary: "Subject Access Request seeking internal P66 correspondence regarding credit withdrawal.",
    });

    return "AegisOS seeded";
  },
});

export const getAegisDashboard = query({
  args: {},
  handler: async (ctx) => {
    const cases = await ctx.db.query("cases").collect();
    const deadlines = await ctx.db.query("legal_events").collect();
    return { cases, deadlines };
  },
});

export const getAllCases = query({
  args: {},
  handler: async (ctx) => {
    const records = await ctx.db.query("cases").collect();
    return records.sort((a, b) => {
      const aDate = a.nextActionDate ?? Infinity;
      const bDate = b.nextActionDate ?? Infinity;
      return aDate - bDate;
    });
  },
});

export const getAllEvidence = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("evidence").collect();
  },
});
