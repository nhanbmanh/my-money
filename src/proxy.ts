import { auth } from "@/auth";
import { NextResponse } from "next/server";

const publicRoutes = ["/login", "/register", "/verify-email"];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isPublicRoute = publicRoutes.includes(req.nextUrl.pathname);

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isPublicRoute) {
    const defaultRoute = req.cookies.get("default_app_route")?.value || "/financial-management";
    const targetRoute = ["/financial-management", "/weather"].includes(defaultRoute)
      ? defaultRoute
      : "/financial-management";
    return NextResponse.redirect(new URL(targetRoute, req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
