import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { RESERVED_ORG_SLUGS, normalizeOrgSlug } from "@/lib/auth/org-slugs";

const TENANT_HEADER = "x-org-slug";

function getRootDomain() {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "tradetrack.app";
}

function isLocalhost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/onboarding")
  );
}

function getRootLoginUrl(req: NextRequest) {
  const rootUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    `${req.nextUrl.protocol}//${isLocalhost(req.nextUrl.hostname) ? req.nextUrl.host : getRootDomain()}`;
  const loginUrl = new URL("/login", rootUrl);
  loginUrl.searchParams.set("callbackUrl", req.nextUrl.href);
  return loginUrl;
}

function resolveTenantSlug(req: NextRequest) {
  const hostname = req.nextUrl.hostname;
  const rootDomain = getRootDomain();

  if (isLocalhost(hostname)) {
    const match = req.nextUrl.pathname.match(/^\/org\/([^/]+)(?:\/|$)/);
    return match ? normalizeOrgSlug(match[1]) : null;
  }

  if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
    return null;
  }

  if (!hostname.endsWith(`.${rootDomain}`)) {
    return null;
  }

  const slug = normalizeOrgSlug(hostname.slice(0, -1 * (`.${rootDomain}`).length));
  return slug || null;
}

function rewriteLocalTenantPath(req: NextRequest, slug: string) {
  if (!isLocalhost(req.nextUrl.hostname)) {
    return req.nextUrl;
  }

  const nextUrl = req.nextUrl.clone();
  const prefix = `/org/${slug}`;
  nextUrl.pathname = nextUrl.pathname.startsWith(prefix)
    ? nextUrl.pathname.slice(prefix.length) || "/dashboard"
    : nextUrl.pathname;
  return nextUrl;
}

export async function middleware(req: NextRequest) {
  const slug = resolveTenantSlug(req);
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!slug && req.nextUrl.pathname === "/dashboard") {
    if (!token) {
      return NextResponse.redirect(getRootLoginUrl(req));
    }

    return NextResponse.redirect(new URL("/api/auth/post-login", req.url));
  }

  if (!slug) {
    return NextResponse.next();
  }

  if (RESERVED_ORG_SLUGS.has(slug)) {
    return NextResponse.rewrite(new URL("/_not-found", req.url));
  }

  if (!token && !isPublicPath(req.nextUrl.pathname)) {
    return NextResponse.redirect(getRootLoginUrl(req));
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(TENANT_HEADER, slug);

  const response =
    isLocalhost(req.nextUrl.hostname) && req.nextUrl.pathname.startsWith(`/org/${slug}`)
      ? NextResponse.rewrite(rewriteLocalTenantPath(req, slug), {
          request: { headers: requestHeaders }
        })
      : NextResponse.next({
          request: { headers: requestHeaders }
        });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
