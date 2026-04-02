import { NextRequest, NextResponse } from "next/server"

interface SendPayload {
  token: string
  chatId: string
  message: string
  parseMode?: "Markdown" | "HTML"
}

async function sendTelegramMessage(token: string, chatId: string, text: string, parseMode = "Markdown") {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.description || `Telegram API error: ${res.status}`)
  }

  return res.json()
}

export async function POST(req: NextRequest) {
  try {
    const { token, chatId, message, parseMode }: SendPayload = await req.json()

    if (!token || !chatId || !message) {
      return NextResponse.json({ error: "token, chatId and message required" }, { status: 400 })
    }

    const result = await sendTelegramMessage(token, chatId, message, parseMode)

    return NextResponse.json({ success: true, messageId: result.result?.message_id })
  } catch (error) {
    console.error("Telegram send error:", error)
    return NextResponse.json(
      { error: "Send failed", details: (error as Error).message },
      { status: 500 }
    )
  }
}
