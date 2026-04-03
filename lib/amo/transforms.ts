import type { AmoPipeline, AmoLead, AmoUser, AmoEvent } from "./client"
import {
  getCustomFieldDate,
  AMO_FIELD_PAYMENT_DATE,
  AMO_FIELD_APPLICATION_DATE,
  AMO_PIPELINE_II,
  AMO_PIPELINE_EVENTS,
} from "./client"
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

function endOfPrevMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/** Returns unix timestamp of payment date field (295533), or null */
function getPaymentDate(lead: AmoLead): number | null {
  return getCustomFieldDate(lead, AMO_FIELD_PAYMENT_DATE)
}

/** Returns unix timestamp of application date field (379811), or null */
function getApplicationDate(lead: AmoLead): number | null {
  return getCustomFieldDate(lead, AMO_FIELD_APPLICATION_DATE)
}

// ─── Pipelines ────────────────────────────────────────────────────────────────

export function transformPipelines(
  amoPipelines: AmoPipeline[],
  allLeads: AmoLead[],
  settings: UserSettings
): Pipeline[] {
  const now = new Date()
  const monthStart = Math.floor(startOfMonth(now).getTime() / 1000)

  return amoPipelines.map((p) => {
    const pipelineLeads = allLeads.filter((l) => l.pipeline_id === p.id)
    const openLeads = pipelineLeads.filter(
      (l) => l.status_id !== AMO_WON_STATUS && l.status_id !== AMO_LOST_STATUS
    )

    const createdThisMonth = pipelineLeads.filter(
      (l) => l.created_at >= monthStart
    ).length

    const salesThisMonthLeads = pipelineLeads.filter((l) => {
      const pd = getPaymentDate(l)
      return pd !== null && pd >= monthStart && (l.price || 0) > 0
    })

    const salesThisMonth = salesThisMonthLeads.length
    const revenueThisMonth = salesThisMonthLeads.reduce((s, l) => s + (l.price || 0), 0)

    const stages = (p._embedded?.statuses || [])
      .filter((s) => s.type !== AMO_LOST_STATUS)
      .sort((a, b) => a.sort - b.sort)
      .map((s) => {
        const stageLeads = openLeads.filter((l) => l.status_id === s.id)
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
  allLeads: AmoLead[],
  events: AmoEvent[],
  settings: UserSettings
): Manager[] {
  const now = new Date()
  const nowSec = Math.floor(now.getTime() / 1000)
  const monthStart = Math.floor(startOfMonth(now).getTime() / 1000)
  const thirtyDaysAgo = nowSec - 30 * 86400
  const stallThreshold = nowSec - STALL_DAYS * 86400

  return amoUsers.map((user) => {
    const userLeads = allLeads.filter((l) => l.responsible_user_id === user.id)

    // Open (active) leads: all non-won/non-lost across all pipelines
    const openLeads = userLeads.filter(
      (l) => l.status_id !== AMO_WON_STATUS && l.status_id !== AMO_LOST_STATUS
    )

    // Hot leads: open leads in PIPELINE_II
    const hotLeads = openLeads.filter((l) => l.pipeline_id === AMO_PIPELINE_II).length

    // Warm leads: open leads in PIPELINE_EVENTS
    const warmLeads = openLeads.filter((l) => l.pipeline_id === AMO_PIPELINE_EVENTS).length

    // Sales this month: leads where payment date field falls in current month AND price > 0
    const salesThisMonthLeads = userLeads.filter((l) => {
      const pd = getPaymentDate(l)
      return pd !== null && pd >= monthStart && (l.price || 0) > 0
    })

    const revenue = salesThisMonthLeads.reduce((sum, l) => sum + (l.price || 0), 0)

    const plan = settings.managerPlans[String(user.id)] || 0
    const planPercent = plan > 0 ? (revenue / plan) * 100 : 0

    const stalledDeals = openLeads.filter((l) => l.updated_at < stallThreshold).length

    const callsCount = events.filter(
      (e) => e.created_by === user.id && e.created_at >= thirtyDaysAgo
    ).length

    const lastEvent = events
      .filter((e) => e.created_by === user.id)
      .sort((a, b) => b.created_at - a.created_at)[0]

    const lastActivityTs = lastEvent?.created_at || 0
    const lastActivity = formatRelativeTime(lastActivityTs)

    // Conversion: won vs lost in last 30 days
    const lostRecent = userLeads.filter(
      (l) => l.status_id === AMO_LOST_STATUS && (l.closed_at || 0) >= thirtyDaysAgo
    ).length
    const wonRecent = userLeads.filter((l) => {
      const pd = getPaymentDate(l)
      return pd !== null && pd >= thirtyDaysAgo
    }).length
    const conversion = wonRecent + lostRecent > 0
      ? (wonRecent / (wonRecent + lostRecent)) * 100
      : 0

    // Avg deal days: leads with payment date, measured from created_at to payment date
    const paidWithDates = userLeads.filter((l) => getPaymentDate(l) !== null)
    const avgDealDays = paidWithDates.length > 0
      ? Math.round(
          paidWithDates.reduce(
            (sum, l) => sum + ((getPaymentDate(l)! - l.created_at) / 86400),
            0
          ) / paidWithDates.length
        )
      : 0

    return {
      id: String(user.id),
      amo_id: user.id,
      name: user.name,
      email: user.email,
      is_tracked: true,
      deals_count: openLeads.length,
      hot_leads: hotLeads,
      warm_leads: warmLeads,
      revenue,
      plan,
      plan_percent: planPercent,
      calls_count: callsCount,
      conversion: parseFloat(conversion.toFixed(1)),
      avg_deal_days: avgDealDays,
      last_activity: lastActivity,
      stalled_deals: stalledDeals,
      sales_this_month: salesThisMonthLeads.length,
    }
  })
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export function calcDashboardStats(
  allLeads: AmoLead[],
  settings: UserSettings
): DashboardStats {
  const now = new Date()
  const monthStart = Math.floor(startOfMonth(now).getTime() / 1000)
  const prevMonthStart = Math.floor(startOfPrevMonth(now).getTime() / 1000)
  const prevMonthEnd = Math.floor(endOfPrevMonth(now).getTime() / 1000)

  // Total open deals across all pipelines (non-won/non-lost)
  const openLeads = allLeads.filter(
    (l) => l.status_id !== AMO_WON_STATUS && l.status_id !== AMO_LOST_STATUS
  )

  // Revenue this month: leads where payment date is in current month AND price > 0
  const paidThisMonth = allLeads.filter((l) => {
    const pd = getPaymentDate(l)
    return pd !== null && pd >= monthStart && (l.price || 0) > 0
  })

  // Revenue last month: payment date in previous month AND price > 0
  const paidLastMonth = allLeads.filter((l) => {
    const pd = getPaymentDate(l)
    return pd !== null && pd >= prevMonthStart && pd < prevMonthEnd && (l.price || 0) > 0
  })

  const totalRevenue = paidThisMonth.reduce((s, l) => s + (l.price || 0), 0)
  const revenueLastMonth = paidLastMonth.reduce((s, l) => s + (l.price || 0), 0)

  // Conversion: sales vs losses this month
  const lostThisMonth = allLeads.filter(
    (l) => l.status_id === AMO_LOST_STATUS && (l.closed_at || 0) >= monthStart
  )
  const total = paidThisMonth.length + lostThisMonth.length
  const conversion = total > 0 ? (paidThisMonth.length / total) * 100 : 0

  // Avg deal days from payment date leads
  const paidWithDates = paidThisMonth.filter((l) => getPaymentDate(l) !== null)
  const avgDealDays =
    paidWithDates.length > 0
      ? Math.round(
          paidWithDates.reduce(
            (s, l) => s + ((getPaymentDate(l)! - l.created_at) / 86400),
            0
          ) / paidWithDates.length
        )
      : 0

  // Deals delta: new leads created this month vs last month
  const newThisMonth = allLeads.filter((l) => l.created_at >= monthStart).length
  const newLastMonth = allLeads.filter(
    (l) => l.created_at >= prevMonthStart && l.created_at < prevMonthEnd
  ).length
  const dealsDelta = newLastMonth > 0
    ? parseFloat((((newThisMonth - newLastMonth) / newLastMonth) * 100).toFixed(1))
    : 0

  const revenueDelta =
    revenueLastMonth > 0
      ? parseFloat((((totalRevenue - revenueLastMonth) / revenueLastMonth) * 100).toFixed(1))
      : 0

  return {
    total_deals: openLeads.length,
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

// ─── Weekly chart data (last 7 days, by application date field) ───────────────

export function buildWeeklyData(allLeads: AmoLead[], events: AmoEvent[]) {
  return Array.from({ length: 7 }, (_, i) => {
    const dayStart = Math.floor(Date.now() / 1000) - (6 - i) * 86400
    const dayEnd = dayStart + 86400
    const date = new Date(dayStart * 1000)
    const label = date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })

    // Hot leads: PIPELINE_II leads whose application date falls in this day
    const hotLeads = allLeads.filter(l => {
      if (l.pipeline_id !== AMO_PIPELINE_II) return false
      const appDate = getApplicationDate(l)
      return appDate !== null && appDate >= dayStart && appDate < dayEnd
    }).length

    // Warm leads: PIPELINE_EVENTS leads whose application date falls in this day
    const warmLeads = allLeads.filter(l => {
      if (l.pipeline_id !== AMO_PIPELINE_EVENTS) return false
      const appDate = getApplicationDate(l)
      return appDate !== null && appDate >= dayStart && appDate < dayEnd
    }).length

    return {
      week: label,
      hotLeads,
      warmLeads,
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
