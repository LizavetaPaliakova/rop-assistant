"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { GitBranch } from "lucide-react"
import { useAmo } from "@/context/amo-context"
import { formatPercent, formatNumber, formatCurrency } from "@/lib/utils"
import type { Pipeline } from "@/lib/types"

export default function PipelinesPage() {
  const { data, isDemo } = useAmo()
  const pipelines = data.pipelines
  const [selected, setSelected] = useState<Pipeline>(pipelines[0])

  if (!selected) {
    return (
      <AppLayout title="Воронки продаж" subtitle="Мониторинг · данные из AmoCRM">
        <p className="text-sm text-slate-500">Нет данных о воронках. Подключите AmoCRM в Настройках.</p>
      </AppLayout>
    )
  }

  const activeStages = selected.stages.filter((s) => s.type !== 143)
  const totalDeals = activeStages.reduce((s, st) => s + st.deals_count, 0)

  const chartData = activeStages.map((s) => ({
    name: s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name,
    сделки: s.deals_count,
  }))

  return (
    <AppLayout title="Воронки продаж" subtitle={isDemo ? "Мониторинг · Демо-данные" : "Мониторинг · данные из AmoCRM"}>
      <div className="grid grid-cols-12 gap-4">
        {/* Left panel — pipeline list */}
        <div className="col-span-3 space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Воронки AmoCRM</p>
          {pipelines.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className={`w-full rounded-xl border p-3.5 text-left transition-all ${
                selected.id === p.id
                  ? "border-blue-500/50 bg-blue-500/10"
                  : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-slate-200">{p.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <GitBranch className="h-3 w-3 text-slate-500" />
                <span className="text-xs text-slate-500">{p.stages.length} этапов</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs text-slate-500">
                <span>В воронке: <span className="text-slate-300">{p.stages.filter(s => s.type !== 143).reduce((s, st) => s + st.deals_count, 0)}</span></span>
                <span>Продаж: <span className="text-slate-300">{p.sales_this_month}</span></span>
              </div>
            </button>
          ))}
        </div>

        {/* Right panel */}
        <div className="col-span-9 space-y-4">
          {/* Pipeline header */}
          <Card>
            <CardHeader>
              <CardTitle>{selected.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-lg bg-slate-900 p-3">
                  <p className="text-xs text-slate-500">Сейчас в воронке</p>
                  <p className="text-xl font-bold text-slate-100 mt-1">{formatNumber(totalDeals)} сд.</p>
                </div>
                <div className="rounded-lg bg-slate-900 p-3">
                  <p className="text-xs text-slate-500">Создано за месяц</p>
                  <p className="text-xl font-bold text-slate-100 mt-1">{formatNumber(selected.created_this_month)}</p>
                </div>
                <div className="rounded-lg bg-slate-900 p-3">
                  <p className="text-xs text-slate-500">Продаж за месяц</p>
                  <p className="text-xl font-bold text-slate-100 mt-1">{formatNumber(selected.sales_this_month)}</p>
                </div>
                <div className="rounded-lg bg-slate-900 p-3">
                  <p className="text-xs text-slate-500">Выручка за месяц</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(selected.revenue_this_month)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Количество сделок по этапам</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", fontSize: "12px" }}
                    labelStyle={{ color: "#94a3b8" }}
                  />
                  <Bar dataKey="сделки" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Stage breakdown table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Детализация по этапам</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border border-slate-700/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 bg-slate-900/60">
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Этап</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Сделок</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">% от общего</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeStages.map((stage) => {
                      const pct = totalDeals > 0 ? (stage.deals_count / totalDeals) * 100 : 0
                      return (
                        <tr key={stage.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-200">
                            <div className="flex items-center gap-2">
                              {stage.color && (
                                <span
                                  className="h-2.5 w-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: stage.color }}
                                />
                              )}
                              {stage.name}
                              {stage.type === 142 && (
                                <span className="ml-1 text-xs text-emerald-500">(оплата)</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-300">{stage.deals_count}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={pct > 40 ? "text-blue-400" : pct > 15 ? "text-slate-300" : "text-slate-500"}>
                              {formatPercent(pct)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
