import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { idempotencyKeys } from "@/db/schema";

export function requestHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

export async function getCachedResponse(
  key: string,
  scope: string,
): Promise<{ statusCode: number; response: unknown } | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(idempotencyKeys)
    .where(eq(idempotencyKeys.key, key))
    .limit(1);

  if (!row || row.scope !== scope) return null;
  return { statusCode: row.statusCode, response: row.response };
}

export async function storeResponse(
  key: string,
  scope: string,
  hash: string,
  statusCode: number,
  response: unknown,
): Promise<void> {
  const db = getDb();
  await db
    .insert(idempotencyKeys)
    .values({ key, scope, requestHash: hash, statusCode, response })
    .onConflictDoNothing();
}

/**
 * Wrap a handler so a repeated `Idempotency-Key` returns the original result
 * instead of re-applying the mutation.
 */
export async function withIdempotency<T>(
  request: Request,
  scope: string,
  payload: unknown,
  handler: () => Promise<{ status: number; body: T }>,
): Promise<Response> {
  const key = request.headers.get("idempotency-key");
  if (!key) {
    const { status, body } = await handler();
    return Response.json(body, { status });
  }

  const cached = await getCachedResponse(key, scope);
  if (cached) {
    return Response.json(cached.response, { status: cached.statusCode });
  }

  const hash = requestHash(payload);
  const { status, body } = await handler();
  await storeResponse(key, scope, hash, status, body);
  return Response.json(body, { status });
}
