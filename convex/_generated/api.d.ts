/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aegis from "../aegis.js";
import type * as analysis from "../analysis.js";
import type * as chef from "../chef.js";
import type * as civic from "../civic.js";
import type * as civic_ai from "../civic_ai.js";
import type * as dashboard from "../dashboard.js";
import type * as depot from "../depot.js";
import type * as logistics from "../logistics.js";
import type * as transport from "../transport.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aegis: typeof aegis;
  analysis: typeof analysis;
  chef: typeof chef;
  civic: typeof civic;
  civic_ai: typeof civic_ai;
  dashboard: typeof dashboard;
  depot: typeof depot;
  logistics: typeof logistics;
  transport: typeof transport;
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
