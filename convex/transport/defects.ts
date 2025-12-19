import { internalMutation, mutation, query } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { getClerkUserId } from "../lib/auth";
import { requireModule } from "../lib/org";

type Severity = "minor" | "major" | "dangerous";

type ReportArgs = {
  vehicleId: Id<"vehicles">;
  description: string;
  severity: Severity;
  photoStorageId?: string;
};

type ReportByRegistrationArgs = {
  orgId: string;
  registration: string;
  description: string;
  severity: Severity;
  manualSeverity?: Severity;
  mitigationNotes?: string;
};

async function reportCore(ctx: MutationCtx, args: ReportArgs) {
  const { identity, orgId } = await requireModule(ctx, "transport");
  const vehicle = await ctx.db.get(args.vehicleId);
  if (!vehicle || vehicle.orgId !== orgId) throw new ConvexError("Vehicle not found");

  const now = Date.now();
  const defectId = await ctx.db.insert("defects", {
    orgId,
    vehicleId: args.vehicleId,
    reportedByUserId: getClerkUserId(identity),
    description: args.description,
    severity: args.severity,
    status: "open",
    photoStorageId: args.photoStorageId,
    timestamp: now,
  });

  if (args.severity !== "minor") {
    await ctx.db.patch(args.vehicleId, { isVOR: true, vorReason: "Defect reported" });
  }

  return defectId;
}

async function reportByRegistrationCore(ctx: MutationCtx, args: ReportByRegistrationArgs) {
  const { identity, orgId } = await requireModule(ctx, "transport");
  if (orgId !== args.orgId) throw new ConvexError("Organization mismatch");
  const reg = args.registration.trim();
  if (!reg) throw new ConvexError("Missing vehicle registration");

  const vehicles = await ctx.db
    .query("vehicles")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .collect();

  const normalized = reg.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const vehicle = vehicles.find((v) => v.registration.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() === normalized);
  if (!vehicle) {
    // Attempt fuzzy match for "Tank" confusion
    // const tankMatch = vehicles.find((v) => v.make.toUpperCase().includes("TANK") || v.model.toUpperCase().includes("TANK"));
    // If no vehicle found, strictly throw, but with better message?
    // Actually, let's keep it simple: just stricter normalization.
    throw new ConvexError(`Vehicle not found: ${reg} (Normalized: ${normalized})`);
  }

  const now = Date.now();
  const finalSeverity = args.manualSeverity || args.severity;
  const finalDescription = args.mitigationNotes
    ? `${args.description}\n\n[USER MITIGATION]: ${args.mitigationNotes}`
    : args.description;

  const defectId = await ctx.db.insert("defects", {
    orgId,
    vehicleId: vehicle._id,
    reportedByUserId: getClerkUserId(identity),
    description: finalDescription,
    severity: finalSeverity,
    status: "open",
    timestamp: now,
  });

  if (finalSeverity !== "minor") {
    await ctx.db.patch(vehicle._id, { isVOR: true, vorReason: "Defect reported" });
  }

  return defectId;
}

export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireModule(ctx, "transport");
    const [open, inProgress] = await Promise.all([
      ctx.db
        .query("defects")
        .withIndex("by_org_status", (q) => q.eq("orgId", orgId).eq("status", "open"))
        .collect(),
      ctx.db
        .query("defects")
        .withIndex("by_org_status", (q) => q.eq("orgId", orgId).eq("status", "in_progress"))
        .collect(),
    ]);
    return [...open, ...inProgress];
  },
});

export const getOpenDefects = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireModule(ctx, "transport");
    const [open, inProgress] = await Promise.all([
      ctx.db
        .query("defects")
        .withIndex("by_org_status", (q) => q.eq("orgId", orgId).eq("status", "open"))
        .collect(),
      ctx.db
        .query("defects")
        .withIndex("by_org_status", (q) => q.eq("orgId", orgId).eq("status", "in_progress"))
        .collect(),
    ]);
    const allDefects = [...open, ...inProgress];

    // Hydrate with image URLs
    return await Promise.all(
      allDefects.map(async (d) => {
        let imageUrl: string | null = null;
        if (d.photoStorageId) {
          imageUrl = await ctx.storage.getUrl(d.photoStorageId);
        }
        return { ...d, imageUrl };
      })
    );
  },
});

export const seedDefect = mutation({
  args: {},
  handler: async (ctx) => {
    const { identity, orgId } = await requireModule(ctx, "transport");

    let vehicle = await ctx.db.query("vehicles").withIndex("by_org", (q) => q.eq("orgId", orgId)).first();
    if (!vehicle) {
      const vehicleId = await ctx.db.insert("vehicles", {
        orgId,
        registration: "AEGIS 001",
        make: "DAF",
        model: "CF",
        type: "HGV",
        isVOR: false,
        vorReason: undefined,
        nextInspectionDate: Date.now() + 14 * 24 * 60 * 60 * 1000,
      });
      vehicle = await ctx.db.get(vehicleId);
    }
    if (!vehicle) throw new ConvexError("Vehicle not found");

    const now = Date.now();
    const defectId = await ctx.db.insert("defects", {
      orgId,
      vehicleId: vehicle._id,
      reportedByUserId: getClerkUserId(identity),
      description: "Broken mirror (seed)",
      severity: "major",
      status: "open",
      photoStorageId: undefined,
      timestamp: now,
    });

    await ctx.db.patch(vehicle._id, { isVOR: true, vorReason: "Defect reported" });
    return await ctx.db.get(defectId);
  },
});

export const report = internalMutation({
  args: {
    vehicleId: v.id("vehicles"),
    description: v.string(),
    severity: v.union(v.literal("minor"), v.literal("major"), v.literal("dangerous")),
    photoStorageId: v.optional(v.string()),
  },
  handler: reportCore,
});

export const reportPublic = mutation({
  args: {
    vehicleId: v.id("vehicles"),
    description: v.string(),
    severity: v.union(v.literal("minor"), v.literal("major"), v.literal("dangerous")),
    photoStorageId: v.optional(v.string()),
  },
  handler: reportCore,
});

export const reportByRegistration = internalMutation({
  args: {
    orgId: v.string(),
    registration: v.string(),
    description: v.string(),
    severity: v.union(v.literal("minor"), v.literal("major"), v.literal("dangerous")),
    manualSeverity: v.optional(v.union(v.literal("minor"), v.literal("major"), v.literal("dangerous"))),
    mitigationNotes: v.optional(v.string()),
  },
  handler: reportByRegistrationCore,
});

export const reportByRegistrationPublic = mutation({
  args: {
    orgId: v.string(),
    registration: v.string(),
    description: v.string(),
    severity: v.union(v.literal("minor"), v.literal("major"), v.literal("dangerous")),
    manualSeverity: v.optional(v.union(v.literal("minor"), v.literal("major"), v.literal("dangerous"))),
    mitigationNotes: v.optional(v.string()),
  },
  handler: reportByRegistrationCore,
});

export const markRectified = mutation({
  args: { defectId: v.id("defects") },
  handler: async (ctx, { defectId }) => {
    const { orgId } = await requireModule(ctx, "transport");
    const defect = await ctx.db.get(defectId);
    if (!defect || defect.orgId !== orgId) return;
    await ctx.db.patch(defectId, { status: "rectified" });
  },
});
