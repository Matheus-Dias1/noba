import type { Edge, PageInfo, Paginated } from "@/types";

/**
 * Cursor helpers — ported verbatim from the original backend (`utils/pagination.ts`).
 *
 * The cursor is a base64-encoded document id. Lists query "after" a cursor with
 * either `$gt` (products, ascending) or `$lt` (orders/batches, descending) —
 * the comparison direction is chosen at the call site, not here.
 */
export const encodeCursor = (node: string) =>
  Buffer.from(node, "binary").toString("base64");

export const decodeCursor = (cursor: string) =>
  Buffer.from(cursor, "base64").toString("binary");

/**
 * Builds the standard relay-style `{ pageInfo, edges, totalCount }` envelope
 * from a list of documents, computing cursors from each document's id.
 *
 * @param items the already-paged documents (page size already trimmed)
 * @param hasNextPage whether another page exists
 * @param totalCount total documents matching the filter
 */
export function buildPage<T extends { id: string } | { _id: { toString(): string } }>(
  items: T[],
  hasNextPage: boolean,
  totalCount: number,
): Paginated<T> {
  const edges: Edge<T>[] = items.map((r) => {
    const id =
      "id" in r
        ? r.id
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (r as any)._id.toString();
    return { cursor: encodeCursor(id), node: r };
  });

  const pageInfo: PageInfo = {
    endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    hasNextPage,
    startCursor: edges.length > 0 ? edges[0].cursor : null,
  };

  return { pageInfo, edges, totalCount };
}
