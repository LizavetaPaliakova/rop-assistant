"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { GitBranch, Settings2, TrendingUp, CheckCircle, AlertTriangle } from "lucide-react"
import { useAmo } from "@/context/amo-context"
import { formatPercent, formatNumber, formatCurrency } from "@/lib/utils"
import type { Pipeline } from "@/lib/types"

export default function PipelinesPage() {
  const { data, isDemo } = useAmo()
  const [pipelines, setPipelines] = useState<Pipeline[]>(data.pipelines)
  const [selected, setSelected] = useState<Pipeline>(data.pipelines[0])
  const [editTarget, setEditTarget] = useState(false)
  const [targetValue, setTargetValue] = useState(selected.target_conversion.toString())

  const toggleMonitor = (id: string) => {
    setPipelines((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_monitored: !p.is_monitored } : p))
    )
  }

  const saveTarget = () => {
    const val = parseFloat(targetValue)
    if (!isNaN(val)) {
      setPipelines((prev) =>
        prev.map((p) => (p.id === selected.id ? { ...p, target_conversion: val } : p))
      )
      setSelected((prev) => ({ ...prev, target_conversion: val }))
    }
    setEditTarget(false)
  }

  const realConversion =
    (selected.stages.at(-1)!.deals_count / selected.stages[0].deals_count) * 100

  const chartData = selected.stages.map((s, i) => ({
    name: s.name.length > 10 ? s.name.slice(0, 10) + "…" : s.name,
    сделки: s.deals_count,
    конверсия: i > 0
      ? parseFloat(((s.deals_count / selected.stages[i - 1].deals_count) * 100).toFixed(1))
      : 100,
  }))

  return (
    <AppLayout title="Воронки продаж" subtitle={isDemo ? "Мониторинг и настройка · Демо-данные" : "Мониторинг · данные из AmoCRM"}>
      <div className="grid grid-cols-12 gap-4">
        {/* Left panel — pipeline list */}
        <div className="col-span-3 space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Воронки AmoCRM
          </p>
          {pipelines.map((p) => {
            const conv = (p.stages.at(-1)!.deals_count / p.stages[0].deals_count) * 100
            const isOk = conv >= p.target_conversion
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelected(p)
                  setTargetValue(p.target_conversion.toString())
                  setEditTarget(false)
                }}
                className={`w-full rounded-xl border p-3.5 text-left transition-all ${
                  selected.id === p.id
                    ? "border-blue-500/50 bg-blue-500/10"
                    : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-200">{p.name}</span>
                  <Switch
                    checked={p.is_monitored}
                    onCheckedChange={() => toggleMonitor(p.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <GitBranch className="h-3 w-3 text-slate-500" />
                  <span className="text-xs text-slate-500">{p.stages.length} этапов</span>
                  <span className="ml-auto">
                    {isOk ? (
                      <Badge variant="success">✓ {formatPercent(conv)}</Badge>
                    ) : (
                      <Badge variant="warning">↓ {formatPercent(conv)}</Badge>
                    )}
                  </span>
                </div>
                {p.is_monitored && (
                  <p className="mt-1.5 text-xs text-blue-400">Мониторинг включён</p>
                )}
              </button>
            )
          })}
        </div>

        {/* Right panel — details */}
        <div className="col-span-9 space-y-4">
          {/* Pipeline header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selected.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {selected.stages[0].deals_count} входящих лидов · {selected.stages.at(-1)!.deals_count} закрытых сделок
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {realConversion >= selected.target_conversion ? (
                    <Badge variant="success">
                      <CheckCircle className="h-3 w-3 mr-1" /> Цель достигнута
                    </Badge>
                  ) : (
                    <Badge variant="warning">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Ниже цели
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-lg bg-slate-900 p-3">
                  <p className="text-xs text-slate-500">Факт. конверсия</p>
                  <p className="text-xl font-bold text-slate-100 mt-1">{formatPercent(realConversion)}</p>
                </div>
                <div className="rounded-lg bg-slate-900 p-3">
                  <p className="text-xs text-slate-500">Целевая конверсия</p>
                  {editTarget ? (
                    <div className="flex gap-1 mt-1">
                      <Input
                        value={targetValue}
                        onChange={(e) => setTargetValue(e.target.value)}
                        className="h-7 text-sm w-16"
                        type="number"
                      />
                      <Button size="sm" onClick={saveTarget} className="h-7 px-2 text-xs">OK</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xl font-bold text-slate-100">{formatPercent(selected.target_conversion)}</p>
                      <button onClick={() => setEditTarget(true)} className="text-slate-500 hover:text-slate-300">
                        <Settings2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="rounded-lg bg-slate-900 p-3">
                  <p className="text-xs text-slate-500">Всего лидов</p>
                  <p className="text-xl font-bold text-slate-100 mt-1">{formatNumber(selected.stages[0].deals_count)}</p>
                </div>
                <div className="rounded-lg bg-slate-900 p-3">
                  <p className="text-xs text-slate-500">Выручка (КП+)</p>
                  <p className="text-xl font-bold text-slate-100 mt-1">
                    {formatCurrency(selected.stages.reduce((s, st) => s + st.revenue, 0))}
                  </p>
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

          {/* Stages table */}
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
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Конверсия</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Выручка</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-400">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.stages.map((stage, i) => {
                      const stageConv = i > 0
                        ? (stage.deals_count / selected.stages[i - 1].deals_count) * 100
                        : 100
                      const dropped = i > 0
                        ? selected.stages[i - 1].deals_count - stage.deals_count
                        : 0

                      return (
                        <tr key={stage.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-200">{stage.name}</td>
                          <td className="px-4 py-3 text-right text-slate-300">{stage.deals_count}</td>
                          <td className="px-4 py-3 text-right">
                            {i > 0 ? (
                              <span className={stageConv < 30 ? "text-red-400" : stageConv < 60 ? "text-amber-400" : "text-emerald-400"}>
                                {formatPercent(stageConv)}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-400">
                            {stage.revenue > 0 ? formatCurrency(stage.revenue) : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {dropped > 5 ? (
                              <Badge variant="danger">-{dropped} отсеялось</Badge>
                            ) : i === selected.stages.length - 1 ? (
                              <Badge variant="success">Финал</Badge>
                            ) : (
                              <Badge variant="secondary">Норма</Badge>
                            )}
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
