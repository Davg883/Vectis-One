import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const seedPlanningData = mutation({
  args: {},
  handler: async (ctx) => {
    const apps = await ctx.db.query("planning_applications").collect();
    for (const a of apps) await ctx.db.delete(a._id);
    const docs = await ctx.db.query("planning_documents").collect();
    for (const d of docs) await ctx.db.delete(d._id);
    const comments = await ctx.db.query("planning_comments").collect();
    for (const c of comments) await ctx.db.delete(c._id);

    const appId = await ctx.db.insert("planning_applications", {
      title: "Medina Wharf Redevelopment",
      address: "West Medina Mills, Isle of Wight",
      ref: "IW/24/PLN/042",
      status: "active",
    });

    await ctx.db.insert("planning_documents", {
      applicationId: appId,
      title: "Design & Access Statement.pdf",
      url: "#",
    });
    await ctx.db.insert("planning_documents", {
      applicationId: appId,
      title: "Environmental Impact Assessment.pdf",
      url: "#",
    });
    await ctx.db.insert("planning_documents", {
      applicationId: appId,
      title: "Transport Assessment.pdf",
      url: "#",
    });

    await ctx.db.insert("planning_comments", {
      applicationId: appId,
      author: "Resident A",
      text: "Concern about traffic and noise.",
      stance: "objection",
      anomalyDetected: true,
    });
    await ctx.db.insert("planning_comments", {
      applicationId: appId,
      author: "Resident B",
      text: "Support improved waterfront access.",
      stance: "support",
      anomalyDetected: false,
    });
    await ctx.db.insert("planning_comments", {
      applicationId: appId,
      author: "Resident C",
      text: "Request for better ecological mitigation.",
      stance: "neutral",
      anomalyDetected: true,
    });

    return "CivicOS seeded";
  },
});

export const submitComment = mutation({
  args: {
    appId: v.id("planning_applications"),
    text: v.string(),
    type: v.string(),
    author: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sentiment =
      args.type.toLowerCase() === "objection"
        ? "Negative"
        : args.type.toLowerCase() === "support"
        ? "Positive"
        : "Neutral";

    const id = await ctx.db.insert("planning_comments", {
      applicationId: args.appId,
      author: args.author ?? "Anonymous",
      text: args.text,
      stance: args.type,
      anomalyDetected: false,
      sentiment,
    });
    return id;
  },
});

export const getPlanningDashboard = query({
  args: {},
  handler: async (ctx) => {
    const application = await ctx.db.query("planning_applications").first();
    const documents = application
      ? await ctx.db
          .query("planning_documents")
          .withIndex("by_application", (q) => q.eq("applicationId", application._id))
          .collect()
      : [];
    const comments = application
      ? await ctx.db
          .query("planning_comments")
          .filter((q) => q.eq(q.field("applicationId"), application._id))
          .collect()
      : [];

    const botAnomalies = comments.filter((c) => c.anomalyDetected).length;
    const sentimentScore = 35;

    return {
      application,
      documents,
      comments,
      botAnomalies,
      sentimentScore,
    };
  },
});
