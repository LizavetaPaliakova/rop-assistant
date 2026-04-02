import { NextRequest, NextResponse } from "next/server"

const AMO_BASE = (domain: string) => `https://${domain}.amocrm.ru/api/v4`

async function amoFetch(domain: string, token: string, path: string) {
  const res = await fetch(`${AMO_BASE(domain)}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
  if (!res.ok) throw new Error(`AmoCRM API error: ${res.status}`)
  return res.json()
}

export async function POST(req: NextRequest) {
  try {
    const { domain, token } = await req.json()

    if (!domain || !token) {
      return NextResponse.json({ error: "domain and token required" }, { status: 400 })
    }

    // Fetch pipelines
    const pipelinesData = await amoFetch(domain, token, "/leads/pipelines")
    const pipelines = pipelinesData._embedded?.pipelines || []

    // Fetch leads (first page)
    const leadsData = await amoFetch(domain, token, "/leads?limit=250&with=contacts")
    const leads = leadsData._embedded?.leads || []

    // Fetch users (managers)
    const usersData = await amoFetch(domain, token, "/users?limit=50")
    const users = usersData._embedded?.users || []

    return NextResponse.json({
      success: true,
      stats: {
        pipelines: pipelines.length,
        leads: leads.length,
        managers: users.length,
      },
      data: { pipelines, leads, users },
    })
  } catch (error) {
    console.error("AmoCRM sync error:", error)
    return NextResponse.json(
      { error: "Sync failed", details: (error as Error).message },
      { status: 500 }
    )
  }
}
