// Подключение через долгосрочный токен AmoCRM (без OAuth)
import { NextRequest, NextResponse } from "next/server"
import { fetchUsers } from "@/lib/amo/client"

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 90, // 90 дней
}

export async function POST(req: NextRequest) {
  try {
    const { domain, token } = await req.json()

    if (!domain || !token) {
      return NextResponse.json({ error: "domain and token required" }, { status: 400 })
    }

    // Проверяем токен — делаем реальный запрос к API
    const users = await fetchUsers(domain, token)

    if (!users || users.length === 0) {
      return NextResponse.json({ error: "No users found — check token and domain" }, { status: 401 })
    }

    const res = NextResponse.json({
      success: true,
      managersCount: users.length,
      domain,
    })

    // Долгосрочный токен — нет refresh_token, храним как access + ставим большой TTL
    res.cookies.set("amo_access_token", token, COOKIE_OPTS)
    res.cookies.set("amo_domain", domain, COOKIE_OPTS)
    // Маркер что это долгосрочный токен — не пытаться рефрешить
    res.cookies.set("amo_token_type", "long_term", COOKIE_OPTS)
    // Expires: 2028 (из JWT payload exp=1788134400)
    res.cookies.set("amo_token_expires", "1788134400000", COOKIE_OPTS)

    return res
  } catch (err) {
    const msg = (err as Error).message
    const status = msg.includes("401") || msg.includes("UNAUTHORIZED") ? 401 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
