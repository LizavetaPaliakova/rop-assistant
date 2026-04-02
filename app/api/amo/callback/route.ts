import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const referer = searchParams.get("referer") // AmoCRM domain

  if (!code || !referer) {
    return NextResponse.redirect(new URL("/settings?error=no_code", req.url))
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch(`https://${referer}/oauth2/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.AMO_CLIENT_ID,
        client_secret: process.env.AMO_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.AMO_REDIRECT_URL,
      }),
    })

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL("/settings?error=token_exchange_failed", req.url))
    }

    const tokens = await tokenRes.json()
    const domain = referer.replace(".amocrm.ru", "")

    // Redirect to settings with success — in production store tokens in Supabase
    const redirectUrl = new URL("/settings", req.url)
    redirectUrl.searchParams.set("amo_connected", "true")
    redirectUrl.searchParams.set("domain", domain)

    const response = NextResponse.redirect(redirectUrl)
    response.cookies.set("amo_access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: tokens.expires_in,
    })
    response.cookies.set("amo_domain", domain, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    })

    return response
  } catch (error) {
    console.error("OAuth callback error:", error)
    return NextResponse.redirect(new URL("/settings?error=oauth_failed", req.url))
  }
}
