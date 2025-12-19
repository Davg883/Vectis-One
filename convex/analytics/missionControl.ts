import { query } from "../_generated/server";
import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { requireAnyModule } from "../lib/org";
import { getClerkUserId, getOptionalClerkOrgId, requireIdentity } from "../lib/auth";

type FeedItem = {
  type: "transportInspection" | "legalDeadline";
  title: string;
  dueDate: number;
  severity: "critical" | "standard";
  status: "pending" | "submitted" | "overdue";
};

export const getMissionControl = query({
  args: {},
  handler: async (ctx) => {
    const { org, orgId } = await requireAnyModule(ctx, ["transport", "depot", "legal"]);
    return await buildMissionControl(ctx, org, orgId);
  },
});

export const getMissionControlData = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const activeOrgId = getOptionalClerkOrgId(identity);

    const clerkId = getClerkUserId(identity);
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    const isMember = (activeOrgId != null && activeOrgId === args.orgId) || Boolean(user?.orgIds?.includes(args.orgId));
    if (!isMember) throw new ConvexError("Organization access denied.");

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) => q.eq("clerkOrgId", args.orgId))
      .first();

    if (!org) return null;

    return await buildMissionControl(ctx, org, args.orgId);
  },
});

async function buildMissionControl(
  ctx: QueryCtx,
  org: Doc<"organizations">,
  orgId: string
) {
    const now = Date.now();

    const enabled = new Set(org.enabledModules);

    const [vehicles, tanks, deadlines] = await Promise.all([
      enabled.has("transport")
        ? ctx.db.query("vehicles").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect()
        : Promise.resolve([]),
      enabled.has("depot")
        ? ctx.db.query("tanks").withIndex("by_org", (q) => q.eq("orgId", orgId)).collect()
        : Promise.resolve([]),
      enabled.has("legal")
        ? Promise.all([
            ctx.db
              .query("legalDeadlines")
              .withIndex("by_org_status", (q) => q.eq("orgId", orgId).eq("status", "pending"))
              .collect(),
            ctx.db
              .query("legalDeadlines")
              .withIndex("by_org_status", (q) => q.eq("orgId", orgId).eq("status", "overdue"))
              .collect(),
          ]).then(([pending, overdue]) => [...overdue, ...pending])
        : Promise.resolve([]),
    ]);

    const transportInspections: FeedItem[] = vehicles.map((v) => {
      const overdue = v.nextInspectionDate < now;
      return {
        type: "transportInspection",
        title: `Inspection due: ${v.registration}`,
        dueDate: v.nextInspectionDate,
        severity: overdue ? "critical" : "standard",
        status: overdue ? "overdue" : "pending",
      };
    });

    const legalItems: FeedItem[] = deadlines.map((d) => {
      const overdue = d.dueDate < now && d.status !== "submitted";
      return {
        type: "legalDeadline",
        title: d.title,
        dueDate: d.dueDate,
        severity: (d.severity === "critical" ? "critical" : "standard") as FeedItem["severity"],
        status: overdue ? "overdue" : (d.status as FeedItem["status"]),
      };
    });

    const feed = [...legalItems, ...transportInspections]
      .sort((a, b) => {
        const aOverdue = a.status === "overdue";
        const bOverdue = b.status === "overdue";
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        const aCritical = a.severity === "critical";
        const bCritical = b.severity === "critical";
        if (aCritical !== bCritical) return aCritical ? -1 : 1;
        return a.dueDate - b.dueDate;
      })
      .slice(0, 12);

    const groundedVehicles = vehicles.filter((v) => v.isVOR).length;
    const overdueLegalDeadlines = deadlines.filter((d) => d.status === "overdue" || d.dueDate < now).length;

    const safetyScore = Math.max(
      0,
      Math.min(100, 100 - 10 * groundedVehicles - 5 * overdueLegalDeadlines)
    );

    const depotFillPct =
      tanks.length === 0
        ? null
        : Math.round(
            (tanks.reduce((acc, t) => acc + t.currentLevelLiters, 0) /
              tanks.reduce((acc, t) => acc + t.capacityLiters, 0)) *
              100
          );

    return {
      organization: { name: org.name, enabledModules: org.enabledModules },
      kpi: {
        safetyScore,
        groundedVehicles,
        overdueLegalDeadlines,
        depotFillPct,
      },
      vehicles,
      tanks,
      legalDeadlines: deadlines,
      feed,
    };
}
