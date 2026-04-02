// AmoCRM REST API v4 client
// Docs: https://www.amocrm.ru/developers/content/crm_platform/api-reference

export const AMO_API = (domain: string) => `https://${domain}.amocrm.ru/api/v4`
export const AMO_OAUTH = (domain: string) => `https://${domain}.amocrm.ru/oauth2/access_token`

export interface AmoTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

// ─── Raw AmoCRM types ─────────────────────────────────────────────────────────

export interface AmoPipeline {
  id: number
  name: string
  sort: number
  is_main: boolean
  _embedded: {
    statuses: AmoStatus[]
  }
}

export interface AmoStatus {
  id: number
  name: string
  sort: number
  color: string
  type: number // 0=normal, 142=won, 143=lost
}

export interface AmoLead {
  id: number
  name: string
  price: number
  responsible_user_id: number
  pipeline_id: number
  status_id: number
  created_at: number   // unix
  updated_at: number   // unix
  closed_at: number | null
  loss_reason_id: number | null
  custom_fields_values: unknown[] | null
  _embedded?: {
    contacts?: Array<{ id: number; name: string }>
  }
}

export interface AmoUser {
  id: number
  name: string
  email: string
  role_id: number
  group_id: number
}

export interface AmoEvent {
  id: string
  type: string
  created_at: number
  value_before?: unknown[]
  value_after?: unknown[]
  created_by: number
}

// ─── Paginated fetch helper ────────────────────────────────────────────────────

async function amoGet<T>(
  domain: string,
  accessToken: string,
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${AMO_API(domain)}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 },
  })

  if (res.status === 401) throw new Error("AMO_UNAUTHORIZED")
  if (!res.ok) throw new Error(`AmoCRM ${res.status}: ${await res.text()}`)

  return res.json()
}

// Fetch all pages (handles AmoCRM pagination via _links.next)
async function amoGetAll<T>(
  domain: string,
  token: string,
  path: string,
  embedded: string,
  extraParams?: Record<string, string>
): Promise<T[]> {
  const results: T[] = []
  let page = 1
  const limit = 250

  while (true) {
    const data = await amoGet<{ _embedded?: Record<string, T[]>; _links?: { next?: unknown } }>(
      domain, token, path,
      { limit: String(limit), page: String(page), ...extraParams }
    )
    const items = data._embedded?.[embedded] || []
    results.push(...items)

    // No next page or got less than limit
    if (!data._links?.next || items.length < limit) break
    page++
    if (page > 10) break // safety cap at 2500 records
  }

  return results
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function fetchPipelines(domain: string, token: string): Promise<AmoPipeline[]> {
  const data = await amoGet<{ _embedded?: { pipelines: AmoPipeline[] } }>(
    domain, token, "/leads/pipelines", { limit: "50" }
  )
  return data._embedded?.pipelines || []
}

export async function fetchLeads(domain: string, token: string): Promise<AmoLead[]> {
  return amoGetAll<AmoLead>(domain, token, "/leads", "leads", {
    with: "contacts",
    order: "updated_at",
  })
}

export async function fetchUsers(domain: string, token: string): Promise<AmoUser[]> {
  const data = await amoGet<{ _embedded?: { users: AmoUser[] } }>(
    domain, token, "/users", { limit: "100" }
  )
  return data._embedded?.users || []
}

export async function fetchCallEvents(
  domain: string,
  token: string,
  daysBack = 30
): Promise<AmoEvent[]> {
  const since = Math.floor(Date.now() / 1000) - daysBack * 86400
  try {
    return amoGetAll<AmoEvent>(domain, token, "/events", "events", {
      filter: "type[]=outgoing_call,type[]=incoming_call",
      created_at: `from=${since}`,
    })
  } catch {
    return []
  }
}

// ─── Token refresh ─────────────────────────────────────────────────────────────

export async function refreshAccessToken(
  domain: string,
  refreshToken: string
): Promise<AmoTokens> {
  const res = await fetch(AMO_OAUTH(domain), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.AMO_CLIENT_ID,
      client_secret: process.env.AMO_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      redirect_uri: process.env.AMO_REDIRECT_URL,
    }),
  })

  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)
  return res.json()
}

export async function exchangeCodeForTokens(
  domain: string,
  code: string
): Promise<AmoTokens> {
  const res = await fetch(AMO_OAUTH(domain), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.AMO_CLIENT_ID,
      client_secret: process.env.AMO_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.AMO_REDIRECT_URL,
    }),
  })

  if (!res.ok) throw new Error(`Code exchange failed: ${await res.text()}`)
  return res.json()
}
