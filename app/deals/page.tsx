"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useAmo } from "@/context/amo-context"
import { formatCurrency } from "@/lib/utils"
import type { AmoPipeline, AmoLead, AmoUser } from "@/lib/amo/client"
import { ExternalLink, Loader2 } from "lucide-react"

interface DealsResult {
  leads: AmoLead[]
  pipelines: AmoPipeline[]
  users: AmoUser[]
}

function toUnixTimestamp(dateStr: string): string {
  return String(Math.floor(new Date(dateStr).getTime() / 1000))
}

export default function DealsPage() {
  const { connection, data, isDemo } = useAmo()

  const [pipelineId, setPipelineId] = useState("")
  const [managerId, setManagerId] = useState("")
  const [statusId, setStatusId] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const [result, setResult] = useState<DealsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Get statuses for selected pipeline (from context pipelines if available, otherwise from result)
  const selectedPipelineObj = result?.pipelines.find((p) => String(p.id) === pipelineId)
  const statuses = selectedPipelineObj?._embedded?.statuses ?? []

  // Filter options from context
  const pipelines = data.pipelines
  const managers = data.managers

  async function fetchDeals() {
    if (!connection.connected) {
      setError("AmoCRM не подключён. Перейдите в Настройки.")
      return
    }
    setError("")
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (pipelineId && pipelineId !== "all") params.set("pipelineId", pipelineId)
      if (managerId && managerId !== "all") params.set("managerId", managerId)
      if (statusId && statusId !== "all") params.set("statusId", statusId)
      if (dateFrom) params.set("dateFrom", toUnixTimestamp(dateFrom))
      if (dateTo) params.set("dateTo", toUnixTimestamp(dateTo))

      const res = await fetch(`/api/amo/deals?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Ошибка загрузки сделок")
        return
      }
      const data: DealsResult = await res.json()
      setResult(data)
    } catch {
      setError("Ошибка сети")
    } finally {
      setLoading(false)
    }
  }

  function getPipelineName(pipelineIdNum: number): string {
    if (result) {
      const p = result.pipelines.find((p) => p.id === pipelineIdNum)
      if (p) return p.name
    }
    return String(pipelineIdNum)
  }

  function getStatusName(pipelineIdNum: number, statusIdNum: number): string {
    if (result) {
      const p = result.pipelines.find((p) => p.id === pipelineIdNum)
      if (p) {
        const s = p._embedded?.statuses?.find((s) => s.id === statusIdNum)
        if (s) return s.name
      }
    }
    return String(statusIdNum)
  }

  function getManagerName(userId: number): string {
    if (result) {
      const u = result.users.find((u) => u.id === userId)
      if (u) return u.name
    }
    return String(userId)
  }

  function formatDate(unix: number): string {
    return new Date(unix * 1000).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  // When pipeline changes, reset status
  function handlePipelineChange(val: string) {
    setPipelineId(val)
    setStatusId("")
  }

  const domain = connection.domain

  return (
    <AppLayout
      title="Сделки"
      subtitle={isDemo ? "Список сделок · Демо-режим (подключите AmoCRM)" : "Список сделок · данные из AmoCRM"}
    >
      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {/* Pipeline */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Воронка</Label>
              <Select value={pipelineId} onValueChange={handlePipelineChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Все воронки" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все воронки</SelectItem>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Manager */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Менеджер</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Все менеджеры" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все менеджеры</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={String(m.amo_id)}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status (depends on pipeline from result or context) */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Статус</Label>
              <Select value={statusId} onValueChange={setStatusId} disabled={!statuses.length}>
                <SelectTrigger>
                  <SelectValue placeholder={statuses.length ? "Все статусы" : "Выберите воронку"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date from */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Дата от</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Date to */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Дата до</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={fetchDeals} disabled={loading || !connection.connected}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Загрузка...
                </>
              ) : (
                "Применить"
              )}
            </Button>
            {!connection.connected && (
              <p className="text-xs text-amber-400">AmoCRM не подключён</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Results table */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Результаты{" "}
              <span className="text-slate-500 font-normal">
                ({result.leads.length} сделок)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {result.leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <p className="text-sm">Сделки не найдены</p>
                <p className="text-xs mt-1">Попробуйте изменить фильтры</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 bg-slate-900/60">
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Название</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Статус</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Воронка</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Менеджер</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Сумма</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Дата создания</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.leads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          {domain ? (
                            <a
                              href={`https://${domain}.amocrm.ru/leads/detail/${lead.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline"
                            >
                              {lead.name || `Сделка #${lead.id}`}
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-slate-200">{lead.name || `Сделка #${lead.id}`}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {getStatusName(lead.pipeline_id, lead.status_id)}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {getPipelineName(lead.pipeline_id)}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {getManagerName(lead.responsible_user_id)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {lead.price > 0 ? formatCurrency(lead.price) : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {formatDate(lead.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!result && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-600">
          <p className="text-sm">Выберите фильтры и нажмите «Применить»</p>
        </div>
      )}
    </AppLayout>
  )
}
