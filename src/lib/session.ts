import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "./env";

export const SESSION_COOKIE = "fin_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getEnv().AUTH_SECRET);
}

export async function createSessionToken(username: string): Promise<string> {
  return new SignJWT({ sub: username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<{ sub?: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as { sub?: string };
  } catch {
    return null;
  }
}
