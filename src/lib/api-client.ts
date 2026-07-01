/**
 * Client-side fetch wrapper.
 *
 * Auth is httpOnly-cookie-based and same-origin, so requests carry the session
 * cookie automatically — no `Authorization` header, no credentials management.
 * This wrapper just normalizes JSON + error handling.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type FetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** Treat non-2xx as a thrown `ApiError` (default `true`). */
  throwOnError?: boolean;
};

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { body, throwOnError = true, headers, ...rest } = options;

  const res = await fetch(path, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => undefined) : undefined;

  if (!res.ok && throwOnError) {
    const message =
      (typeof data === "object" && data && "error" in data && String((data as Record<string, unknown>).error)) ||
      res.statusText ||
      "Erro inesperado";
    throw new ApiError(res.status, message, typeof data === "object" && data && "error" in data ? String((data as Record<string, unknown>).error) : undefined);
  }

  return data as T;
}
