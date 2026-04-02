"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import {
  Phone, TrendingUp, TrendingDown, AlertTriangle, Star,
  Clock, Target, DollarSign, ChevronRight, User, Eye, EyeOff, Settings2
} from "lucide-react"
import { useAmo } from "@/context/amo-context"
import { formatCurrency, formatPercent, cn } from "@/lib/utils"
import type { Manager } from "@/lib/types"

const HIDDEN_KEY = "rop_hidden_managers"

function loadHidden(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(HIDDEN_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch { return new Set() }
}

function saveHidden(ids: Set<string>) {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify([...ids]))
}

const aiRecommendations: Record<string, string[]> = {
  "1": [
    "Хорошая динамика — 94.7% плана. Поддерживать текущий темп.",
    "2 зависших сделки требуют проработки. Проверить причины задержки.",
    "Конверсия 22.4% — выше среднего. Поделиться практиками с командой.",
  ],
  "2": [
    "Критично: всего 54% плана при 3 оставшихся неделях.",
    "5 сделок без активности. Провести разбор каждой сделки 1-на-1.",
    "Конверсия 11.2% — вдвое ниже нормы. Рекомендую фокус-сессию по работе с КП и переговорам.",
    "0 звонков за 3 дня — необходима срочная беседа.",
  ],
  "3": [
    "Перевыполнение плана на 2%! Топ-менеджер этого месяца.",
    "28.6% конверсия — лучший результат в команде. Изучить и тиражировать подход.",
    "Предложить роль наставника для Петрова и Морозовой.",
  ],
  "4": [
    "71.7% плана — нужно ускорение в финальной фазе месяца.",
    "3 зависших сделки — проверить готовность клиентов к решению.",
    "Средний цикл 22 дня — норма, но есть потенциал для сокращения.",
  ],
  "5": [
    "63% плана — значительное отставание.",
    "4 зависших сделки без активности — риск потери.",
    "Конверсия 15.3% — на уровне нижней нормы. Нужна поддержка по работе с возражениями.",
  ],
}

