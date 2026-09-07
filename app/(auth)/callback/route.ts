import { NextRequest, NextResponse } from "next/server";
import { createAuthActions } from "@insforge/sdk/ssr";
import { OAUTH_VERIFIER_COOKIE } from "@/lib/auth-constants";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("insforge_code");

    if (!code) {
      console.error("[auth/callback] missing insforge_code param");
      return NextResponse.redirect(
        new URL("/login?error=oauth_failed", request.nextUrl.origin),
      );
    }

    const codeVerifier = request.cookies.get(OAUTH_VERIFIER_COOKIE)?.value;
    const response = NextResponse.redirect(
      new URL("/dashboard", request.nextUrl.origin),
    );

    const auth = createAuthActions({
      requestCookies: request.cookies,
      responseCookies: response.cookies,
    });

    const { error } = await auth.exchangeOAuthCode(code, codeVerifier);

    if (error) {
      console.error("[auth/callback]", error);
      const failureResponse = NextResponse.redirect(
        new URL("/login?error=oauth_failed", request.nextUrl.origin),
      );
      failureResponse.cookies.delete(OAUTH_VERIFIER_COOKIE);
      return failureResponse;
    }

    response.cookies.delete(OAUTH_VERIFIER_COOKIE);
    return response;
  } catch (error) {
    console.error("[auth/callback]", error);
    const failureResponse = NextResponse.redirect(
      new URL("/login?error=oauth_failed", request.nextUrl.origin),
    );
    failureResponse.cookies.delete(OAUTH_VERIFIER_COOKIE);
    return failureResponse;
  }
}
