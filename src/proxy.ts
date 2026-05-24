import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "session";

const publicRoutes = ["/", "/login", "/register"];
const authRoutes = ["/login", "/register"];

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret-change-me");
}

interface SessionClaims {
  onboardingCompleted?: boolean;
}

async function getSessionClaims(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as SessionClaims;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await getSessionClaims(token) : null;
  const isAuthenticated = session !== null;
  const onboardingCompleted = session?.onboardingCompleted !== false;

  const isPublicRoute = publicRoutes.includes(pathname);
  const isAuthRoute = authRoutes.includes(pathname);
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isAppRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/income") ||
    pathname.startsWith("/expenses") ||
    pathname.startsWith("/investments") ||
    pathname.startsWith("/insurance") ||
    pathname.startsWith("/goals") ||
    pathname.startsWith("/calculators") ||
    pathname.startsWith("/cashflow") ||
    pathname.startsWith("/settings");
  const isProtectedRoute = isAppRoute || isOnboardingRoute;

  if (isAuthRoute && isAuthenticated) {
    const destination = onboardingCompleted ? "/dashboard" : "/onboarding";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && !onboardingCompleted && isAppRoute) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (pathname === "/" && isAuthenticated) {
    const destination = onboardingCompleted ? "/dashboard" : "/onboarding";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (!isPublicRoute && !isProtectedRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
