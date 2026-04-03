"use client"
import { signIn, useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [step, setStep] = useState<"signin" | "invite" | "loading">("loading")
  const [inviteKey, setInviteKey] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (status === "loading") return
    if (!session) { setStep("signin"); return }

    // Check if already verified
    fetch("/api/auth/verify-invite")
      .then(r => r.json())
      .then(data => {
        if (data.verified) router.push("/dashboard")
        else setStep("invite")
      })
  }, [session, status, router])

  const handleInvite = async () => {
    if (!inviteKey.trim()) return
    setChecking(true)
    setError(null)
    const res = await fetch("/api/auth/verify-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteKey: inviteKey.trim() }),
    })
    const data = await res.json()
    if (res.ok) router.push("/dashboard")
    else { setError(data.error); setChecking(false) }
  }

  // Loading state
  if (step === "loading") return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl font-bold text-white mb-4">↗</div>
          <h1 className="text-2xl font-bold text-slate-100">ROP Assistant</h1>
          <p className="text-slate-400 text-sm mt-1">Аналитика продаж · AmoCRM</p>
        </div>

        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 backdrop-blur">
          {step === "signin" && (
            <div className="space-y-4">
              <p className="text-center text-sm text-slate-400">Войдите через корпоративный Google аккаунт</p>
              <button
                onClick={() => signIn("google", { callbackUrl: "/login" })}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-100 hover:bg-slate-700 transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Войти через Google
              </button>
            </div>
          )}

          {step === "invite" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 mb-3">
                  {session?.user?.image && <img src={session.user.image} className="h-10 w-10 rounded-full" alt="" />}
                </div>
                <p className="text-sm font-medium text-slate-200">{session?.user?.name}</p>
                <p className="text-xs text-slate-500">{session?.user?.email}</p>
              </div>
              <div className="border-t border-slate-700/50 pt-4">
                <p className="text-sm text-slate-400 mb-3 text-center">Введите ключ доступа</p>
                <input
                  type="text"
                  placeholder="Ключ доступа"
                  value={inviteKey}
                  onChange={e => setInviteKey(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleInvite()}
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
                {error && <p className="mt-2 text-xs text-red-400 text-center">{error}</p>}
                <button
                  onClick={handleInvite}
                  disabled={checking || !inviteKey.trim()}
                  className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
                >
                  {checking ? "Проверка..." : "Подтвердить"}
                </button>
              </div>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-slate-600 mt-6">ROP Assistant © 2026</p>
      </div>
    </div>
  )
}
