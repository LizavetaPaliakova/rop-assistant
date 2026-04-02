import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { token, chatId } = await req.json()

    if (!token || !chatId) {
      return NextResponse.json({ error: "token and chatId required" }, { status: 400 })
    }

    const message = `✅ *ROP Assistant подключён!*\n\nТестовое сообщение отправлено успешно.\nТеперь вы будете получать отчёты здесь.\n\n_${new Date().toLocaleString("ru-RU")}_`

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ error: err.description }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Test failed", details: (error as Error).message },
      { status: 500 }
    )
  }
}
