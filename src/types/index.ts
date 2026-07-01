/**
 * Shared domain types — single source of truth used by the server (Mongoose),
 * the API Route Handlers and the client (TanStack Query).
 *
 * These mirror the original oba-backend Mongoose interfaces, normalized so the
 * same type can describe both the DB document and the JSON that travels over the
 * wire (after `_id` is stringified by Mongoose's `toJSON` transform).
 */

/** Unit conversion: `oneDefaultEquals` of `measurementUnit` == 1 default unit. */
export interface Conversion {
  measurementUnit: string;
  oneDefaultEquals: number;
}

export interface Product {
  id: string;
  description: string;
  defaultMeasurementUnit: string;
  conversions: Conversion[];
  archived: boolean;
}

export interface User {
  id: string;
  username: string;
  name: string;
  admin: boolean;
}

export interface Batch {
  id: string;
  number: number;
  startDate: string; // ISO
  endDate: string; // ISO
  orders: string[]; // Order ids (denormalized back-reference, see PAGES_EXTRACTION.md §10 #4)
}

export interface OrderItem {
  item: string; // Product id
  amount: number;
  measurementUnit: string;
}

export interface Order {
  id: string;
  client: string;
  batch: string; // Batch id
  createdAt: string; // ISO
  deliverAt: string; // ISO
  items: OrderItem[];
  archived: boolean;
}

/* ------------------------------------------------------------------ */
/* Populated variants used by the list/detail screens                  */
/* ------------------------------------------------------------------ */

/** A product as it appears nested inside an order line (batch summary). */
export interface NestedProduct {
  id: string;
  description: string;
  defaultMeasurementUnit: string;
  conversions: Conversion[];
}

/** An order line with its product populated. */
export interface PopulatedOrderItem {
  amount: number;
  measurementUnit: string;
  item: NestedProduct;
}

/** An order with batch + items+product populated (as returned by /batches/summary). */
export interface SummaryOrder {
  id: string;
  client: string;
  createdAt: string;
  deliverAt: string;
  items: PopulatedOrderItem[];
}

/** A fully-populated batch, as returned by /api/batches/summary/:id. */
export interface BatchSummary {
  id: string;
  number: number;
  startDate: string;
  endDate: string;
  orders: SummaryOrder[];
}

/* ------------------------------------------------------------------ */
/* Cursor pagination envelope (relay-style, matches the original API)  */
/* ------------------------------------------------------------------ */

export interface PageInfo {
  startCursor: string | null;
  endCursor: string | null;
  hasNextPage: boolean;
}

export interface Edge<T> {
  cursor: string;
  node: T;
}

export interface Paginated<T> {
  pageInfo: PageInfo;
  edges: Edge<T>[];
  totalCount: number;
}

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

export type SessionError =
  | "USER_DOESNT_EXIST"
  | "INSUFFICIENT_PERMISSIONS"
  | "WRONG_PASSWORD"
  | "USER_ALREADY_EXISTS";

export interface SessionResponse {
  token?: string;
  error?: SessionError;
}

/** Decoded JWT payload. */
export interface SessionPayload {
  sub: string; // user id
  name: string;
  username: string;
  admin: boolean;
}
