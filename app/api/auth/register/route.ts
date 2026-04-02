import { NextRequest, NextResponse } from "next/server"
import { findUser, saveUser } from "@/lib/auth/storage"
import { hashPassword } from "@/lib/auth"
import { randomUUID } from "crypto"

const INVITE_KEY = "ROP"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password, name, inviteKey } = body as {
      username: string
      password: string
      name: string
      inviteKey: string
    }

    if (!username || !password || !name || !inviteKey) {
      return NextResponse.json({ error: "Все поля обязательны" }, { status: 400 })
    }

    if (inviteKey !== INVITE_KEY) {
      return NextResponse.json({ error: "Неверный инвайт-ключ" }, { status: 403 })
    }

    const existing = await findUser(username)
    if (existing) {
      return NextResponse.json({ error: "Пользователь с таким логином уже существует" }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    await saveUser({
      id: randomUUID(),
      username: username.toLowerCase().trim(),
      name: name.trim(),
      passwordHash,
      createdAt: Date.now(),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Register error:", err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Ошибка сервера: ${msg}` }, { status: 500 })
  }
}
