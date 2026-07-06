import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Donors only get the portal; staff only get the dashboard.
    if (path.startsWith("/portal") && token?.role !== "DONOR") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (path.startsWith("/dashboard") && token?.role === "DONOR") {
      return NextResponse.redirect(new URL("/portal", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/portal/:path*"],
};
