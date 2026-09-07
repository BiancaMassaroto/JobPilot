// Next.js 16 renamed middleware.ts to proxy.ts — same request-interception mechanism.
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@insforge/sdk/ssr/middleware";

const PROTECTED_ROUTES = ["/dashboard", "/profile", "/find-jobs"];

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const { accessToken } = await updateSession({
    requestCookies: request.cookies,
    responseCookies: response.cookies,
  });

  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) =>
      request.nextUrl.pathname === route ||
      request.nextUrl.pathname.startsWith(`${route}/`),
  );

  if (isProtectedRoute && !accessToken) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
