import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const intl = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const localeMatch = pathname.match(/^\/(pt-BR|en)(?:\/|$)/);
  const locale = localeMatch?.[1] ?? routing.defaultLocale;
  const isLogin = /^\/(pt-BR|en)\/login\/?$/.test(pathname);

  if (!isLogin) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session) {
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
  }

  return intl(request);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
