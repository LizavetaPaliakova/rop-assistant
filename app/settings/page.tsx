"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CheckCircle, XCircle, RefreshCw, ExternalLink,
  Shield, Bot, Zap, Eye, EyeOff, Unplug,
} from "lucide-react"
import { useAmo } from "@/context/amo-context"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { UserSettings } from "@/lib/settings/storage"

type TgStatus = "idle" | "testing" | "connected" | "error"
type AmoConnectMode = "token" | "oauth"

const DEFAULT_SETTINGS: UserSettings = {
  selectedPipelineIds: [],
  paymentStatusIds: [],
  activeStatusIds: [],
  monthlyPlan: 0,
  managerPlans: {},
}

function SettingsContent() {
  const { connection, data, isSyncing, sync, disconnect, refreshConnection } = useAmo()
  const searchParams = useSearchParams()

  // AmoCRM
  const [connectMode, setConnectMode] = useState<AmoConnectMode>("token")
  const [amoDomain, setAmoDomain] = useState("")
  const [amoToken, setAmoToken] = useState("")
  const [showAmoToken, setShowAmoToken] = useState(false)
  const [amoConnecting, setAmoConnecting] = useState(false)
  const [syncInterval, setSyncInterval] = useState("30")
  const [amoError, setAmoError] = useState<string | null>(null)

  // Telegram
  const [tgToken, setTgToken] = useState("")
  const [tgChatId, setTgChatId] = useState("")
  const [tgStatus, setTgStatus] = useState<TgStatus>("idle")
  const [showToken, setShowToken] = useState(false)

  // Claude AI
  const [aiKey, setAiKey] = useState("")
  const [showAiKey, setShowAiKey] = useState(false)
  const [aiSaved, setAiSaved] = useState(false)

  // User settings from Redis
  const [appSettings, setAppSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [monthlyPlanInput, setMonthlyPlanInput] = useState("0")

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s: UserSettings) => {
        setAppSettings(s)
        setMonthlyPlanInput(String(s.monthlyPlan || 0))
      })
      .catch(() => {})
  }, [])

  const handleSaveSettings = async () => {
    setSettingsSaving(true)
    try {
      const updated = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...appSettings,
          monthlyPlan: parseInt(monthlyPlanInput || "0", 10) || 0,
        }),
      }).then((r) => r.json())
      setAppSettings(updated)
    } catch {}
    setSettingsSaving(false)
  }

  const togglePipelineId = (id: number) => {
    setAppSettings((prev) => {
      const ids = prev.selectedPipelineIds.includes(id)
        ? prev.selectedPipelineIds.filter((x) => x !== id)
        : [...prev.selectedPipelineIds, id]
      return { ...prev, selectedPipelineIds: ids }
    })
  }

  const togglePaymentStatus = (id: number) => {
    setAppSettings((prev) => {
      const ids = prev.paymentStatusIds.includes(id)
        ? prev.paymentStatusIds.filter((x) => x !== id)
        : [...prev.paymentStatusIds, id]
      return { ...prev, paymentStatusIds: ids }
    })
  }

  const toggleActiveStatus = (id: number) => {
    setAppSettings((prev) => {
      const ids = prev.activeStatusIds.includes(id)
        ? prev.activeStatusIds.filter((x) => x !== id)
        : [...prev.activeStatusIds, id]
      return { ...prev, activeStatusIds: ids }
    })
  }

  const relevantPipelines = appSettings.selectedPipelineIds.length > 0
    ? data.pipelines.filter((p) => appSettings.selectedPipelineIds.includes(p.amo_id))
    : data.pipelines

  useEffect(() => {
    const connected = searchParams.get("amo_connected")
    const error = searchParams.get("error")
    const msg = searchParams.get("msg")

    if (connected === "1") {
      refreshConnection()
      window.history.replaceState({}, "", "/settings")
    }
    if (error) {
      const msgs: Record<string, string> = {
        missing_params: "Не получены параметры авторизации",
        oauth_failed: msg ? decodeURIComponent(msg) : "Ошибка OAuth авторизации",
      }
      setAmoError(msgs[error] || error)
      window.history.replaceState({}, "", "/settings")
    }
  }, [searchParams, refreshConnection])

  const handleAmoConnectToken = async () => {
    const domain = amoDomain.trim().replace(/\.amocrm\.ru$/, "")
    const token = amoToken.trim()
    if (!domain || !token) return
    setAmoConnecting(true)
    setAmoError(null)
    try {
      const res = await fetch("/api/amo/connect-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, token }),
      })
      const body = await res.json()
      if (!res.ok) {
        setAmoError(body.error || "Ошибка подключения")
      } else {
        await refreshConnection()
        await sync()
      }
    } catch (e) {
      setAmoError((e as Error).message)
    } finally {
      setAmoConnecting(false)
    }
  }

  const handleAmoConnectOAuth = () => {
    if (!amoDomain.trim()) return
    setAmoConnecting(true)
    setAmoError(null)
    const domain = amoDomain.trim().replace(/\.amocrm\.ru$/, "")
    const clientId = process.env.NEXT_PUBLIC_AMO_CLIENT_ID
    if (!clientId) {
      setAmoError("NEXT_PUBLIC_AMO_CLIENT_ID не задан в .env.local")
      setAmoConnecting(false)
      return
    }
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/amo/callback`)
    const oauthUrl = `https://${domain}.amocrm.ru/oauth?client_id=${clientId}&state=connect&mode=popup&redirect_uri=${redirectUri}`
    const popup = window.open(oauthUrl, "amo_oauth", "width=650,height=750,left=200,top=100")
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer)
        setAmoConnecting(false)
        refreshConnection()
      }
    }, 800)
  }

  const handleDisconnect = async () => {
    if (!confirm("Отключить AmoCRM? Данные в приложении останутся в демо-режиме.")) return
    await disconnect()
  }

  const handleTgTest = async () => {
    if (!tgToken.trim() || !tgChatId.trim()) return
    setTgStatus("testing")
    try {
      const res = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tgToken, chatId: tgChatId }),
      })
      setTgStatus(res.ok ? "connected" : "error")
    } catch {
      setTgStatus("error")
    }
  }

  const handleSaveAiKey = () => {
    localStorage.setItem("anthropic_api_key", aiKey)
    setAiSaved(true)
    setTimeout(() => setAiSaved(false), 2000)
  }

  useEffect(() => {
    const saved = localStorage.getItem("anthropic_api_key")
    if (saved) setAiKey(saved)
  }, [])

  const StatusBadge = ({ ok }: { ok: boolean }) =>
    ok ? (
      <Badge variant="success" className="gap-1">
        <CheckCircle className="h-3 w-3" /> Подключено
      </Badge>
    ) : (
      <Badge variant="secondary" className="gap-1">
        <XCircle className="h-3 w-3" /> Не подключено
      </Badge>
    )

  return (
    <AppLayout title="Настройки" subtitle="Подключение сервисов и конфигурация">
      <div className="max-w-3xl space-y-6">

        {/* ── AmoCRM ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
                  <Zap className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <CardTitle>AmoCRM</CardTitle>
                  <CardDescription>OAuth2 интеграция · синхронизация сделок и менеджеров</CardDescription>
                </div>
              </div>
              <StatusBadge ok={connection.connected} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!connection.connected && (
              <>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConnectMode("token")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      connectMode === "token"
                        ? "border-blue-500/50 bg-blue-500/10 text-blue-300"
                        : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    Долгосрочный токен
                  </button>
                  <button
                    onClick={() => setConnectMode("oauth")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      connectMode === "oauth"
                        ? "border-blue-500/50 bg-blue-500/10 text-blue-300"
                        : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    <ExternalLink className="inline h-3.5 w-3.5 mr-1" />OAuth 2.0
                  </button>
                </div>

                {amoError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                    <b>Ошибка:</b> {amoError}
                  </div>
                )}

                {connectMode === "token" && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3 text-xs text-slate-400">
                      AmoCRM → Настройки → Интеграции → ваша интеграция → вкладка <b className="text-slate-300">«Ключи и токены»</b> → скопируйте <b className="text-slate-300">Долгосрочный токен доступа</b>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Поддомен AmoCRM</Label>
                      <div className="relative">
                        <Input
                          placeholder="mycompany"
                          value={amoDomain}
                          onChange={(e) => setAmoDomain(e.target.value)}
                        />
                        <span className="absolute right-3 top-2 text-sm text-slate-500">.amocrm.ru</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Долгосрочный токен</Label>
                      <div className="relative">
                        <Input
                          type={showAmoToken ? "text" : "password"}
                          placeholder="eyJ0eXAiOiJKV1Qi..."
                          value={amoToken}
                          onChange={(e) => setAmoToken(e.target.value)}
                        />
                        <button
                          className="absolute right-3 top-2 text-slate-500 hover:text-slate-300"
                          onClick={() => setShowAmoToken(!showAmoToken)}
                        >
                          {showAmoToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button
                      onClick={handleAmoConnectToken}
                      disabled={amoConnecting || !amoDomain.trim() || !amoToken.trim()}
                      className="w-full"
                    >
                      {amoConnecting
                        ? <><RefreshCw className="h-4 w-4 animate-spin" /> Подключение...</>
                        : <><CheckCircle className="h-4 w-4" /> Подключить</>}
                    </Button>
                  </div>
                )}

                {connectMode === "oauth" && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400">
                      Нужны <b className="text-amber-300">Client ID</b> и <b className="text-amber-300">Client Secret</b> из настроек интеграции AmoCRM
                    </div>
                    <div className="space-y-1.5">
                      <Label>Поддомен AmoCRM</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            placeholder="mycompany"
                            value={amoDomain}
                            onChange={(e) => setAmoDomain(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAmoConnectOAuth()}
                          />
                          <span className="absolute right-3 top-2 text-sm text-slate-500">.amocrm.ru</span>
                        </div>
                        <Button onClick={handleAmoConnectOAuth} disabled={amoConnecting || !amoDomain.trim()}>
                          <ExternalLink className="h-4 w-4" />
                          {amoConnecting ? "Ожидание..." : "Открыть OAuth"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {connection.connected && (
              <>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-emerald-300">
                        AmoCRM подключён · {connection.domain}.amocrm.ru
                      </p>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                        {connection.lastSyncAt && (
                          <span>Последняя синхр.: {new Date(connection.lastSyncAt).toLocaleTimeString("ru-RU")}</span>
                        )}
                        {connection.leadsCount > 0 && <span>{connection.leadsCount} сделок</span>}
                        {connection.managersCount > 0 && <span>{connection.managersCount} менеджеров</span>}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-red-400 shrink-0" onClick={handleDisconnect}>
                      <Unplug className="h-3.5 w-3.5" />
                      Отключить
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 max-w-[200px] space-y-1.5">
                    <Label>Частота синхронизации</Label>
                    <Select value={syncInterval} onValueChange={setSyncInterval}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Каждые 5 минут</SelectItem>
                        <SelectItem value="15">Каждые 15 минут</SelectItem>
                        <SelectItem value="30">Каждые 30 минут</SelectItem>
                        <SelectItem value="60">Каждый час</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-6">
                    <Button variant="outline" size="sm" onClick={() => sync()} disabled={isSyncing}>
                      <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                      {isSyncing ? "Синхронизация..." : "Синхронизировать сейчас"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Analytics settings (only when connected) ── */}
        {connection.connected && data.pipelines.length > 0 && (
          <>
            {/* Section A: Воронки для аналитики */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-lg">
                    <span className="text-blue-400 font-bold text-sm">V</span>
                  </div>
                  <div>
                    <CardTitle>Воронки для аналитики</CardTitle>
                    <CardDescription>Выберите воронки, которые включаются в расчёты</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.pipelines.map((pipeline) => (
                  <div
                    key={pipeline.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 transition-colors",
                      appSettings.selectedPipelineIds.includes(pipeline.amo_id)
                        ? "bg-slate-800/40"
                        : "bg-slate-900/40 opacity-60"
                    )}
                  >
                    <span className="text-sm text-slate-200">{pipeline.name}</span>
                    <Switch
                      checked={appSettings.selectedPipelineIds.includes(pipeline.amo_id)}
                      onCheckedChange={() => togglePipelineId(pipeline.amo_id)}
                    />
                  </div>
                ))}
                <p className="text-xs text-slate-500 pt-1">
                  Если ничего не выбрано — используются все воронки
                </p>
              </CardContent>
            </Card>

            {/* Section B: Статусы оплаты */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-lg">
                    <span className="text-emerald-400 font-bold text-sm">₽</span>
                  </div>
                  <div>
                    <CardTitle>Статусы оплаты</CardTitle>
                    <CardDescription>Сделки в этих статусах считаются оплатой и включаются в выручку</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {relevantPipelines.map((pipeline) => (
                  <div key={pipeline.id} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{pipeline.name}</p>
                    <div className="space-y-1">
                      {pipeline.stages.map((stage) => (
                        <div
                          key={stage.id}
                          className={cn(
                            "flex items-center justify-between rounded-lg px-3 py-2 transition-colors",
                            appSettings.paymentStatusIds.includes(stage.amo_id)
                              ? "bg-emerald-500/10"
                              : "bg-slate-900/40 opacity-60"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: stage.color || "#64748b" }}
                            />
                            <span className="text-sm text-slate-200">{stage.name}</span>
                          </div>
                          <Switch
                            checked={appSettings.paymentStatusIds.includes(stage.amo_id)}
                            onCheckedChange={() => togglePaymentStatus(stage.amo_id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Section C: Активные сделки */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-lg">
                    <span className="text-amber-400 font-bold text-sm">A</span>
                  </div>
                  <div>
                    <CardTitle>Активные сделки</CardTitle>
                    <CardDescription>Сделки в этих статусах отображаются как активные</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {relevantPipelines.map((pipeline) => (
                  <div key={pipeline.id} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{pipeline.name}</p>
                    <div className="space-y-1">
                      {pipeline.stages.filter((s) => s.type !== 143).map((stage) => (
                        <div
                          key={stage.id}
                          className={cn(
                            "flex items-center justify-between rounded-lg px-3 py-2 transition-colors",
                            appSettings.activeStatusIds.includes(stage.amo_id)
                              ? "bg-amber-500/10"
                              : "bg-slate-900/40 opacity-60"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: stage.color || "#64748b" }}
                            />
                            <span className="text-sm text-slate-200">{stage.name}</span>
                          </div>
                          <Switch
                            checked={appSettings.activeStatusIds.includes(stage.amo_id)}
                            onCheckedChange={() => toggleActiveStatus(stage.amo_id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="text-xs text-slate-500 pt-1">
                  Если ничего не выбрано — все незакрытые сделки считаются активными
                </p>
              </CardContent>
            </Card>

            {/* Section D: План на месяц */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-lg">
                    <span className="text-violet-400 font-bold text-sm">П</span>
                  </div>
                  <div>
                    <CardTitle>План на месяц</CardTitle>
                    <CardDescription>Общий план команды по выручке</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 max-w-xs">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      placeholder="0"
                      value={monthlyPlanInput}
                      onChange={(e) => setMonthlyPlanInput(e.target.value)}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-2 text-sm text-slate-500">₽</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save button */}
            <div>
              <Button onClick={handleSaveSettings} disabled={settingsSaving} className="w-full max-w-xs">
                {settingsSaving ? <><RefreshCw className="h-4 w-4 animate-spin" /> Сохранение...</> : "Сохранить настройки"}
              </Button>
            </div>
          </>
        )}

        {/* ── Telegram ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15">
                  <Bot className="h-5 w-5 text-sky-400" />
                </div>
                <div>
                  <CardTitle>Telegram Bot</CardTitle>
                  <CardDescription>Отправка отчётов и уведомлений</CardDescription>
                </div>
              </div>
              <StatusBadge ok={tgStatus === "connected"} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Bot Token</Label>
                <div className="relative">
                  <Input
                    type={showToken ? "text" : "password"}
                    placeholder="1234567890:AABcDe..."
                    value={tgToken}
                    onChange={(e) => setTgToken(e.target.value)}
                  />
                  <button className="absolute right-3 top-2 text-slate-500 hover:text-slate-300" onClick={() => setShowToken(!showToken)}>
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Chat ID</Label>
                <Input placeholder="-100xxxxxxxxx" value={tgChatId} onChange={(e) => setTgChatId(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleTgTest} disabled={tgStatus === "testing" || !tgToken || !tgChatId}>
                {tgStatus === "testing"
                  ? <><RefreshCw className="h-4 w-4 animate-spin" /> Проверка...</>
                  : <><Shield className="h-4 w-4" /> Тест отправки</>}
              </Button>
              {tgStatus === "error" && (
                <span className="flex items-center gap-1 text-xs text-red-400">
                  <XCircle className="h-3.5 w-3.5" /> Ошибка — проверьте токен и Chat ID
                </span>
              )}
              {tgStatus === "connected" && (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <CheckCircle className="h-3.5 w-3.5" /> Сообщение отправлено успешно!
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Claude AI ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-lg">AI</div>
              <div>
                <CardTitle>Claude AI</CardTitle>
                <CardDescription>AI-анализ и рекомендации по команде</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Anthropic API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showAiKey ? "text" : "password"}
                    placeholder="sk-ant-api03-..."
                    value={aiKey}
                    onChange={(e) => setAiKey(e.target.value)}
                  />
                  <button className="absolute right-3 top-2 text-slate-500 hover:text-slate-300" onClick={() => setShowAiKey(!showAiKey)}>
                    {showAiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button variant="outline" onClick={handleSaveAiKey} disabled={!aiKey}>
                  {aiSaved ? <><CheckCircle className="h-4 w-4 text-emerald-400" /> Сохранено</> : "Сохранить"}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Получить ключ: <b>console.anthropic.com</b> → API Keys
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Danger zone ── */}
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="text-sm text-red-400">Опасная зона</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Сбросить подключение</p>
                <p className="text-xs text-slate-500">Удалить токены AmoCRM и вернуться в демо-режим</p>
              </div>
              <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                Сбросить
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  )
}
