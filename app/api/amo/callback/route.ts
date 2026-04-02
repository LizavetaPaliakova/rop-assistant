import { NextRequest, NextResponse } from "next/server"
import { exchangeCodeForTokens } from "@/lib/amo/client"

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  sameSite: "lax" as const,
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const referer = searchParams.get("referer") // e.g. "mycompany.amocrm.ru"

  if (!code || !referer) {
    return NextResponse.redirect(new URL("/settings?error=missing_params", req.url))
  }

  // AmoCRM sends the full domain in referer, e.g. "mycompany.amocrm.ru"
  const domain = referer.replace(/\.amocrm\.ru$/, "")

  try {
    const tokens = await exchangeCodeForTokens(referer, code)

    const res = NextResponse.redirect(new URL("/settings?amo_connected=1", req.url))

    // Store tokens in httpOnly cookies
    res.cookies.set("amo_access_token", tokens.access_token, {
      ...COOKIE_OPTS,
      maxAge: tokens.expires_in,
    })
    res.cookies.set("amo_refresh_token", tokens.refresh_token, {
      ...COOKIE_OPTS,
      maxAge: 60 * 60 * 24 * 90, // 90 days
    })
    res.cookies.set("amo_domain", domain, {
      ...COOKIE_OPTS,
      maxAge: 60 * 60 * 24 * 90,
    })
    res.cookies.set("amo_token_expires", String(Date.now() + tokens.expires_in * 1000), {
      ...COOKIE_OPTS,
      maxAge: tokens.expires_in,
    })

    return res
  } catch (err) {
    console.error("OAuth callback error:", err)
    const msg = encodeURIComponent((err as Error).message)
    return NextResponse.redirect(new URL(`/settings?error=oauth_failed&msg=${msg}`, req.url))
  }
}
