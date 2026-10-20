import { timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";
import { ApiError } from "./errors";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function assertApiToken(request: Request): void {
  const expected = getEnv().API_TOKEN;
  if (!expected) {
    throw new ApiError(500, "api_token_not_configured", "API_TOKEN is not configured on the server");
  }

  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) {
    throw new ApiError(401, "unauthorized", "Missing bearer token");
  }

  const token = header.slice("Bearer ".length).trim();
  if (!safeEqual(token, expected)) {
    throw new ApiError(401, "unauthorized", "Invalid bearer token");
  }
}
