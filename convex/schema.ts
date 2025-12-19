import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // --- CORE IDENTITY & TENANCY ---
  organizations: defineTable({
    name: v.string(),
    clerkOrgId: v.string(), // The link to Clerk
    slug: v.string(),
    subscriptionPlan: v.string(), // "starter", "pro", "enterprise"
    enabledModules: v.array(v.string()), // ["transport", "legal", "depot"]
  }).index("by_clerk_org_id", ["clerkOrgId"]),

  users: defineTable({
    email: v.string(),
    clerkId: v.string(),
    orgIds: v.array(v.string()), // List of Clerk Org IDs this user belongs to
    role: v.string(), // "admin", "manager", "driver"
  }).index("by_clerk_id", ["clerkId"]),

  // --- MODULE: CORE LOCATION (The Anchor) ---
  locations: defineTable({
    orgId: v.string(),
    uprn: v.string(), // The Unique Property Reference Number (Primary Key)
    address: v.string(),
    lat: v.number(),
    lng: v.number(),
    metadata: v.any(),

    googlePlaceId: v.optional(v.string()),
    googleData: v.optional(v.any()),
  })
    .index("by_uprn", ["uprn"])
    .index("by_org", ["orgId"])
    .index("by_google_place_id", ["googlePlaceId"]),

  // --- MODULE: INTELLIGENCE ROUTER (Sources) ---
  knowledgeSources: defineTable({
    orgId: v.string(),
    locationId: v.optional(v.id("locations")),
    kind: v.string(), // "url", "file", "note", etc.
    title: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    rawText: v.optional(v.string()),
    storageId: v.optional(v.string()),
    mediaType: v.optional(v.string()),
    mediaAnalysis: v.optional(v.string()),
    domain: v.optional(v.string()), // e.g. "transport_compliance", "legal", "depot_safety"
    sourceFormat: v.optional(v.string()), // "pdf", "text", "media"
    metadata: v.any(),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_domain", ["orgId", "domain"]),

  knowledgeChunks: defineTable({
    orgId: v.string(),
    sourceId: v.id("knowledgeSources"),
    text: v.string(),
    embedding: v.array(v.number()),
    domain: v.string(), // Denormalized for faster vector filtering
  }).vectorIndex("by_embedding_domain", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["orgId", "domain"],
  }),

  // --- MODULE: TRANSPORT OS ---
  vehicles: defineTable({
    orgId: v.string(),
    registration: v.string(),
    make: v.string(),
    model: v.string(),
    type: v.string(), // "HGV", "Van", "Trailer"
    isVOR: v.boolean(), // Vehicle Off Road (Grounded)
    vorReason: v.optional(v.string()),
    nextInspectionDate: v.number(), // Unix timestamp
  }).index("by_org", ["orgId"]),

  defects: defineTable({
    orgId: v.string(),
    vehicleId: v.id("vehicles"),
    reportedByUserId: v.string(),
    description: v.string(),
    severity: v.string(), // "minor", "major", "dangerous"
    status: v.string(), // "open", "rectified"
    photoStorageId: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_org_status", ["orgId", "status"]),

  // --- MODULE: DEPOT OS (Fuel & Assets) ---
  tanks: defineTable({
    orgId: v.string(),
    name: v.string(), // "Tank 1A"
    fuelType: v.string(), // "Kerosene", "Gas Oil", "Diesel"
    capacityLiters: v.number(),
    currentLevelLiters: v.number(),
    deadstockLiters: v.number(), // Unusable bottom fuel
    lastReadingTime: v.number(),
  }).index("by_org", ["orgId"]),

  // --- MODULE: LEGAL DEFENCE ---
  legalDeadlines: defineTable({
    orgId: v.string(),
    title: v.string(), // "GDPR SAR Response"
    dueDate: v.number(),
    severity: v.string(), // "critical", "standard"
    status: v.string(), // "pending", "submitted", "overdue"
    relatedCaseFileId: v.optional(v.string()),
  }).index("by_org_status", ["orgId", "status"]),

  // --- MODULE: MAINTENANCE LOOP (Golden Thread) ---
  vendors: defineTable({
    orgId: v.string(),
    name: v.string(),
    email: v.string(),
    capabilities: v.array(v.string()), // ["tyres", "engine", "glass"]
  }).index("by_org", ["orgId"]),

  jobCards: defineTable({
    orgId: v.string(),
    defectId: v.id("defects"),
    vendorId: v.id("vendors"),
    status: v.string(), // "issued", "work_in_progress", "completed", "invoiced"
    instructions: v.optional(v.string()),
    externalDispatchId: v.optional(v.string()), // The ID in n8n/Email system
    dispatchStatus: v.optional(v.string()), // "sent", "delivered", "opened"
    supplierReply: v.optional(v.string()), // Text of the mechanic's email reply
    dispatchError: v.optional(v.string()), // Last dispatch failure reason (if any)
    auditLog: v.optional(v.array(v.string())), // Append-only human-readable events
    cost: v.optional(v.number()),
    invoiceStorageId: v.optional(v.string()),
    certificateStorageId: v.optional(v.string()),
    aiVerification: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    completedByUserId: v.optional(v.string()),
    invoiceData: v.optional(v.object({
      net: v.number(),
      vat: v.number(),
      total: v.number(),
      vehicleMatch: v.boolean(),
      items: v.string(),
      summary: v.optional(v.string()), // Brief description of line items
      extractedReg: v.optional(v.string()), // The reg found on the invoice
    })),
    auditFlag: v.optional(v.string()),
  }).index("by_defect", ["defectId"]),
});
