import { NextRequest, NextResponse } from "next/server"
import { mockManagers, mockDashboardStats } from "@/lib/mock-data"

function formatCurrency(v: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(v)
}

interface ReportConfig {
  type: "morning" | "weekly" | "custom"
  includePlan?: boolean
  includeRisks?: boolean
  includeTop?: boolean
  includeAI?: boolean
  managersFilter?: string[]
}

export async function POST(req: NextRequest) {
  try {
    const config: ReportConfig = await req.json()
    const managers = mockManagers
    const stats = mockDashboardStats

    const now = new Date()
    const dateStr = now.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })

    let message = `📊 *${config.type === "morning" ? "Утренний дайджест" : "Отчёт по продажам"} | ${dateStr}*\n\n`
    message += `━━━━━━━━━━━━━━━━━━\n`

    if (config.includePlan !== false) {
      message += `📈 *ВЫПОЛНЕНИЕ ПЛАНА*\n`
      const sorted = [...managers].sort((a, b) => b.plan_percent - a.plan_percent)
      for (const m of sorted) {
        const bars = Math.round(m.plan_percent / 10)
        const bar = "█".repeat(Math.min(bars, 10)) + "░".repeat(Math.max(10 - bars, 0))
        const emoji = m.plan_percent >= 100 ? " ⭐" : m.plan_percent < 60 ? " ⚠️" : ""
        message += `${m.name.split(" ")[0]} ${bar} ${Math.round(m.plan_percent)}%${emoji}\n`
      }
      message += `\n`
    }

    message += `💰 *ИТОГО ПО ОТДЕЛУ*\n`
    message += `Выручка: ${formatCurrency(stats.total_revenue)}\n`
    message += `Сделок в работе: ${stats.total_deals}\n`
    message += `Конверсия: ${stats.conversion}%\n\n`

    if (config.includeRisks !== false) {
      const riskyManagers = managers.filter((m) => m.stalled_deals > 3 || m.calls_count < 20)
      message += `⚠️ *РИСКИ*\n`
      message += `• 34 сделки без активности >14 дней\n`
      if (riskyManagers.length > 0) {
        for (const m of riskyManagers) {
          message += `• ${m.name}: ${m.stalled_deals} зависших сделок\n`
        }
      }
      message += `\n`
    }

    if (config.includeTop !== false) {
      const top3 = [...managers].sort((a, b) => b.plan_percent - a.plan_percent).slice(0, 3)
      message += `🏆 *ТОП-3*\n`
      top3.forEach((m, i) => {
        message += `${i + 1}. ${m.name} — ${Math.round(m.plan_percent)}%\n`
      })
      message += `\n`
    }

    if (config.includeAI) {
      message += `🤖 *Совет дня:* Проработайте этап КП с отстающими менеджерами — конверсия упала на 12% vs прошлого месяца.\n`
    }

    message += `_Сгенерировано ROP Assistant_`

    return NextResponse.json({ success: true, message })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
