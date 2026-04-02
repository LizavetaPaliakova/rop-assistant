import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { manager_id, day_id, event } = await req.json()

  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('settings')
    .select('tg_bot_token, tg_chat_id')
    .single()

  if (!settings?.tg_bot_token || !settings?.tg_chat_id) return NextResponse.json({ ok: false })

  const { data: manager } = await supabase
    .from('onboarding_managers')
    .select('first_name, last_name')
    .eq('id', manager_id)
    .single()

  const { data: day } = await supabase
    .from('onboarding_days')
    .select('day_number, title')
    .eq('id', day_id)
    .single()

  const name = manager ? `${manager.first_name} ${manager.last_name}` : 'Менеджер'
  const dayLabel = day ? `День ${day.day_number}: ${day.title}` : ''

  let text = ''
  if (event === 'day_completed') {
    text = `✅ *${name}* завершил(а) «${dayLabel}»`
  } else if (event === 'homework_submitted') {
    text = `📝 *${name}* сдал(а) домашнее задание — «${dayLabel}»\nОжидает проверки.`
  } else if (event === 'test_failed') {
    text = `❌ *${name}* не прошёл(а) тест — «${dayLabel}»`
  }

  if (!text) return NextResponse.json({ ok: false })

  await fetch(`https://api.telegram.org/bot${settings.tg_bot_token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: settings.tg_chat_id,
      text,
      parse_mode: 'Markdown',
    }),
  })

  return NextResponse.json({ ok: true })
}
