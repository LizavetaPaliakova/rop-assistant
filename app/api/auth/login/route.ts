import { NextRequest, NextResponse } from "next/server"
import { findUser } from "@/lib/auth/storage"
import { verifyPassword, createToken } from "@/lib/auth"

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password } = body as { username: string; password: string }

    if (!username || !password) {
      return NextResponse.json({ error: "Введите логин и пароль" }, { status: 400 })
    }

    const user = await findUser(username)
    if (!user) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 })
    }

    const token = await createToken({
      userId: user.id,
      username: user.username,
      name: user.name,
    })

    const res = NextResponse.json({ success: true, name: user.name })
    res.cookies.set("rop_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
    })

    return res
  } catch (err) {
    console.error("Login error:", err)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}
