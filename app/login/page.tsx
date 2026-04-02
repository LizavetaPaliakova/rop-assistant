"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { TrendingUp } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()

  // Login state
  const [loginUsername, setLoginUsername] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  // Register state
  const [regInviteKey, setRegInviteKey] = useState("")
  const [regName, setRegName] = useState("")
  const [regUsername, setRegUsername] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [regError, setRegError] = useState("")
  const [regSuccess, setRegSuccess] = useState("")
  const [regLoading, setRegLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError("")
    setLoginLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setLoginError(data.error ?? "Ошибка входа")
      } else {
        router.push("/dashboard")
      }
    } catch {
      setLoginError("Ошибка сети")
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegError("")
    setRegSuccess("")
    setRegLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
          name: regName,
          inviteKey: regInviteKey,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRegError(data.error ?? "Ошибка регистрации")
      } else {
        setRegSuccess("Аккаунт создан! Войдите с вашими данными.")
        setRegInviteKey("")
        setRegName("")
        setRegUsername("")
        setRegPassword("")
      }
    } catch {
      setRegError("Ошибка сети")
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/30">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-100">ROP Assistant</h1>
            <p className="text-sm text-slate-500 mt-1">Аналитика продаж · AmoCRM</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900 p-8 shadow-2xl">
          <Tabs defaultValue="login">
            <TabsList className="w-full mb-6">
              <TabsTrigger value="login" className="flex-1">Войти</TabsTrigger>
              <TabsTrigger value="register" className="flex-1">Зарегистрироваться</TabsTrigger>
            </TabsList>

            {/* Login tab */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-username" className="text-slate-300">Логин</Label>
                  <Input
                    id="login-username"
                    type="text"
                    autoComplete="username"
                    placeholder="Введите логин"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-slate-300">Пароль</Label>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Введите пароль"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                {loginError && (
                  <p className="text-sm text-red-400 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                    {loginError}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={loginLoading}>
                  {loginLoading ? "Вход..." : "Войти"}
                </Button>
              </form>
            </TabsContent>

            {/* Register tab */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-invite" className="text-slate-300">Инвайт-ключ</Label>
                  <Input
                    id="reg-invite"
                    type="text"
                    placeholder="Ключ доступа"
                    value={regInviteKey}
                    onChange={(e) => setRegInviteKey(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-name" className="text-slate-300">Имя</Label>
                  <Input
                    id="reg-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Ваше имя"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-username" className="text-slate-300">Логин</Label>
                  <Input
                    id="reg-username"
                    type="text"
                    autoComplete="username"
                    placeholder="Придумайте логин"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-password" className="text-slate-300">Пароль</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Придумайте пароль"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                </div>
                {regError && (
                  <p className="text-sm text-red-400 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                    {regError}
                  </p>
                )}
                {regSuccess && (
                  <p className="text-sm text-emerald-400 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                    {regSuccess}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={regLoading}>
                  {regLoading ? "Регистрация..." : "Создать аккаунт"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          ROP Assistant © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
