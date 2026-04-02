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
import {
  Send, Plus, Trash2, Clock, Calendar, CheckSquare,
  MessageCircle, Play, ChevronDown, ChevronRight
} from "lucide-react"
import { mockManagers, mockPipelines } from "@/lib/mock-data"
import type { ReportSchedule } from "@/lib/types"

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
const DAY_VALUES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]

const defaultSchedules: ReportSchedule[] = [
  {
    id: "1",
    name: "Утренний дайджест",
    cron_expression: "0 9 * * MON-FRI",
    time: "09:00",
    days: ["MON", "TUE", "WED", "THU", "FRI"],
    managers_filter: [],
    pipelines_filter: [],
    include_plan: true,
    include_risks: true,
    include_top: true,
    include_ai: false,
    tg_chat_id: "",
    is_active: true,
  },
  {
    id: "2",
    name: "Недельный отчёт",
    cron_expression: "0 18 * * FRI",
    time: "18:00",
    days: ["FRI"],
    managers_filter: [],
    pipelines_filter: [],
    include_plan: true,
    include_risks: true,
    include_top: true,
    include_ai: true,
    tg_chat_id: "",
    is_active: true,
  },
]

function ScheduleCard({
  schedule,
  onToggle,
  onDelete,
  onSendNow,
}: {
  schedule: ReportSchedule
  onToggle: () => void
  onDelete: () => void
  onSendNow: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    setSending(true)
    await new Promise((r) => setTimeout(r, 1500))
    setSending(false)
    alert("Отчёт отправлен в Telegram!")
  }

  const activeDays = DAYS.filter((_, i) => schedule.days.includes(DAY_VALUES[i]))

  return (
    <Card className={schedule.is_active ? "" : "opacity-60"}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15">
              <Clock className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-sm">{schedule.name}</CardTitle>
              <CardDescription>
                {schedule.time} · {activeDays.join(", ")}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={schedule.is_active ? "success" : "secondary"}>
              {schedule.is_active ? "Активен" : "Отключён"}
            </Badge>
            <Switch checked={schedule.is_active} onCheckedChange={onToggle} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* What's included */}
        <div className="flex flex-wrap gap-2 mb-3">
          {schedule.include_plan && <Badge variant="default">📊 План/факт</Badge>}
          {schedule.include_risks && <Badge variant="warning">⚠️ Риски</Badge>}
          {schedule.include_top && <Badge variant="secondary">🏆 Топ-3</Badge>}
          {schedule.include_ai && <Badge variant="outline">🤖 AI-анализ</Badge>}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setExpanded(!expanded)}
            className="gap-1"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Настройки
          </Button>
          <Button size="sm" variant="secondary" onClick={handleSend} disabled={sending}>
            <Play className={`h-3.5 w-3.5 ${sending ? "animate-spin" : ""}`} />
            {sending ? "Отправка..." : "Отправить сейчас"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} className="ml-auto text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4 rounded-lg bg-slate-900/60 p-4 border border-slate-700/40">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Время отправки</Label>
                <Input type="time" defaultValue={schedule.time} className="w-full" />
              </div>
              <div>
                <Label className="mb-1.5 block">Telegram Chat ID</Label>
                <Input placeholder="-100xxxxxxxxx" defaultValue={schedule.tg_chat_id} />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Дни недели</Label>
              <div className="flex gap-2">
                {DAYS.map((day, i) => {
                  const active = schedule.days.includes(DAY_VALUES[i])
                  return (
                    <button
                      key={day}
                      className={`h-8 w-9 rounded-lg text-xs font-medium transition-colors ${
                        active
                          ? "bg-blue-600 text-white"
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Включить в отчёт</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "include_plan", label: "📊 Выполнение плана" },
                  { key: "include_risks", label: "⚠️ Риски и зависшие" },
                  { key: "include_top", label: "🏆 Топ-3 менеджера" },
                  { key: "include_ai", label: "🤖 AI-анализ и советы" },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                    <Switch checked={schedule[item.key as keyof ReportSchedule] as boolean} />
                    <span className="text-sm text-slate-300">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setExpanded(false)}>Отмена</Button>
              <Button size="sm" onClick={() => setExpanded(false)}>Сохранить</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ReportsPage() {
  const [schedules, setSchedules] = useState<ReportSchedule[]>(defaultSchedules)
  const [preview, setPreview] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const toggleSchedule = (id: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: !s.is_active } : s))
    )
  }

  const deleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id))
  }

  const addSchedule = () => {
    const newSchedule: ReportSchedule = {
      id: Date.now().toString(),
      name: "Новый отчёт",
      cron_expression: "0 10 * * MON",
      time: "10:00",
      days: ["MON"],
      managers_filter: [],
      pipelines_filter: [],
      include_plan: true,
      include_risks: false,
      include_top: false,
      include_ai: false,
      tg_chat_id: "",
      is_active: false,
    }
    setSchedules((prev) => [...prev, newSchedule])
  }

  const generatePreview = async () => {
    setGenerating(true)
    await new Promise((r) => setTimeout(r, 1000))
    setPreview(`📊 *Утренний дайджест | 02 апр 2026*

━━━━━━━━━━━━━━━━━━
📈 *ВЫПОЛНЕНИЕ ПЛАНА*
Иванов А. ████████░░ 94.7%
Петров В. █████░░░░░ 54.0% ⚠️
Сидорова Е. ██████████ 102% ⭐
Козлов Д. ███████░░░ 71.7%

💰 *ИТОГО ПО ОТДЕЛУ*
Выручка: 9 560 000 ₽
Сделок в работе: 127
Конверсия: 18.3%

⚠️ *РИСКИ*
• 34 сделки без активности >14 дней
• Петров В.: 0 звонков за 3 дня

🏆 *ТОП-3 СЕГОДНЯ*
1. Сидорова Е. — 102%
2. Иванов А. — 94.7%
3. Козлов Д. — 71.7%

🤖 Главный совет дня: проработайте этап КП с Петровым В.`)
    setGenerating(false)
  }

  return (
    <AppLayout title="Отчёты в Telegram" subtitle="Автоматические отчёты и расписание">
      <div className="grid grid-cols-12 gap-4">
        {/* Schedules list */}
        <div className="col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-200">Расписания</p>
              <p className="text-xs text-slate-500">{schedules.filter((s) => s.is_active).length} активных из {schedules.length}</p>
            </div>
            <Button size="sm" onClick={addSchedule}>
              <Plus className="h-4 w-4" />
              Добавить
            </Button>
          </div>

          {schedules.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              onToggle={() => toggleSchedule(schedule.id)}
              onDelete={() => deleteSchedule(schedule.id)}
              onSendNow={() => {}}
            />
          ))}
        </div>

        {/* Preview panel */}
        <div className="col-span-5 space-y-4">
          {/* Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-blue-400" />
                  Предпросмотр сообщения
                </CardTitle>
                <Button size="sm" variant="outline" onClick={generatePreview} disabled={generating}>
                  {generating ? "Генерация..." : "Сгенерировать"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {preview ? (
                <div className="rounded-xl bg-[#17212b] border border-slate-700/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">R</div>
                    <div>
                      <p className="text-xs font-medium text-slate-200">ROP Assistant</p>
                      <p className="text-xs text-slate-500">сейчас</p>
                    </div>
                  </div>
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {preview}
                  </pre>
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" className="gap-1">
                      <Send className="h-3.5 w-3.5" />
                      Отправить
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 py-12 text-center">
                  <MessageCircle className="h-8 w-8 text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500">Нажмите «Сгенерировать»</p>
                  <p className="text-xs text-slate-600">чтобы увидеть предпросмотр</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Статистика отправок</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Отправлено сегодня", value: "2" },
                { label: "За эту неделю", value: "8" },
                { label: "Последняя отправка", value: "09:03 сегодня" },
                { label: "Следующая отправка", value: "18:00 пятница" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-400">{item.label}</span>
                  <span className="text-sm font-medium text-slate-200">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
