import { NextRequest, NextResponse } from "next/server"
import { refreshAccessToken } from "@/lib/amo/client"

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  sameSite: "lax" as const,
}

export async function GET(req: NextRequest) {
  const domain = req.cookies.get("amo_domain")?.value
  const accessToken = req.cookies.get("amo_access_token")?.value
  const refreshToken = req.cookies.get("amo_refresh_token")?.value
  const expiresAt = req.cookies.get("amo_token_expires")?.value

  if (!domain || !refreshToken) {
    return NextResponse.json({
      connected: false,
      domain: null,
      lastSyncAt: null,
      leadsCount: 0,
      managersCount: 0,
    })
  }

  // Check if access token is expired (with 5-min buffer)
  const isExpired = !accessToken ||
    !expiresAt ||
    Date.now() > parseInt(expiresAt) - 300_000

  if (isExpired) {
    // Try refresh
    try {
      const tokens = await refreshAccessToken(domain, refreshToken)
      const res = NextResponse.json({
        connected: true,
        domain,
        lastSyncAt: null,
        leadsCount: 0,
        managersCount: 0,
      })
      res.cookies.set("amo_access_token", tokens.access_token, {
        ...COOKIE_OPTS,
        maxAge: tokens.expires_in,
      })
      res.cookies.set("amo_refresh_token", tokens.refresh_token, {
        ...COOKIE_OPTS,
        maxAge: 60 * 60 * 24 * 90,
      })
      res.cookies.set("amo_token_expires", String(Date.now() + tokens.expires_in * 1000), {
        ...COOKIE_OPTS,
        maxAge: tokens.expires_in,
      })
      return res
    } catch {
      // Refresh failed — clear cookies
      const res = NextResponse.json({ connected: false, domain: null, lastSyncAt: null, leadsCount: 0, managersCount: 0 })
      res.cookies.delete("amo_access_token")
      res.cookies.delete("amo_refresh_token")
      res.cookies.delete("amo_domain")
      res.cookies.delete("amo_token_expires")
      return res
    }
  }

  return NextResponse.json({
    connected: true,
    domain,
    lastSyncAt: null,
    leadsCount: 0,
    managersCount: 0,
  })
}
