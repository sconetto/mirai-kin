import type { z } from "zod";
import { ApiError } from "./errors";

export async function parseJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON");
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join(".") || "(root)");
    throw new ApiError(
      400,
      "validation_error",
      result.error.issues.map((issue) => issue.message).join("; "),
      fields,
    );
  }

  return result.data;
}

export function parseQuery<T extends z.ZodType>(request: Request, schema: T): z.infer<T> {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join(".") || "(root)");
    throw new ApiError(
      400,
      "validation_error",
      result.error.issues.map((issue) => issue.message).join("; "),
      fields,
    );
  }
  return result.data;
}

export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    const { errorResponse } = await import("./errors");
    return errorResponse(error);
  }
}
