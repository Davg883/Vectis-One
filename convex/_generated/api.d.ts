/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics_missionControl from "../analytics/missionControl.js";
import type * as core_organizations from "../core/organizations.js";
import type * as core_users from "../core/users.js";
import type * as depot_fuel from "../depot/fuel.js";
import type * as depot_tanks from "../depot/tanks.js";
import type * as http from "../http.js";
import type * as init from "../init.js";
import type * as intelligence_brain from "../intelligence/brain.js";
import type * as intelligence_ingest from "../intelligence/ingest.js";
import type * as intelligence_locations from "../intelligence/locations.js";
import type * as intelligence_media from "../intelligence/media.js";
import type * as intelligence_search from "../intelligence/search.js";
import type * as intelligence_vectorize from "../intelligence/vectorize.js";
import type * as legal_deadlines from "../legal/deadlines.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_maps from "../lib/maps.js";
import type * as lib_org from "../lib/org.js";
import type * as transport_compliance from "../transport/compliance.js";
import type * as transport_defects from "../transport/defects.js";
import type * as transport_maintenance from "../transport/maintenance.js";
import type * as transport_maintenanceCore from "../transport/maintenanceCore.js";
import type * as transport_vehicles from "../transport/vehicles.js";
import type * as transport_vendors from "../transport/vendors.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "analytics/missionControl": typeof analytics_missionControl;
  "core/organizations": typeof core_organizations;
  "core/users": typeof core_users;
  "depot/fuel": typeof depot_fuel;
  "depot/tanks": typeof depot_tanks;
  http: typeof http;
  init: typeof init;
  "intelligence/brain": typeof intelligence_brain;
  "intelligence/ingest": typeof intelligence_ingest;
  "intelligence/locations": typeof intelligence_locations;
  "intelligence/media": typeof intelligence_media;
  "intelligence/search": typeof intelligence_search;
  "intelligence/vectorize": typeof intelligence_vectorize;
  "legal/deadlines": typeof legal_deadlines;
  "lib/auth": typeof lib_auth;
  "lib/maps": typeof lib_maps;
  "lib/org": typeof lib_org;
  "transport/compliance": typeof transport_compliance;
  "transport/defects": typeof transport_defects;
  "transport/maintenance": typeof transport_maintenance;
  "transport/maintenanceCore": typeof transport_maintenanceCore;
  "transport/vehicles": typeof transport_vehicles;
  "transport/vendors": typeof transport_vendors;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
