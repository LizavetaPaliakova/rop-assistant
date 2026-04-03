"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  Phone, TrendingUp, AlertTriangle, Star,
  Clock, Target, DollarSign, Eye, EyeOff, Settings2, ShoppingCart,
  Flame, Thermometer,
} from "lucide-react"
import { useAmo } from "@/context/amo-context"
import { formatCurrency, formatPercent, cn } from "@/lib/utils"
import type { Manager } from "@/lib/types"
import type { UserSettings } from "@/lib/settings/storage"

const DEFAULT_SETTINGS: UserSettings = {
  selectedPipelineIds: [],
  monthlyPlan: 0,
  managerPlans: {},
}

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
  const planBadge = manager.plan > 0
    ? (manager.plan_percent >= 100 ? "success" : manager.plan_percent >= 70 ? "warning" : "danger")
    : "secondary"

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
      <div className="flex items-start justify-between mb-2">
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
          manager.plan > 0 && !isHidden && (
            <Badge variant={planBadge as any}>{Math.round(manager.plan_percent)}%</Badge>
          )
        )}
      </div>
      {!isHidden && (
        <>
          <div className="space-y-0.5 text-xs text-slate-400">
            <p>
              <span className="text-orange-400">&#128293;</span> Горячих: <span className="text-slate-200 font-medium">{manager.hot_leads}</span>
              {"  "}
              <span className="text-sky-400">&#127777;</span> Тёплых: <span className="text-slate-200 font-medium">{manager.warm_leads}</span>
            </p>
            <p>Сделок всего: <span className="text-slate-200 font-medium">{manager.deals_count}</span></p>
            <p>Продаж в этом месяце: <span className="text-slate-200 font-medium">{manager.sales_this_month}</span></p>
            <p>Выручка: <span className="text-emerald-400 font-medium">{formatCurrency(manager.revenue)}</span></p>
          </div>
          {manager.plan > 0 && (
            <>
              <Progress
                value={Math.min(manager.plan_percent, 100)}
                className="h-1.5 mt-2"
                indicatorClassName={
                  manager.plan_percent >= 100 ? "bg-emerald-500" :
                  manager.plan_percent >= 70 ? "bg-amber-500" : "bg-red-500"
                }
              />
              <p className="mt-1 text-right text-xs text-slate-500">{manager.plan_percent.toFixed(0)}% плана</p>
            </>
          )}
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
  const [appSettings, setAppSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [planInputs, setPlanInputs] = useState<Record<string, string>>({})
  const [savingPlan, setSavingPlan] = useState<string | null>(null)

  useEffect(() => {
    setHiddenIds(loadHidden())
  }, [])

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s: UserSettings) => {
        setAppSettings(s)
        const inputs: Record<string, string> = {}
        allManagers.forEach((m) => {
          inputs[m.id] = String(s.managerPlans[m.id] ?? m.plan ?? "")
        })
        setPlanInputs(inputs)
      })
      .catch(() => {})
  }, [allManagers])

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

  const handleSavePlan = async (managerId: string) => {
    const val = parseInt(planInputs[managerId] || "0", 10)
    if (isNaN(val)) return
    setSavingPlan(managerId)
    try {
      const updated = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerPlans: { ...appSettings.managerPlans, [managerId]: val } }),
      }).then((r) => r.json())
      setAppSettings(updated)
    } catch {}
    setSavingPlan(null)
  }

  if (!sel) return null

  const teamAvgRevenue = managers.length > 0
    ? managers.reduce((s, m) => s + m.revenue, 0) / managers.length
    : 0

  const teamComparisonData = [
    { name: sel.name.split(" ")[0], value: sel.revenue, avg: Math.round(teamAvgRevenue) },
  ]

  const teamPlanData = managers.map((m) => ({
    name: m.name.split(" ")[0],
    план: Math.round(m.plan_percent),
  }))

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
            <p className="px-1 text-xs text-slate-500">Нажмите <Eye className="inline h-3 w-3" /> чтобы скрыть менеджера</p>
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
                    {sel.plan > 0 && sel.plan_percent >= 100 && <Star className="h-4 w-4 text-amber-400 fill-amber-400" />}
                    {sel.stalled_deals > 3 && <AlertTriangle className="h-4 w-4 text-red-400" />}
                  </div>
                  <p className="text-sm text-slate-400">{sel.email}</p>
                  {sel.plan > 0 && (
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
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-100">{formatCurrency(sel.revenue)}</p>
                  {sel.plan > 0 && <p className="text-xs text-slate-500">из {formatCurrency(sel.plan)}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Горячих лидов", value: sel.hot_leads, icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10" },
              { label: "Тёплых лидов", value: sel.warm_leads, icon: Thermometer, color: "text-sky-400", bg: "bg-sky-500/10" },
              { label: "Сделок всего", value: sel.deals_count, icon: Target, color: "text-blue-400", bg: "bg-blue-500/10" },
              { label: "Продаж в месяце", value: sel.sales_this_month, icon: ShoppingCart, color: "text-emerald-400", bg: "bg-emerald-500/10" },
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

          {/* Secondary KPI row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Выручка", value: formatCurrency(sel.revenue), icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "Ср. дней на сделку", value: sel.avg_deal_days, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
              { label: "Звонков (30 дн.)", value: sel.calls_count, icon: Phone, color: "text-violet-400", bg: "bg-violet-500/10" },
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

          {/* Plan setting */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">План на месяц</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 max-w-sm">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    placeholder="0"
                    value={planInputs[sel.id] ?? ""}
                    onChange={(e) => setPlanInputs((prev) => ({ ...prev, [sel.id]: e.target.value }))}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-2 text-sm text-slate-500">&#8381;</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSavePlan(sel.id)}
                  disabled={savingPlan === sel.id}
                >
                  {savingPlan === sel.id ? "Сохранение..." : "Сохранить план"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Team comparison chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Сравнение команды — % выполнения плана</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={teamPlanData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
