import { type NextRequest, NextResponse } from "next/server";

// Quick redirect for visitors with no session cookie. Pages and server actions
// still verify the session themselves (lib/auth.ts requireUser).
export function proxy(request: NextRequest) {
  if (request.cookies.has("farm_session")) return NextResponse.next();
  const url = request.nextUrl.clone();
  const next = request.nextUrl.pathname + request.nextUrl.search;
  url.pathname = "/login";
  url.search = next === "/" ? "" : `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|setup|_next/|favicon.ico|manifest.webmanifest).*)"],
};
