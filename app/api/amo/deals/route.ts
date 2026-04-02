import { NextRequest, NextResponse } from "next/server"
import { fetchFilteredLeads, fetchPipelines, fetchUsers } from "@/lib/amo/client"
import { refreshAccessToken } from "@/lib/amo/client"

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  sameSite: "lax" as const,
}

export async function GET(req: NextRequest) {
  let domain = req.cookies.get("amo_domain")?.value
  let accessToken = req.cookies.get("amo_access_token")?.value
  const refreshToken = req.cookies.get("amo_refresh_token")?.value
  const expiresAt = req.cookies.get("amo_token_expires")?.value
  const tokenType = req.cookies.get("amo_token_type")?.value

  if (!domain || !accessToken) {
    return NextResponse.json({ error: "Not connected to AmoCRM" }, { status: 401 })
  }

  const isLongTerm = tokenType === "long_term"
  let newTokens: { access_token: string; refresh_token: string; expires_in: number } | null = null

  if (!isLongTerm) {
    const isExpired = !expiresAt || Date.now() > parseInt(expiresAt) - 300_000
    if (isExpired && refreshToken) {
      try {
        newTokens = await refreshAccessToken(domain, refreshToken)
        accessToken = newTokens.access_token
      } catch {
        return NextResponse.json({ error: "Token refresh failed" }, { status: 401 })
      }
    }
  }

  const token = accessToken!

  // Build filter params from query string
  const searchParams = req.nextUrl.searchParams
  const filterParams: Record<string, string> = {
    order: "created_at",
  }

  const pipelineId = searchParams.get("pipelineId")
  const managerId = searchParams.get("managerId")
  const statusId = searchParams.get("statusId")
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")

  if (pipelineId) filterParams["filter[pipeline_id]"] = pipelineId
  if (managerId) filterParams["filter[responsible_user_id]"] = managerId
  if (statusId) filterParams["filter[statuses][0][status_id]"] = statusId
  if (dateFrom) filterParams["filter[created_at][from]"] = dateFrom
  if (dateTo) filterParams["filter[created_at][to]"] = dateTo

  try {
    const [leads, amoPipelines, amoUsers] = await Promise.all([
      fetchFilteredLeads(domain, token, filterParams),
      fetchPipelines(domain, token),
      fetchUsers(domain, token),
    ])

    const result = NextResponse.json({
      leads,
      pipelines: amoPipelines,
      users: amoUsers,
    })

    if (newTokens) {
      result.cookies.set("amo_access_token", newTokens.access_token, {
        ...COOKIE_OPTS,
        maxAge: newTokens.expires_in,
      })
      result.cookies.set("amo_refresh_token", newTokens.refresh_token, {
        ...COOKIE_OPTS,
        maxAge: 60 * 60 * 24 * 90,
      })
      result.cookies.set("amo_token_expires", String(Date.now() + newTokens.expires_in * 1000), {
        ...COOKIE_OPTS,
        maxAge: newTokens.expires_in,
      })
    }

    return result
  } catch (err) {
    console.error("Deals fetch error:", err)
    return NextResponse.json(
      { error: "Failed to fetch deals", details: (err as Error).message },
      { status: 500 }
    )
  }
}
