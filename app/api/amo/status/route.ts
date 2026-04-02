import { NextRequest, NextResponse } from "next/server"
import { refreshAccessToken } from "@/lib/amo/client"

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  sameSite: "lax" as const,
}

export async function GET(req: NextRequest) {
  // Сначала смотрим cookies (установленные через UI или connect-token)
  let domain = req.cookies.get("amo_domain")?.value
  let accessToken = req.cookies.get("amo_access_token")?.value
  const refreshToken = req.cookies.get("amo_refresh_token")?.value
  const expiresAt = req.cookies.get("amo_token_expires")?.value
  const tokenType = req.cookies.get("amo_token_type")?.value // "long_term" | undefined

  // Если cookie нет — пробуем env (долгосрочный токен из .env.local)
  const envToken = process.env.AMO_LONG_TERM_TOKEN
  const envDomain = process.env.AMO_DOMAIN

  if (!domain && envToken && envDomain) {
    domain = envDomain
    accessToken = envToken
  }

  if (!domain || !accessToken) {
    return NextResponse.json({
      connected: false,
      domain: null,
      lastSyncAt: null,
      leadsCount: 0,
      managersCount: 0,
    })
  }

  // Долгосрочный токен — проверяем только expiry (exp=1788134400 → 2026-06-30)
  const isLongTerm = tokenType === "long_term" || !!envToken
  if (isLongTerm) {
    const expMs = expiresAt ? parseInt(expiresAt) : 1788134400000
    if (Date.now() > expMs) {
      return NextResponse.json({ connected: false, domain: null, lastSyncAt: null, leadsCount: 0, managersCount: 0 })
    }
    return NextResponse.json({
      connected: true,
      domain,
      lastSyncAt: null,
      leadsCount: 0,
      managersCount: 0,
    })
  }

  // OAuth-токен — проверяем истечение и рефрешим
  const isExpired = !expiresAt || Date.now() > parseInt(expiresAt) - 300_000

  if (isExpired && refreshToken) {
    try {
      const tokens = await refreshAccessToken(domain, refreshToken)
      const res = NextResponse.json({
        connected: true, domain, lastSyncAt: null, leadsCount: 0, managersCount: 0,
      })
      res.cookies.set("amo_access_token", tokens.access_token, { ...COOKIE_OPTS, maxAge: tokens.expires_in })
      res.cookies.set("amo_refresh_token", tokens.refresh_token, { ...COOKIE_OPTS, maxAge: 60 * 60 * 24 * 90 })
      res.cookies.set("amo_token_expires", String(Date.now() + tokens.expires_in * 1000), { ...COOKIE_OPTS, maxAge: tokens.expires_in })
      return res
    } catch {
      const res = NextResponse.json({ connected: false, domain: null, lastSyncAt: null, leadsCount: 0, managersCount: 0 })
      res.cookies.delete("amo_access_token")
      res.cookies.delete("amo_refresh_token")
      res.cookies.delete("amo_domain")
      res.cookies.delete("amo_token_expires")
      return res
    }
  }

  if (isExpired) {
    return NextResponse.json({ connected: false, domain: null, lastSyncAt: null, leadsCount: 0, managersCount: 0 })
  }

  return NextResponse.json({ connected: true, domain, lastSyncAt: null, leadsCount: 0, managersCount: 0 })
}
