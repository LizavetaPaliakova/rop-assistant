import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    // If authenticated user visits /login, redirect to dashboard
    if (token && req.nextUrl.pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        // Public paths — always allow
        if (
          pathname.startsWith("/login") ||
          pathname.startsWith("/api/auth")
        ) {
          return true
        }
        // All other routes require a valid next-auth session token
        return !!token
      },
    },
    pages: { signIn: "/login" },
  }
)

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
}
