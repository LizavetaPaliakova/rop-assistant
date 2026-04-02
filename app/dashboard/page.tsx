"use client"

import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts"
import {
  TrendingUp, TrendingDown, DollarSign, Target,
  Clock, AlertTriangle, AlertCircle, Info
} from "lucide-react"
import { mockDealsActivity } from "@/lib/mock-data"
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils"
import { useState } from "react"
import { useAmo } from "@/context/amo-context"
import { RefreshCw } from "lucide-react"

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
  const [period, setPeriod] = useState("month")
  const [pipeline, setPipeline] = useState("all")
  const { data, isDemo, isSyncing } = useAmo()

  const stats = data.stats
  const mockAiAlerts = data.alerts
  const mockWeeklyData = data.weeklyData
  const mockPipelines = data.pipelines

  const statCards = [
    {
      label: "Сделок в работе",
      value: formatNumber(stats.total_deals),
      delta: `+${stats.deals_delta}%`,
      positive: true,
      icon: Target,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Выручка за период",
      value: formatCurrency(stats.total_revenue),
      delta: `+${stats.revenue_delta}%`,
      positive: true,
      icon: DollarSign,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Конверсия воронки",
      value: formatPercent(stats.conversion),
      delta: `${stats.conversion_delta}%`,
      positive: false,
      icon: TrendingDown,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Ср. цикл сделки",
      value: `${stats.avg_deal_days} дней`,
      delta: "-2 дня",
      positive: true,
      icon: Clock,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
  ]

  const funnelPipeline = mockPipelines.find((p) => p.id === "1")!
  const maxCount = Math.max(...funnelPipeline.stages.map((s) => s.deals_count))

  const alertIcons = {
    danger: <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />,
    warning: <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />,
    info: <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
  }

  return (
    <AppLayout
      title="Дашборд"
      subtitle={isDemo ? "Сводная аналитика · Демо-режим (подключите AmoCRM в Настройках)" : "Сводная аналитика · данные из AmoCRM"}
    >
      {/* Filters */}
      <div className="mb-6 flex items-center gap-3">
        <Select value={pipeline} onValueChange={setPipeline}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Все воронки" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все воронки</SelectItem>
            {mockPipelines.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Неделя</SelectItem>
            <SelectItem value="month">Месяц</SelectItem>
            <SelectItem value="quarter">Квартал</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">{card.label}</p>
                    <p className="text-2xl font-bold text-slate-100">{card.value}</p>
                    <div className="mt-1 flex items-center gap-1">
                      {card.positive
                        ? <TrendingUp className="h-3 w-3 text-emerald-400" />
                        : <TrendingDown className="h-3 w-3 text-red-400" />}
                      <span className={`text-xs font-medium ${card.positive ? "text-emerald-400" : "text-red-400"}`}>
                        {card.delta} vs пр. мес.
                      </span>
                    </div>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Revenue chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Динамика сделок по неделям</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={mockWeeklyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDeals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
                <Area type="monotone" dataKey="deals" name="Сделки" stroke="#3b82f6" fill="url(#colorDeals)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="calls" name="Звонки" stroke="#10b981" fill="url(#colorRevenue)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Активность за неделю</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={mockDealsActivity} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="won" name="Выиграно" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="lost" name="Проиграно" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Funnel */}
        <Card className="col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Воронка: {funnelPipeline.name}</CardTitle>
              <Badge variant="outline">
                Конверсия: {formatPercent((funnelPipeline.stages.at(-1)!.deals_count / funnelPipeline.stages[0].deals_count) * 100)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {funnelPipeline.stages.map((stage, i) => {
                const width = Math.max((stage.deals_count / maxCount) * 100, 15)
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
                    {i > 0 && (
                      <div className="w-14 shrink-0 text-xs text-slate-500">
                        {formatPercent((stage.deals_count / funnelPipeline.stages[i - 1].deals_count) * 100)}
                      </div>
                    )}
                    {i === 0 && <div className="w-14" />}
                  </div>
                )
              })}
            </div>
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
            {mockAiAlerts.map((alert, i) => (
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
    </AppLayout>
  )
}
