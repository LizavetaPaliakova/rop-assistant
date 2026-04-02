import { NextRequest, NextResponse } from "next/server"
import {
  fetchPipelines, fetchLeads, fetchWonLeads, fetchUsers, fetchCallEvents, refreshAccessToken,
} from "@/lib/amo/client"
import {
  transformPipelines, transformManagers, calcDashboardStats,
  generateAlerts, buildWeeklyData,
} from "@/lib/amo/transforms"
import { loadSettings } from "@/lib/settings/storage"

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  sameSite: "lax" as const,
}

export async function POST(req: NextRequest) {
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
        newTokens = await refreshAccessToken(domain, refreshToken!)
        accessToken = newTokens.access_token
      } catch {
        return NextResponse.json({ error: "Token refresh failed, please reconnect" }, { status: 401 })
      }
    }
  }

  const token = accessToken!

  try {
    const settings = await loadSettings()
    const pipelineIds = settings.selectedPipelineIds

    const safe = <T>(p: Promise<T>, fallback: T) => p.catch((e) => { console.warn("AMO fetch warn:", e?.message); return fallback })

    const [amoPipelines, amoLeads, amoWonLeads, amoUsers, amoEvents] = await Promise.all([
      safe(fetchPipelines(domain, token), []),
      safe(fetchLeads(domain, token, pipelineIds), []),
      safe(fetchWonLeads(domain, token, settings.paymentStatusIds, pipelineIds), []),
      safe(fetchUsers(domain, token), []),
      safe(fetchCallEvents(domain, token, 30), []),
    ])

    const filteredPipelines = settings.selectedPipelineIds.length > 0
      ? amoPipelines.filter(p => settings.selectedPipelineIds.includes(p.id))
      : amoPipelines

    const pipelines = transformPipelines(filteredPipelines, amoLeads, amoWonLeads, settings)
    const managers = transformManagers(amoUsers, amoLeads, amoWonLeads, amoEvents, settings)
    const stats = calcDashboardStats(amoLeads, amoWonLeads, settings)
    const alerts = generateAlerts(managers, amoLeads)
    const weeklyData = buildWeeklyData(amoLeads, amoWonLeads, amoEvents)

    const result = NextResponse.json({
      success: true,
      stats: {
        pipelines: amoPipelines.length,
        leads: amoLeads.length,
        wonLeads: amoWonLeads.length,
        managers: amoUsers.length,
      },
      data: {
        pipelines,
        managers,
        stats,
        alerts,
        weeklyData,
        activityData: [],
      },
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
    console.error("Sync error:", err)
    return NextResponse.json(
      { error: "Sync failed", details: (err as Error).message },
      { status: 500 }
    )
  }
}
