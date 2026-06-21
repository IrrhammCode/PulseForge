import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ONBOARDING_COOKIE } from "@/lib/onboarding.constants";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/welcome", request.url));
  }

  const onboarded = request.cookies.get(ONBOARDING_COOKIE)?.value === "1";
  if (!onboarded) {
    return NextResponse.redirect(new URL("/welcome", request.url));
  }

  return NextResponse.next();
}

/** Gate app pages — /welcome stays public; / always redirects to landing */
export const config = {
  matcher: [
    "/",
    "/dashboard",
    "/studio/:path*",
    "/analyze/:path*",
    "/viral",
    "/partners",
    "/integrations",
    "/help",
    "/settings",
  ],
};