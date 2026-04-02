import { NextRequest, NextResponse } from "next/server"

interface AnalysisPayload {
  managers: Array<{
    name: string
    plan_percent: number
    deals_count: number
    calls_count: number
    conversion: number
    stalled_deals: number
    avg_deal_days: number
  }>
  pipeline?: {
    name: string
    stages: Array<{ name: string; deals_count: number }>
  }
  period?: string
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      // Return mock recommendations if no API key
      return NextResponse.json({ recommendations: getMockRecommendations() })
    }

    const payload: AnalysisPayload = await req.json()

    const prompt = buildPrompt(payload)

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    if (!res.ok) throw new Error(`Claude API error: ${res.status}`)

    const data = await res.json()
    const text = data.content[0]?.text || ""

    return NextResponse.json({ recommendations: text, raw: data })
  } catch (error) {
    console.error("AI analyze error:", error)
    // Fallback to mock
    return NextResponse.json({ recommendations: getMockRecommendations() })
  }
}

function buildPrompt(payload: AnalysisPayload): string {
  const managersText = payload.managers
    .map(
      (m) =>
        `- ${m.name}: план ${m.plan_percent.toFixed(1)}%, сделок ${m.deals_count}, ` +
        `звонков ${m.calls_count}, конверсия ${m.conversion}%, ` +
        `зависших ${m.stalled_deals}, ср. цикл ${m.avg_deal_days} дней`
    )
    .join("\n")

  return `Ты — опытный бизнес-аналитик отдела продаж. Проанализируй данные и дай конкретные рекомендации руководителю отдела продаж.

ДАННЫЕ МЕНЕДЖЕРОВ:
${managersText}

${payload.pipeline ? `ВОРОНКА "${payload.pipeline.name}":
${payload.pipeline.stages.map((s) => `  ${s.name}: ${s.deals_count} сделок`).join("\n")}` : ""}

Дай анализ в формате:
1. 2-3 критических проблемы (конкретно с именами и цифрами)
2. 2-3 рекомендации для роста (что сделать сегодня/на этой неделе)
3. Кого выделить как пример и почему

Будь конкретным, используй цифры из данных. Максимум 300 слов. Ответ на русском.`
}

function getMockRecommendations(): string {
  return `**Критические проблемы:**

1. **Петров В. (54% плана)** — критическое отставание. 0 звонков за 3 дня, 5 зависших сделок. Требуется немедленная 1-на-1 встреча сегодня.

2. **Морозова О. (63% плана)** — значительный разрыв с планом. 4 зависших сделки. Нужна проработка каждой сделки совместно.

3. **Воронка:** конверсия КП→Переговоры упала. 34 сделки без движения >14 дней — риск потери.

**Рекомендации на эту неделю:**

1. Провести разбор 3 сделок Петрова В. вместе — выявить причину торможения на этапе КП.

2. Сидорова Е. (102% плана, конверсия 28.6%) — попросить провести мастер-класс по работе с КП для команды.

3. Устроить "рейд по зависшим" — каждый менеджер делает 3 звонка по старым сделкам до пятницы.

**Пример для команды:**
Сидорова Е. — лучший результат месяца. Её подход к работе с КП и скорость 14 дней на сделку — эталон. Разберите конкретные кейсы на ближайшей планёрке.`
}
