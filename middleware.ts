import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-change-in-prod"
)

const PUBLIC_PATHS = ["/login", "/api/auth", "/_next", "/favicon.ico"]

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always allow public paths
  if (isPublic(pathname)) {
    // If already authenticated and visiting /login → redirect to dashboard
    if (pathname === "/login" || pathname.startsWith("/login/")) {
      const session = req.cookies.get("rop_session")?.value
      if (session) {
        try {
          await jwtVerify(session, SECRET)
          return NextResponse.redirect(new URL("/dashboard", req.url))
        } catch {
          // invalid token — let them through to login
        }
      }
    }
    return NextResponse.next()
  }

  // Require auth for everything else
  const session = req.cookies.get("rop_session")?.value
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  try {
    await jwtVerify(session, SECRET)
    return NextResponse.next()
  } catch {
    const res = NextResponse.redirect(new URL("/login", req.url))
    res.cookies.set("rop_session", "", { maxAge: 0, path: "/" })
    return res
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
