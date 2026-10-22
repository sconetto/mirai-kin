import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { handle, parseJson } from "@/lib/api/validate";
import { verifyPassword } from "@/lib/auth";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createSessionToken } from "@/lib/session";
import { loginSchema } from "@/lib/schemas";
import { getOnboardingStatus } from "@/services/onboarding";

export async function POST(request: Request) {
  return handle(async () => {
    const body = await parseJson(request, loginSchema);
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.username, body.username)).limit(1);

    if (!user) {
      throw new ApiError(401, "invalid_credentials", "Invalid username or password");
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, "invalid_credentials", "Invalid username or password");
    }

    const token = await createSessionToken(user.username);
    const onboardingComplete = await getOnboardingStatus();
    const response = NextResponse.json({ ok: true, onboardingComplete });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  });
}
