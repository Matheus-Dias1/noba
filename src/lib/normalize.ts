/**
 * Deep normalization of Mongoose query results to plain JSON.
 *
 * Mongoose's `toJSON` transform handles top-level docs, but populated refs
 * nested inside arrays of subdocuments (e.g. `Batch.orders[].items[].item`)
 * don't get the transform applied reliably, and may surface as Mongoose
 * Documents with `$__`/`_doc` internals rather than lean objects. This helper
 * walks the tree, converts every `_id` to a string `id`, and drops internals so
 * the wire shape is consistent and the client can key/group by `id`.
 */
export function normalize<T>(value: unknown): T {
  return normalizeValue(value) as T;
}

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  // ObjectId / Date -> string
  if (typeof value === "object" && "_bsontype" in value && (value as { _bsontype: string })._bsontype === "ObjectId") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) return value.map(normalizeValue);

  if (typeof value === "object") {
    const raw = value as Record<string, unknown>;
    // pull from Mongoose internals if present
    const source = (raw._doc && typeof raw._doc === "object" ? raw._doc : raw) as Record<string, unknown>;
    const out: Record<string, unknown> = {};

    if (source._id !== undefined) out.id = String(source._id);

    for (const key of Object.keys(source)) {
      if (key === "_id" || key === "__v" || key === "$__" || key === "$isNew" || key === "_doc" || key === "$locals") {
        continue;
      }
      out[key] = normalizeValue(source[key]);
    }
    return out;
  }

  return value;
}
