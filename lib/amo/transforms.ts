// Transform raw AmoCRM data into our app's types
import type { AmoPipeline, AmoLead, AmoUser, AmoEvent } from "./client"
import type { Pipeline, Manager, DashboardStats, AiAlert } from "@/lib/types"

const AMO_WON_STATUS = 142
const AMO_LOST_STATUS = 143
const STALL_DAYS = 14

// ─── Pipelines ────────────────────────────────────────────────────────────────

export function transformPipelines(
  amoPipelines: AmoPipeline[],
  leads: AmoLead[]
): Pipeline[] {
  return amoPipelines.map((p) => {
    // Count deals per stage
    const pipelineLeads = leads.filter((l) => l.pipeline_id === p.id)

    const stages = (p._embedded?.statuses || [])
      .filter((s) => s.type !== AMO_LOST_STATUS) // exclude lost; keep won (142) for toggle
      .sort((a, b) => a.sort - b.sort)
      .map((s) => {
        const stageLeads = pipelineLeads.filter((l) => l.status_id === s.id)
        return {
          id: String(s.id),
          amo_id: s.id,
          name: s.name,
          deals_count: stageLeads.length,
          revenue: stageLeads.reduce((sum, l) => sum + (l.price || 0), 0),
          color: s.color,
          type: s.type,
        }
      })

    return {
      id: String(p.id),
      amo_id: p.id,
      name: p.name,
      is_monitored: p.is_main,
      target_conversion: 15,
      stages,
    }
  })
}

// ─── Managers ─────────────────────────────────────────────────────────────────

