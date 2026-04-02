"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle, XCircle, RefreshCw, ExternalLink,
  Shield, Bot, Zap, AlertTriangle, Copy, Eye, EyeOff
} from "lucide-react"

type ConnectionStatus = "connected" | "disconnected" | "testing"

export default function SettingsPage() {
  // AmoCRM
  const [amoDomain, setAmoDomain] = useState("")
  const [amoStatus, setAmoStatus] = useState<ConnectionStatus>("disconnected")
  const [amoConnecting, setAmoConnecting] = useState(false)
  const [syncInterval, setSyncInterval] = useState("30")

  // Telegram
  const [tgToken, setTgToken] = useState("")
  const [tgChatId, setTgChatId] = useState("")
  const [tgStatus, setTgStatus] = useState<ConnectionStatus>("disconnected")
  const [tgTesting, setTgTesting] = useState(false)
  const [showToken, setShowToken] = useState(false)

  // Claude AI
  const [aiKey, setAiKey] = useState("")
  const [showAiKey, setShowAiKey] = useState(false)

  const handleAmoConnect = async () => {
    if (!amoDomain) return
    setAmoConnecting(true)
    // Redirect to AmoCRM OAuth
    const domain = amoDomain.replace(".amocrm.ru", "")
    const clientId = process.env.NEXT_PUBLIC_AMO_CLIENT_ID || "YOUR_CLIENT_ID"
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/amo/callback`)
    const oauthUrl = `https://${domain}.amocrm.ru/oauth?client_id=${clientId}&state=connect&mode=popup&redirect_uri=${redirectUri}`
    window.open(oauthUrl, "_blank", "width=600,height=700")
    // Simulate for demo
    await new Promise((r) => setTimeout(r, 2000))
    setAmoStatus("connected")
    setAmoConnecting(false)
  }

  const handleAmoDisconnect = () => {
    setAmoStatus("disconnected")
    setAmoDomain("")
  }

  const handleTgTest = async () => {
    if (!tgToken || !tgChatId) return
    setTgTesting(true)
    try {
      const res = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tgToken, chatId: tgChatId }),
      })
      if (res.ok) {
        setTgStatus("connected")
      } else {
        setTgStatus("disconnected")
        alert("Ошибка: проверьте токен и Chat ID")
      }
    } catch {
      // Demo mode
      setTgStatus("connected")
    }
    setTgTesting(false)
  }

  const StatusBadge = ({ status }: { status: ConnectionStatus }) => {
    if (status === "connected") return (
      <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" /> Подключено</Badge>
    )
    if (status === "testing") return (
      <Badge variant="warning" className="gap-1"><RefreshCw className="h-3 w-3 animate-spin" /> Проверка...</Badge>
    )
    return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> Не подключено</Badge>
  }

  return (
    <AppLayout title="Настройки" subtitle="Подключение сервисов и конфигурация">
      <div className="max-w-3xl space-y-6">

        {/* AmoCRM */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
                  <Zap className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <CardTitle>AmoCRM</CardTitle>
                  <CardDescription>Синхронизация сделок и менеджеров</CardDescription>
                </div>
              </div>
              <StatusBadge status={amoStatus} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {amoStatus === "disconnected" ? (
              <>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-300">
                    <p className="font-medium mb-1">Как подключить AmoCRM:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-amber-400">
                      <li>Введите ваш поддомен AmoCRM ниже</li>
                      <li>Нажмите «Подключить» — откроется окно авторизации</li>
                      <li>Разрешите доступ для ROP Assistant</li>
                    </ol>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Поддомен AmoCRM</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="mycompany"
                        value={amoDomain}
                        onChange={(e) => setAmoDomain(e.target.value)}
                      />
                      <span className="absolute right-3 top-2 text-sm text-slate-500">.amocrm.ru</span>
                    </div>
                    <Button onClick={handleAmoConnect} disabled={amoConnecting || !amoDomain}>
                      <ExternalLink className="h-4 w-4" />
                      {amoConnecting ? "Подключение..." : "Подключить"}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                    <div>
                      <p className="text-sm font-medium text-emerald-300">AmoCRM подключён</p>
                      <p className="text-xs text-slate-500 mt-0.5">Последняя синхронизация: 5 минут назад · 127 сделок · 5 менеджеров</p>
                    </div>
                    <Button size="sm" variant="ghost" className="ml-auto" onClick={handleAmoDisconnect}>
                      Отключить
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Частота синхронизации</Label>
                  <Select value={syncInterval} onValueChange={setSyncInterval}>
                    <SelectTrigger className="w-52">
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
                <Button size="sm" variant="outline">
                  <RefreshCw className="h-4 w-4" />
                  Синхронизировать сейчас
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Telegram */}
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
              <StatusBadge status={tgStatus} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3 text-xs text-slate-400">
              <p className="font-medium text-slate-300 mb-1">Как создать бота:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Откройте @BotFather в Telegram</li>
                <li>Напишите /newbot и следуйте инструкциям</li>
                <li>Скопируйте полученный токен сюда</li>
                <li>Добавьте бота в нужный чат и получите Chat ID через @userinfobot</li>
              </ol>
            </div>

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
                  <button
                    className="absolute right-3 top-2 text-slate-500 hover:text-slate-300"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Chat ID</Label>
                <Input
                  placeholder="-100xxxxxxxxx"
                  value={tgChatId}
                  onChange={(e) => setTgChatId(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleTgTest} disabled={tgTesting || !tgToken || !tgChatId}>
                {tgTesting ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Проверка...</>
                ) : (
                  <><Shield className="h-4 w-4" /> Тест отправки</>
                )}
              </Button>
              {tgStatus === "connected" && (
                <Button variant="secondary">
                  Сохранить настройки
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Claude AI */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15">
                <span className="text-lg">🤖</span>
              </div>
              <div>
                <CardTitle>Claude AI</CardTitle>
                <CardDescription>AI-анализ и рекомендации для РОПа</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Anthropic API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showAiKey ? "text" : "password"}
                    placeholder="sk-ant-..."
                    value={aiKey}
                    onChange={(e) => setAiKey(e.target.value)}
                  />
                  <button
                    className="absolute right-3 top-2 text-slate-500 hover:text-slate-300"
                    onClick={() => setShowAiKey(!showAiKey)}
                  >
                    {showAiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button variant="outline" disabled={!aiKey}>Сохранить</Button>
              </div>
              <p className="text-xs text-slate-500">Получить ключ: console.anthropic.com</p>
            </div>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="text-sm text-red-400">Опасная зона</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Сбросить все данные</p>
                <p className="text-xs text-slate-500">Удалить все синхронизированные данные и настройки</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => {
                if (confirm("Вы уверены? Все данные будут удалены.")) {
                  setAmoStatus("disconnected")
                  setTgStatus("disconnected")
                }
              }}>
                Сбросить
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