function ManagerCard({
  manager, isSelected, isHidden, editMode, onClick, onToggleHide,
}: {
  manager: Manager
  isSelected: boolean
  isHidden: boolean
  editMode: boolean
  onClick: () => void
  onToggleHide: (e: React.MouseEvent) => void
}) {
  const planBadge = manager.plan_percent >= 100 ? "success" : manager.plan_percent >= 70 ? "warning" : "danger"

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition-all",
        isHidden ? "opacity-40" : "",
        isSelected && !isHidden
          ? "border-blue-500/50 bg-blue-500/10"
          : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-slate-300">
            {manager.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">{manager.name}</p>
            <p className="text-xs text-slate-500">{manager.last_activity}</p>
          </div>
        </div>
        {editMode ? (
          <button
            onClick={onToggleHide}
            className={cn(
              "rounded p-1 transition-colors",
              isHidden ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-red-400"
            )}
          >
            {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : (
          !isHidden && <Badge variant={planBadge as any}>{Math.round(manager.plan_percent)}%</Badge>
        )}
      </div>
      {!isHidden && (
        <>
          <Progress
            value={Math.min(manager.plan_percent, 100)}
            className="h-1.5"
            indicatorClassName={
              manager.plan_percent >= 100 ? "bg-emerald-500" :
              manager.plan_percent >= 70 ? "bg-amber-500" : "bg-red-500"
            }
          />
          <div className="mt-2 flex justify-between text-xs text-slate-500">
            <span>{formatCurrency(manager.revenue)}</span>
            <span>{manager.deals_count} сд.</span>
          </div>
        </>
      )}
    </button>
  )
}

export default function ManagersPage() {
  const { data, isDemo } = useAmo()
  const allManagers = data.managers
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    setHiddenIds(loadHidden())
  }, [])

  const managers = allManagers.filter((m) => !hiddenIds.has(m.id))
  const [selected, setSelected] = useState<Manager | null>(null)
  const sel: Manager | null = (selected && !hiddenIds.has(selected.id)) ? selected : (managers[0] ?? null)

  const toggleHide = (id: string) => {
    setHiddenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveHidden(next)
      return next
    })
  }

  if (!sel) return null

  const teamData = managers.map((m) => ({
    name: m.name.split(" ")[0],
    план: Math.round(m.plan_percent),
    конверсия: m.conversion,
  }))

  const radarData = [
    { subject: "План", value: Math.min(sel.plan_percent, 120) },
    { subject: "Конверсия", value: (sel.conversion / 30) * 100 },
    { subject: "Звонки", value: Math.min((sel.calls_count / 120) * 100, 100) },
    { subject: "Скорость", value: Math.max(100 - sel.avg_deal_days * 2, 10) },
    { subject: "Активность", value: sel.stalled_deals === 0 ? 100 : Math.max(100 - sel.stalled_deals * 15, 10) },
  ]

  const recommendations = aiRecommendations[sel.id] || []
  const criticalCount = recommendations.filter((r) => r.includes("Критично") || r.includes("срочная")).length

  return (
    <AppLayout title="Менеджеры" subtitle={isDemo ? "Аналитика · Демо-данные" : "Аналитика · данные из AmoCRM"}>
      <div className="grid grid-cols-12 gap-4">
        {/* Left — manager list */}
        <div className="col-span-3 space-y-2">
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Менеджеры</p>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary">{managers.length}</Badge>
              <button
                onClick={() => setEditMode((v) => !v)}
                className={cn(
                  "rounded p-1 transition-colors",
                  editMode ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
                )}
                title="Настроить список"
              >
                <Settings2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {editMode && (
            <p className="px-1 text-xs text-slate-500">Нажмите <Eye className="inline h-3 w-3" /> чтобы скрыть менеджера из аналитики</p>
          )}
          {allManagers.map((m) => (
            <ManagerCard
              key={m.id}
              manager={m}
              isSelected={sel.id === m.id}
              isHidden={hiddenIds.has(m.id)}
              editMode={editMode}
              onClick={() => { if (!hiddenIds.has(m.id)) setSelected(m) }}
              onToggleHide={(e) => { e.stopPropagation(); toggleHide(m.id) }}
            />
          ))}
        </div>

        {/* Right — detail */}
        <div className="col-span-9 space-y-4">
          {/* Header card */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">
                  {sel.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-lg font-bold text-slate-100">{sel.name}</h2>
                    {sel.plan_percent >= 100 && <Star className="h-4 w-4 text-amber-400 fill-amber-400" />}
                    {sel.stalled_deals > 3 && <AlertTriangle className="h-4 w-4 text-red-400" />}
                  </div>
                  <p className="text-sm text-slate-400">{sel.email}</p>
                  <div className="mt-3 flex items-center gap-1">
                    <Progress
                      value={Math.min(sel.plan_percent, 100)}
                      className="h-2 flex-1 max-w-xs"
                      indicatorClassName={
                        sel.plan_percent >= 100 ? "bg-emerald-500" :
                        sel.plan_percent >= 70 ? "bg-amber-500" : "bg-red-500"
                      }
                    />
                    <span className={`text-sm font-bold ml-2 ${
                      sel.plan_percent >= 100 ? "text-emerald-400" :
                      sel.plan_percent >= 70 ? "text-amber-400" : "text-red-400"
                    }`}>
                      {sel.plan_percent.toFixed(1)}% плана
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-100">{formatCurrency(sel.revenue)}</p>
                  <p className="text-xs text-slate-500">из {formatCurrency(sel.plan)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Сделок", value: sel.deals_count, icon: Target, color: "text-blue-400", bg: "bg-blue-500/10" },
              { label: "Звонков", value: sel.calls_count, icon: Phone, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "Конверсия", value: formatPercent(sel.conversion), icon: TrendingUp, color: "text-violet-400", bg: "bg-violet-500/10" },
              { label: "Ср. дней на сделку", value: sel.avg_deal_days, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
            ].map((kpi) => {
              const Icon = kpi.icon
              return (
                <Card key={kpi.label}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${kpi.bg}`}>
                      <Icon className={`h-4 w-4 ${kpi.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{kpi.label}</p>
                      <p className="text-base font-bold text-slate-100">{kpi.value}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Radar chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Профиль менеджера</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#1e293b" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 11 }} />
                    <Radar name={sel.name} dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* AI recommendations */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    AI Рекомендации
                  </CardTitle>
                  {criticalCount > 0 && (
                    <Badge variant="danger">{criticalCount} критично</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {recommendations.map((rec, i) => {
                  const isCritical = rec.includes("Критично") || rec.includes("срочная")
                  const isPositive = rec.includes("!") || rec.includes("Хорошая") || rec.includes("Топ")
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-2 rounded-lg p-3 border",
                        isCritical ? "bg-red-500/5 border-red-500/20" :
                        isPositive ? "bg-emerald-500/5 border-emerald-500/20" :
                        "bg-slate-900/40 border-slate-700/30"
                      )}
                    >
                      <ChevronRight className={cn(
                        "h-3.5 w-3.5 shrink-0 mt-0.5",
                        isCritical ? "text-red-400" : isPositive ? "text-emerald-400" : "text-slate-500"
                      )} />
                      <p className="text-xs text-slate-300 leading-relaxed">{rec}</p>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          {/* Team comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Сравнение команды — % выполнения плана</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={teamData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(v) => [`${v}%`, "% плана"]}
                  />
                  <Bar dataKey="план" fill="#3b82f6" radius={[4, 4, 0, 0]}
                    label={{ position: "top", fill: "#64748b", fontSize: 10, formatter: (v: unknown) => `${v}%` }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
