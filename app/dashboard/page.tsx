"use client"

import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts"
import {
  TrendingUp, TrendingDown, DollarSign, Target,
  AlertTriangle, AlertCircle, Info,
} from "lucide-react"
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils"
import { useState, useEffect } from "react"
import { useAmo } from "@/context/amo-context"
import type { UserSettings } from "@/lib/settings/storage"

const DEFAULT_SETTINGS: UserSettings = {
  selectedPipelineIds: [],
  paymentStatusIds: [],
  activeStatusIds: [],
  monthlyPlan: 0,
  managerPlans: {},
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 shadow-xl">
        <p className="mb-1 text-xs font-medium text-slate-400">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-xs" style={{ color: p.color }}>
            {p.name}: {p.name === "revenue" ? formatCurrency(p.value) : p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  const { data, isDemo } = useAmo()
  const [appSettings, setAppSettings] = useState<UserSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setAppSettings)
      .catch(() => {})
  }, [])

  const stats = data.stats
  const alerts = data.alerts
  const weeklyData = data.weeklyData
  const pipelines = data.pipelines

  const planPct = appSettings.monthlyPlan > 0
    ? ((stats.total_revenue / appSettings.monthlyPlan) * 100)
    : null

  const alertIcons = {
    danger: <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />,
    warning: <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />,
    info: <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
  }

  const funnelPipeline = pipelines[0]
  const maxCount = funnelPipeline
    ? Math.max(...funnelPipeline.stages.map((s) => s.deals_count), 1)
    : 1

  return (
    <AppLayout
      title="Дашборд"
      subtitle={isDemo ? "Сводная аналитика · Демо-режим (подключите AmoCRM в Настройках)" : "Сводная аналитика · данные из AmoCRM"}
    >
      {/* Top KPI row */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {/* 1. Deals in work */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Сделок в работе</p>
                <p className="text-2xl font-bold text-slate-100">{formatNumber(stats.total_deals)}</p>
                <div className="mt-1 flex items-center gap-1">
                  {stats.deals_delta >= 0
                    ? <TrendingUp className="h-3 w-3 text-emerald-400" />
                    : <TrendingDown className="h-3 w-3 text-red-400" />}
                  <span className={`text-xs font-medium ${stats.deals_delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {stats.deals_delta >= 0 ? "+" : ""}{stats.deals_delta}% vs пр. мес.
                  </span>
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Target className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Revenue this month */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Выручка за месяц</p>
                <p className="text-2xl font-bold text-slate-100">{formatCurrency(stats.total_revenue)}</p>
                <div className="mt-1 flex items-center gap-1">
                  {stats.revenue_delta >= 0
                    ? <TrendingUp className="h-3 w-3 text-emerald-400" />
                    : <TrendingDown className="h-3 w-3 text-red-400" />}
                  <span className={`text-xs font-medium ${stats.revenue_delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {stats.revenue_delta >= 0 ? "+" : ""}{stats.revenue_delta}% vs пр. мес.
                  </span>
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Revenue last month */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Выручка за прошлый месяц</p>
                <p className="text-2xl font-bold text-slate-100">{formatCurrency(stats.revenue_last_month)}</p>
                <p className="mt-1 text-xs text-slate-500">Предыдущий период</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-500/10">
                <DollarSign className="h-5 w-5 text-slate-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Plan completion */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 mb-1">Выполнение плана</p>
                <p className="text-2xl font-bold text-slate-100">
                  {planPct !== null ? `${planPct.toFixed(1)}%` : "–"}
                </p>
                {planPct !== null && (
                  <div className="mt-2 h-1.5 w-full rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        planPct >= 100 ? "bg-emerald-500" : planPct >= 70 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(planPct, 100)}%` }}
                    />
                  </div>
                )}
                {planPct === null && (
                  <p className="mt-1 text-xs text-slate-500">Задайте план в Настройках</p>
                )}
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 shrink-0 ml-2">
                <TrendingUp className="h-5 w-5 text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Daily deals chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Новые сделки по дням</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="deals" name="Новые сделки" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              AI Анализ — узкие места
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length === 0 && (
              <p className="text-xs text-slate-500">Нет активных предупреждений</p>
            )}
            {alerts.map((alert, i) => (
              <div key={i} className="flex gap-2 rounded-lg bg-slate-900/60 p-3 border border-slate-700/40">
                {alertIcons[alert.type]}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {alert.count && <span className="font-bold text-slate-100">{alert.count} </span>}
                  {alert.message}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline funnel */}
      {funnelPipeline && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Воронка: {funnelPipeline.name}</CardTitle>
              {funnelPipeline.stages.length > 1 && (
                <Badge variant="outline">
                  Конверсия: {formatPercent(
                    (funnelPipeline.stages.at(-1)!.deals_count / Math.max(funnelPipeline.stages[0].deals_count, 1)) * 100
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {funnelPipeline.stages.map((stage, i) => {
                const width = Math.max((stage.deals_count / maxCount) * 100, 5)
                const colors = ["bg-blue-500", "bg-blue-400", "bg-indigo-400", "bg-violet-400", "bg-emerald-500"]
                return (
                  <div key={stage.id} className="flex items-center gap-3">
                    <div className="w-28 shrink-0 text-right text-xs text-slate-400 truncate">{stage.name}</div>
                    <div className="flex-1 relative h-8 bg-slate-800 rounded-md overflow-hidden">
                      <div
                        className={`h-full ${colors[i % colors.length]} opacity-80 rounded-md transition-all`}
                        style={{ width: `${width}%` }}
                      />
                      <span className="absolute inset-0 flex items-center pl-3 text-xs font-semibold text-white">
                        {stage.deals_count}
                      </span>
                    </div>
                    {i > 0 ? (
                      <div className="w-14 shrink-0 text-xs text-slate-500">
                        {formatPercent((stage.deals_count / Math.max(funnelPipeline.stages[i - 1].deals_count, 1)) * 100)}
                      </div>
                    ) : (
                      <div className="w-14" />
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  )
}
