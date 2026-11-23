/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as catalog from "../catalog.js";
import type * as crons from "../crons.js";
import type * as decks from "../decks.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_cards from "../lib/cards.js";
import type * as lib_clerk from "../lib/clerk.js";
import type * as lib_decks from "../lib/decks.js";
import type * as lib_parties from "../lib/parties.js";
import type * as loans from "../loans.js";
import type * as pool from "../pool.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  catalog: typeof catalog;
  crons: typeof crons;
  decks: typeof decks;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/cards": typeof lib_cards;
  "lib/clerk": typeof lib_clerk;
  "lib/decks": typeof lib_decks;
  "lib/parties": typeof lib_parties;
  loans: typeof loans;
  pool: typeof pool;
  users: typeof users;
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
