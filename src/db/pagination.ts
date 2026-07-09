import type { Edge, PageInfo, Paginated } from "@/types";

/**
 * Cursor pagination for Postgres/Drizzle.
 *
 * The cursor is a base64-encoded serial `id`. Because we use `serial` PKs, we
 * keyset-paginate on `id` directly — ascending (`id > cursor`) or descending
 * (`id < cursor`) depending on the list. The wire envelope
 * `{ pageInfo, edges, totalCount }` matches what the existing frontend expects,
 * so the migration is transparent to the client.
 *
 * (The Mongo version base64-encoded the ObjectId; here we base64 the numeric id.
 * The cursor is opaque to the client either way.)
 */
export const encodeCursor = (id: number | string) =>
  Buffer.from(String(id), "utf8").toString("base64");

export const decodeCursor = (cursor: string): number => {
  const raw = Buffer.from(cursor, "base64").toString("utf8");
  const n = Number(raw);
  return Number.isNaN(n) ? 0 : n;
};

/**
 * Build the standard relay-style envelope from a page of rows. Each row must
 * expose a numeric/string `id`.
 */
export function buildPage<T extends { id: number | string }>(
  rows: T[],
  hasNextPage: boolean,
  totalCount: number,
): Paginated<T> {
  const edges: Edge<T>[] = rows.map((r) => ({
    cursor: encodeCursor(r.id),
    node: r,
  }));

  const pageInfo: PageInfo = {
    startCursor: edges.length > 0 ? edges[0].cursor : null,
    endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    hasNextPage,
  };

  return { pageInfo, edges, totalCount };
}