export function transformManagers(
  amoUsers: AmoUser[],
  leads: AmoLead[],
  wonLeadsAll: AmoLead[],
  events: AmoEvent[],
  planPerManager = 3_000_000
): Manager[] {
  const now = Math.floor(Date.now() / 1000)
  const thirtyDaysAgo = now - 30 * 86400

  return amoUsers.map((user) => {
    const userLeads = leads.filter((l) => l.responsible_user_id === user.id)
    const openLeads = userLeads.filter(
      (l) => l.status_id !== AMO_WON_STATUS && l.status_id !== AMO_LOST_STATUS
    )
    // Use separately fetched won leads for revenue calculation
    const userWonLeads = wonLeadsAll.filter((l) => l.responsible_user_id === user.id)

    // Revenue from won deals in last 30 days
    const revenue = userWonLeads
      .filter((l) => (l.closed_at || l.updated_at || 0) >= thirtyDaysAgo)
      .reduce((sum, l) => sum + (l.price || 0), 0)

    // Stalled deals (no activity for STALL_DAYS)
    const stallThreshold = now - STALL_DAYS * 86400
    const stalledDeals = openLeads.filter((l) => l.updated_at < stallThreshold).length

    // Calls in last 30 days
    const callsCount = events.filter(
      (e) => e.created_by === user.id && e.created_at >= thirtyDaysAgo
    ).length

    // Recent activity
    const lastEvent = events
      .filter((e) => e.created_by === user.id)
      .sort((a, b) => b.created_at - a.created_at)[0]

    const lastActivityTs = lastEvent?.created_at || 0
    const lastActivity = formatRelativeTime(lastActivityTs)

    // Conversion: won / (won + lost) for last 30 days
    const lostRecent = userLeads.filter(
      (l) => l.status_id === AMO_LOST_STATUS && (l.closed_at || 0) >= thirtyDaysAgo
    ).length
    const wonRecent = userWonLeads.filter(
      (l) => (l.closed_at || l.updated_at || 0) >= thirtyDaysAgo
    ).length
    const conversion = wonRecent + lostRecent > 0
      ? (wonRecent / (wonRecent + lostRecent)) * 100
      : 0

    // Avg deal days from created to closed
    const closedWithDuration = userWonLeads.filter((l) => l.closed_at)
    const avgDealDays = closedWithDuration.length > 0
      ? Math.round(
          closedWithDuration.reduce(
            (sum, l) => sum + ((l.closed_at! - l.created_at) / 86400),
            0
          ) / closedWithDuration.length
        )
      : 0

    const planPercent = planPerManager > 0 ? (revenue / planPerManager) * 100 : 0

    return {
      id: String(user.id),
      amo_id: user.id,
      name: user.name,
      email: user.email,
      is_tracked: true,
      deals_count: openLeads.length,
      revenue,
      plan: planPerManager,
      plan_percent: planPercent,
      calls_count: callsCount,
      conversion: parseFloat(conversion.toFixed(1)),
      avg_deal_days: avgDealDays,
      last_activity: lastActivity,
      stalled_deals: stalledDeals,
    }
  })
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export function calcDashboardStats(
  leads: AmoLead[],
  wonLeadsAll: AmoLead[],
  managers: Manager[]
): DashboardStats {
  const now = Math.floor(Date.now() / 1000)
  const thirtyDaysAgo = now - 30 * 86400
  const sixtyDaysAgo = now - 60 * 86400

  const openLeads = leads.filter(
    (l) => l.status_id !== AMO_WON_STATUS && l.status_id !== AMO_LOST_STATUS
  )
  // Use separately fetched won leads for revenue
  const wonThisMonth = wonLeadsAll.filter(
    (l) => (l.closed_at || l.updated_at || 0) >= thirtyDaysAgo
  )
  const wonLastMonth = wonLeadsAll.filter(
    (l) =>
      (l.closed_at || l.updated_at || 0) >= sixtyDaysAgo &&
      (l.closed_at || l.updated_at || 0) < thirtyDaysAgo
  )
  const lostThisMonth = leads.filter(
    (l) => l.status_id === AMO_LOST_STATUS && (l.closed_at || 0) >= thirtyDaysAgo
  )

  const revenue = wonThisMonth.reduce((s, l) => s + (l.price || 0), 0)
  const revenueLastMonth = wonLastMonth.reduce((s, l) => s + (l.price || 0), 0)

  const total = wonThisMonth.length + lostThisMonth.length
  const conversion = total > 0 ? (wonThisMonth.length / total) * 100 : 0

  const closedWithDuration = wonThisMonth.filter((l) => l.closed_at)
  const avgDealDays =
    closedWithDuration.length > 0
      ? Math.round(
          closedWithDuration.reduce(
            (s, l) => s + ((l.closed_at! - l.created_at) / 86400),
            0
          ) / closedWithDuration.length
        )
      : 0

  // New deals vs last month
  const newThisMonth = leads.filter((l) => l.created_at >= thirtyDaysAgo).length
  const newLastMonth = leads.filter(
    (l) => l.created_at >= sixtyDaysAgo && l.created_at < thirtyDaysAgo
  ).length
  const dealsDelta = newLastMonth > 0
    ? parseFloat((((newThisMonth - newLastMonth) / newLastMonth) * 100).toFixed(1))
    : 0

  const revenueDelta =
    revenueLastMonth > 0
      ? parseFloat((((revenue - revenueLastMonth) / revenueLastMonth) * 100).toFixed(1))
      : 0

  return {
    total_deals: openLeads.length,
    total_revenue: revenue,
    conversion: parseFloat(conversion.toFixed(1)),
    avg_deal_days: avgDealDays,
    deals_delta: dealsDelta,
    revenue_delta: revenueDelta,
    conversion_delta: 0,
  }
}

// ─── AI alerts ────────────────────────────────────────────────────────────────

export function generateAlerts(managers: Manager[], leads: AmoLead[]): AiAlert[] {
  const alerts: AiAlert[] = []
  const now = Math.floor(Date.now() / 1000)
  const stallThreshold = now - STALL_DAYS * 86400

  // Total stalled deals
  const totalStalled = leads.filter(
    (l) =>
      l.status_id !== AMO_WON_STATUS &&
      l.status_id !== AMO_LOST_STATUS &&
      l.updated_at < stallThreshold
  ).length

  if (totalStalled > 0) {
    alerts.push({
      type: totalStalled > 10 ? "danger" : "warning",
      message: `сделок без активности более ${STALL_DAYS} дней`,
      count: totalStalled,
    })
  }

  // Managers below 60%
  const laggingManagers = managers.filter((m) => m.plan_percent < 60 && m.is_tracked)
  for (const m of laggingManagers.slice(0, 2)) {
    alerts.push({
      type: "danger",
      message: `${m.name}: ${m.plan_percent.toFixed(0)}% плана, ${m.stalled_deals} зависших сделок`,
      manager: m.name,
    })
  }

  // Top performer
  const topManager = managers.sort((a, b) => b.plan_percent - a.plan_percent)[0]
  if (topManager && topManager.plan_percent >= 100) {
    alerts.push({
      type: "info",
      message: `${topManager.name} перевыполняет план (${topManager.plan_percent.toFixed(0)}%) — рекомендуем изучить её подход`,
      manager: topManager.name,
    })
  }

  return alerts
}

// ─── Weekly chart data ────────────────────────────────────────────────────────

export function buildWeeklyData(leads: AmoLead[], wonLeadsAll: AmoLead[], events: AmoEvent[]) {
  const weeks: { week: string; deals: number; revenue: number; calls: number }[] = []
  const now = Date.now()

  for (let w = 5; w >= 0; w--) {
    const from = now - (w + 1) * 7 * 86400 * 1000
    const to = now - w * 7 * 86400 * 1000

    const fromSec = from / 1000
    const toSec = to / 1000

    const weekLeads = leads.filter((l) => l.created_at >= fromSec && l.created_at < toSec)
    // Won leads closed/updated in this week
    const weekWon = wonLeadsAll.filter((l) => {
      const ts = (l.closed_at || l.updated_at || 0)
      return ts >= fromSec && ts < toSec
    })
    const weekCalls = events.filter((e) => e.created_at >= fromSec && e.created_at < toSec)

    const date = new Date(from)
    const label = date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })

    weeks.push({
      week: label,
      deals: weekLeads.length,
      revenue: weekWon.reduce((s, l) => s + (l.price || 0), 0),
      calls: weekCalls.length,
    })
  }

  return weeks
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(unixTs: number): string {
  if (!unixTs) return "Нет данных"
  const diffSec = Math.floor(Date.now() / 1000) - unixTs
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} мин назад`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ч назад`
  if (diffSec < 172800) return "Вчера"
  return `${Math.floor(diffSec / 86400)} дней назад`
}
