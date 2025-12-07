import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  assets: defineTable({
    reg: v.string(),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    vin: v.optional(v.string()),
    type: v.optional(v.string()),
    technicalSpecs: v.optional(
      v.object({
        tankCode: v.optional(v.string()),
        tankManufacturer: v.optional(v.string()),
        pmiIntervalWeeks: v.optional(v.number()),
      })
    ),
    hazchemProfile: v.optional(
      v.object({
        unNumbers: v.optional(v.array(v.string())),
        switchLoading: v.optional(v.boolean()),
        vapourRecovery: v.optional(v.boolean()),
      })
    ),
    compliance: v.object({
      motExpiry: v.number(),
      pmiNextDue: v.number(),
      adrExpiry: v.number(), // Annual Hazchem test
      tachoExpiry: v.optional(v.number()), // 2-Year Calibration
      tachographCalibrationExpiry: v.optional(v.number()), // legacy field support
      tankTestExpiry: v.optional(v.number()), // 3 or 6 Year Hydraulic/Leakproof test
      slpExpiry: v.optional(v.number()), // Safe Loading Pass (Terminal Access)
      vedExpiry: v.optional(v.number()), // Tax
    }),
    status: v.union(v.literal("operational"), v.literal("grounded")),
  }),

  operators: defineTable({
    name: v.string(),
    dob: v.optional(v.string()),
    licence: v.optional(
      v.object({
        number: v.optional(v.string()),
        expiry: v.optional(v.number()),
        categories: v.optional(v.array(v.string())),
        checkFrequency: v.optional(v.number()),
        lastChecked: v.optional(v.number()),
      })
    ),
    adr: v.optional(
      v.object({
        exists: v.optional(v.boolean()),
        expiry: v.optional(v.number()),
        classes: v.optional(v.array(v.string())),
        modes: v.optional(v.array(v.string())),
      })
    ),
    cpcExpiry: v.optional(v.number()),
    tachoCardExpiry: v.optional(v.number()),
    mandateSigned: v.optional(v.boolean()),
    handbookSigned: v.optional(v.boolean()),
    status: v.union(v.literal("active"), v.literal("suspended")),
  }),

  maintenance_events: defineTable({
    assetId: v.id("assets"),
    date: v.number(),
    type: v.string(),
    odometer: v.optional(v.number()),
    provider: v.optional(v.string()),
    result: v.optional(v.string()),
    notes: v.optional(v.string()),
  }),

  // Minimal tables to support executive summary aggregates
  cases: defineTable({
    title: v.optional(v.string()),
    status: v.optional(v.string()), // e.g., "critical"
    counterparty: v.optional(v.string()),
    risk: v.optional(v.string()),
    strategy: v.optional(v.string()),
    financialExposure: v.optional(v.number()),
    probabilityOfSuccess: v.optional(v.number()),
    nextActionDate: v.optional(v.number()),
    description: v.optional(v.string()),
  }),

  legal_events: defineTable({
    title: v.optional(v.string()),
    date: v.optional(v.number()),
    deadline: v.optional(v.number()),
    completed: v.optional(v.boolean()),
    type: v.optional(v.string()),
  }),

  evidence: defineTable({
    title: v.optional(v.string()),
    sender: v.optional(v.string()),
    sentiment: v.optional(v.string()), // hostile | neutral
    date: v.optional(v.number()),
    url: v.optional(v.string()),
    summary: v.optional(v.string()),
  }),

  planning_comments: defineTable({
    anomalyDetected: v.optional(v.boolean()),
    author: v.optional(v.string()),
    text: v.optional(v.string()),
    stance: v.optional(v.string()),
    sentiment: v.optional(v.string()),
    applicationId: v.optional(v.id("planning_applications")),
  }),

  site_hazards: defineTable({
    title: v.optional(v.string()),
    date: v.optional(v.number()),
    severity: v.optional(v.string()),
    rectified: v.optional(v.boolean()),
  }),

  // --- DEPOT OS MODULE ---

  // 1. STORAGE TANKS
  depot_tanks: defineTable({
    name: v.string(), // "Tank 1 - Kerosene"
    product: v.union(v.literal("UN1223"), v.literal("UN1202"), v.literal("UN1203")), // Kero, Diesel, Petrol
    capacity: v.number(), // 50000
    currentLevel: v.number(), // e.g. 42000
    deadstock: v.number(), // Unpumpable volume
    status: v.union(v.literal("active"), v.literal("maintenance"), v.literal("cleaning")),
    lastDip: v.number(), // Unix TS
  }),

  // 2. FIXED EQUIPMENT (Pumps, Generators)
  depot_equipment: defineTable({
    name: v.string(), // "Loading Pump A"
    type: v.union(v.literal("pump"), v.literal("generator"), v.literal("interceptor"), v.literal("security")),
    serial: v.string(),
    serviceIntervalMonths: v.number(),
    lastService: v.number(),
    status: v.union(v.literal("operational"), v.literal("defect"), v.literal("service_due")),
    notes: v.optional(v.string()),
  }),

  // 3. WET STOCK LEDGER (Movements)
  depot_movements: defineTable({
    tankId: v.id("depot_tanks"),
    type: v.union(v.literal("inbound"), v.literal("outbound"), v.literal("adjustment")),
    litres: v.number(),
    reference: v.string(), // "Bill of Lading 123" or "Vehicle Load"
    date: v.number(),
  }).index("by_tank", ["tankId"]),

  // CivicOS planning data
  planning_applications: defineTable({
    title: v.string(),
    address: v.string(),
    ref: v.string(),
    status: v.optional(v.string()),
  }),

  planning_documents: defineTable({
    applicationId: v.id("planning_applications"),
    title: v.string(),
    url: v.optional(v.string()),
  }).index("by_application", ["applicationId"]),

  planning_intelligence: defineTable({
    applicationId: v.id("planning_applications"),
    text: v.string(),
    sourceType: v.optional(v.string()),
    sentiment: v.optional(v.string()),
    strategicImpact: v.optional(v.string()),
    recommendedAction: v.optional(v.string()),
    createdAt: v.number(),
    raw: v.optional(v.string()),
  }).index("by_application", ["applicationId"]),

  // --- LOGISTICS OS (Location & Sales) ---

  // 1. LOCATIONS (The Golden Record)
  locations: defineTable({
    uprn: v.string(), // Unique Property Reference Number
    address: v.string(), // Clean address string
    postcode: v.string(),
    coordinates: v.object({
      lat: v.number(),
      lng: v.number(),
    }),
    customerName: v.string(),
    type: v.union(v.literal("domestic"), v.literal("commercial"), v.literal("agricultural")),
    accessNotes: v.optional(v.string()), // e.g. "Narrow lane"
    status: v.string(), // "verified"
  }).index("by_uprn", ["uprn"]),

  // 2. SALES LEDGER (Raw Data)
  sales_ledger: defineTable({
    locationId: v.id("locations"),
    date: v.number(), // Unix TS
    product: v.string(), // "Kerosene" | "Gas Oil"
    litres: v.number(),
    pricePerLitre: v.number(),
    totalValue: v.number(),
  }).index("by_location", ["locationId"]),

  // 3. SALES INTELLIGENCE (AI Output)
  sales_narratives: defineTable({
    locationId: v.id("locations"),
    generatedAt: v.number(),
    summary: v.string(),
    seasonalityAnalysis: v.string(),
    anomalies: v.string(),
    recommendation: v.string(),
  }).index("by_location", ["locationId"]),

  // --- CHEF OS MODULE ---

  // 1. KITCHENS / UNITS
  kitchens: defineTable({
    name: v.string(), // "The Seaview Hotel - Main Kitchen"
    manager: v.string(),
    status: v.union(v.literal("open"), v.literal("closed"), v.literal("cleaning")),
    hygieneRating: v.number(), // 5
  }),

  // 2. COLD STORAGE (Fridges/Freezers)
  fridges: defineTable({
    kitchenId: v.id("kitchens"),
    name: v.string(), // "Walk-in Fridge 1"
    type: v.union(v.literal("fridge"), v.literal("freezer")),
    targetTemp: v.number(), // 3.0
    currentTemp: v.number(), // 4.1
    status: v.union(v.literal("safe"), v.literal("warning"), v.literal("critical")),
    lastCheck: v.number(),
  }).index("by_kitchen", ["kitchenId"]),

  // 3. TEMP LOGS (The Audit Trail)
  temp_logs: defineTable({
    fridgeId: v.id("fridges"),
    value: v.number(),
    user: v.string(),
    method: v.union(v.literal("manual"), v.literal("sensor"), v.literal("ai_vision")),
    timestamp: v.number(),
    imageUrl: v.optional(v.string()), // Proof
  }),
});
