import type { AmoPipeline, AmoLead, AmoUser, AmoEvent } from "./client"
import type { Pipeline, Manager, DashboardStats, AiAlert } from "@/lib/types"
import type { UserSettings } from "@/lib/settings/storage"

const AMO_WON_STATUS = 142
const AMO_LOST_STATUS = 143
const STALL_DAYS = 14

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function startOfPrevMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1)
}

// ─── Pipelines ────────────────────────────────────────────────────────────────

export function transformPipelines(
  amoPipelines: AmoPipeline[],
  openLeads: AmoLead[],
  paymentLeads: AmoLead[],
  settings: UserSettings
): Pipeline[] {
  const now = new Date()
  const monthStart = Math.floor(startOfMonth(now).getTime() / 1000)

  return amoPipelines.map((p) => {
    const pipelineOpenLeads = openLeads.filter((l) => l.pipeline_id === p.id)
    const pipelinePaymentLeads = paymentLeads.filter((l) => l.pipeline_id === p.id)

    const createdThisMonth = openLeads.filter(
      (l) => l.pipeline_id === p.id && l.created_at >= monthStart
    ).length

    const salesThisMonth = pipelinePaymentLeads.filter((l) => {
      const t = l.closed_at || 0
      return t >= monthStart
    }).length

    const revenueThisMonth = pipelinePaymentLeads
      .filter((l) => {
        const t = l.closed_at || 0
        return t >= monthStart
      })
      .reduce((s, l) => s + (l.price || 0), 0)

    const stages = (p._embedded?.statuses || [])
      .filter((s) => s.type !== AMO_LOST_STATUS)
      .sort((a, b) => a.sort - b.sort)
      .map((s) => {
        const stageLeads = pipelineOpenLeads.filter((l) => l.status_id === s.id)
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
      created_this_month: createdThisMonth,
      sales_this_month: salesThisMonth,
      revenue_this_month: revenueThisMonth,
    }
  })
}

// ─── Managers ─────────────────────────────────────────────────────────────────

export function transformManagers(
  amoUsers: AmoUser[],
  openLeads: AmoLead[],
  paymentLeads: AmoLead[],
  events: AmoEvent[],
  settings: UserSettings
): Manager[] {
  const now = new Date()
  const nowSec = Math.floor(now.getTime() / 1000)
  const monthStart = Math.floor(startOfMonth(now).getTime() / 1000)
  const thirtyDaysAgo = nowSec - 30 * 86400
  const stallThreshold = nowSec - STALL_DAYS * 86400

  return amoUsers.map((user) => {
    const userOpenLeads = openLeads.filter((l) => l.responsible_user_id === user.id)
    const userPaymentLeads = paymentLeads.filter((l) => l.responsible_user_id === user.id)

    // deals_count: leads in activeStatusIds if set, else all non-won/non-lost
    const activeLeads = settings.activeStatusIds.length > 0
      ? userOpenLeads.filter((l) => settings.activeStatusIds.includes(l.status_id))
      : userOpenLeads.filter((l) => l.status_id !== AMO_WON_STATUS && l.status_id !== AMO_LOST_STATUS)

    // sales_this_month: payment leads closed this calendar month
    const salesThisMonth = userPaymentLeads.filter((l) => {
      const t = l.closed_at || 0
      return t >= monthStart
    })

    const revenue = salesThisMonth.reduce((sum, l) => sum + (l.price || 0), 0)

    const plan = settings.managerPlans[String(user.id)] || 0
    const planPercent = plan > 0 ? (revenue / plan) * 100 : 0

    const stalledDeals = activeLeads.filter((l) => l.updated_at < stallThreshold).length

    const callsCount = events.filter(
      (e) => e.created_by === user.id && e.created_at >= thirtyDaysAgo
    ).length

    const lastEvent = events
      .filter((e) => e.created_by === user.id)
      .sort((a, b) => b.created_at - a.created_at)[0]

    const lastActivityTs = lastEvent?.created_at || 0
    const lastActivity = formatRelativeTime(lastActivityTs)

    const allUserLeads = openLeads.filter((l) => l.responsible_user_id === user.id)
    const lostRecent = allUserLeads.filter(
      (l) => l.status_id === AMO_LOST_STATUS && (l.closed_at || 0) >= thirtyDaysAgo
    ).length
    const wonRecent = userPaymentLeads.filter(
      (l) => (l.closed_at || l.updated_at || 0) >= thirtyDaysAgo
    ).length
    const conversion = wonRecent + lostRecent > 0
      ? (wonRecent / (wonRecent + lostRecent)) * 100
      : 0

    const closedWithDuration = userPaymentLeads.filter((l) => l.closed_at)
    const avgDealDays = closedWithDuration.length > 0
      ? Math.round(
          closedWithDuration.reduce(
            (sum, l) => sum + ((l.closed_at! - l.created_at) / 86400),
            0
          ) / closedWithDuration.length
        )
      : 0

    return {
      id: String(user.id),
      amo_id: user.id,
      name: user.name,
      email: user.email,
      is_tracked: true,
      deals_count: activeLeads.length,
      revenue,
      plan,
      plan_percent: planPercent,
      calls_count: callsCount,
      conversion: parseFloat(conversion.toFixed(1)),
      avg_deal_days: avgDealDays,
      last_activity: lastActivity,
      stalled_deals: stalledDeals,
      sales_this_month: salesThisMonth.length,
    }
  })
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export function calcDashboardStats(
  openLeads: AmoLead[],
  paymentLeads: AmoLead[],
  settings: UserSettings
): DashboardStats {
  const now = new Date()
  const nowSec = Math.floor(now.getTime() / 1000)
  const monthStart = Math.floor(startOfMonth(now).getTime() / 1000)
  const prevMonthStart = Math.floor(startOfPrevMonth(now).getTime() / 1000)

  const activeLeads = settings.activeStatusIds.length > 0
    ? openLeads.filter((l) => settings.activeStatusIds.includes(l.status_id))
    : openLeads.filter((l) => l.status_id !== AMO_WON_STATUS && l.status_id !== AMO_LOST_STATUS)

  const wonThisMonth = paymentLeads.filter((l) => {
    const t = l.closed_at || 0
    return t >= monthStart
  })

  const wonLastMonth = paymentLeads.filter((l) => {
    const t = l.closed_at || 0
    return t >= prevMonthStart && t < monthStart
  })

  const lostThisMonth = openLeads.filter(
    (l) => l.status_id === AMO_LOST_STATUS && (l.closed_at || 0) >= monthStart
  )

  const totalRevenue = wonThisMonth.reduce((s, l) => s + (l.price || 0), 0)
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

  const newThisMonth = openLeads.filter((l) => l.created_at >= monthStart).length
  const newLastMonth = openLeads.filter(
    (l) => l.created_at >= prevMonthStart && l.created_at < monthStart
  ).length
  const dealsDelta = newLastMonth > 0
    ? parseFloat((((newThisMonth - newLastMonth) / newLastMonth) * 100).toFixed(1))
    : 0

  const revenueDelta =
    revenueLastMonth > 0
      ? parseFloat((((totalRevenue - revenueLastMonth) / revenueLastMonth) * 100).toFixed(1))
      : 0

  return {
    total_deals: activeLeads.length,
    total_revenue: totalRevenue,
    revenue_last_month: revenueLastMonth,
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

  const laggingManagers = managers.filter((m) => m.plan > 0 && m.plan_percent < 60 && m.is_tracked)
  for (const m of laggingManagers.slice(0, 2)) {
    alerts.push({
      type: "danger",
      message: `${m.name}: ${m.plan_percent.toFixed(0)}% плана, ${m.stalled_deals} зависших сделок`,
      manager: m.name,
    })
  }

  const topManager = managers.sort((a, b) => b.plan_percent - a.plan_percent)[0]
  if (topManager && topManager.plan > 0 && topManager.plan_percent >= 100) {
    alerts.push({
      type: "info",
      message: `${topManager.name} перевыполняет план (${topManager.plan_percent.toFixed(0)}%) — рекомендуем изучить её подход`,
      manager: topManager.name,
    })
  }

  return alerts
}

// ─── Weekly chart data (last 7 days, daily) ───────────────────────────────────

export function buildWeeklyData(leads: AmoLead[], paymentLeads: AmoLead[], events: AmoEvent[]) {
  return Array.from({ length: 7 }, (_, i) => {
    const dayStart = Math.floor(Date.now() / 1000) - (6 - i) * 86400
    const dayEnd = dayStart + 86400
    const date = new Date(dayStart * 1000)
    const label = date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
    const newDeals = leads.filter(l => l.created_at >= dayStart && l.created_at < dayEnd).length
    const revenue = paymentLeads.filter(l => {
      const t = l.closed_at || 0
      return t >= dayStart && t < dayEnd
    }).reduce((s, l) => s + (l.price || 0), 0)
    return {
      week: label,
      deals: newDeals,
      revenue,
      calls: events.filter(e => e.created_at >= dayStart && e.created_at < dayEnd).length,
    }
  })
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
