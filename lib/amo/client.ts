// AmoCRM REST API v4 client
// Docs: https://www.amocrm.ru/developers/content/crm_platform/api-reference

export const AMO_API = (domain: string) => `https://${domain}.amocrm.ru/api/v4`
export const AMO_OAUTH = (domain: string) => `https://${domain}.amocrm.ru/oauth2/access_token`

// ─── Known AMO constants ──────────────────────────────────────────────────────

export const AMO_PIPELINE_II = 9688350          // "ИИ" — hot leads
export const AMO_PIPELINE_EVENTS = 9688342      // "Мероприятия онлайн" — warm leads
export const AMO_FIELD_PAYMENT_DATE = 295533    // "Дата последней оплаты" — unix timestamp
export const AMO_FIELD_APPLICATION_DATE = 379811 // "Даты заявки"
export const AMO_EXCLUDED_MANAGER_IDS = new Set([
  13305102, // Аккаунт общий
  297540,   // Стаc Банников
  2498311,  // Василенко
  13083377, // Алексеев Дмитрий
  9280741,  // Полякова Елизавета
  10447070, // Данил Хайритдинов
])

// ─── Raw AmoCRM types ─────────────────────────────────────────────────────────

export interface AmoTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

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

export interface AmoCustomFieldValue {
  field_id: number
  field_name: string
  field_type: string
  values: Array<{ value: string | number }>
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
  custom_fields_values: AmoCustomFieldValue[] | null
  _embedded?: {
    contacts?: Array<{ id: number; name: string }>
  }
}

export interface AmoUserRights {
  is_active?: boolean
  is_admin?: boolean
  is_free?: boolean
}

export interface AmoUser {
  id: number
  name: string
  email: string
  role_id: number
  group_id: number
  rights?: AmoUserRights
}

export interface AmoEvent {
  id: string
  type: string
  created_at: number
  value_before?: unknown[]
  value_after?: unknown[]
  created_by: number
}

// ─── Custom field helper ──────────────────────────────────────────────────────

/** Extract a date custom field value (unix timestamp) from a lead */
export function getCustomFieldDate(lead: AmoLead, fieldId: number): number | null {
  const field = lead.custom_fields_values?.find(f => f.field_id === fieldId)
  if (!field || !field.values?.[0]) return null
  const val = field.values[0].value
  // Date field values in AMO are unix timestamps (as number or string)
  const ts = typeof val === 'number' ? val : parseInt(String(val), 10)
  return isNaN(ts) ? null : ts
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

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  let res: Response
  try {
    res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

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
  extraParams?: Record<string, string>,
  maxPages = 4          // safety cap — 4 pages × 250 = 1000 records max
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

    if (!data._links?.next || items.length < limit) break
    page++
    if (page > maxPages) break
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

const JAN_2026 = Math.floor(new Date("2026-01-01T00:00:00Z").getTime() / 1000)

// Fetch leads with custom fields (for open lead counts and payment date analysis)
export async function fetchLeads(
  domain: string,
  token: string,
  pipelineIds: number[] = []
): Promise<AmoLead[]> {
  const params: Record<string, string> = {
    "filter[created_at][from]": String(JAN_2026),
    "with": "custom_fields",
    order: "updated_at",
  }
  pipelineIds.forEach((id, i) => {
    params[`filter[pipeline_id][${i}]`] = String(id)
  })
  return amoGetAll<AmoLead>(domain, token, "/leads", "leads", params, 4)
}

/** Fetches leads from Jan 2026 with custom fields for payment date analysis */
export async function fetchPaymentLeads(
  domain: string,
  token: string,
  pipelineIds: number[] = []
): Promise<AmoLead[]> {
  // Fetch all leads with custom fields — we filter by FIELD_PAYMENT_DATE in transforms
  const params: Record<string, string> = {
    "filter[created_at][from]": String(JAN_2026),
    "with": "custom_fields",
    order: "updated_at",
  }
  pipelineIds.forEach((id, i) => {
    params[`filter[pipeline_id][${i}]`] = String(id)
  })
  return amoGetAll<AmoLead>(domain, token, "/leads", "leads", params, 4)
}

/** @deprecated Use fetchPaymentLeads instead */
export async function fetchWonLeads(
  domain: string,
  token: string,
  paymentStatusIds: number[],
  pipelineIds: number[] = []
): Promise<AmoLead[]> {
  return fetchPaymentLeads(domain, token, pipelineIds)
}

// Fetch all users and filter to active only, excluding non-real manager accounts
export async function fetchUsers(domain: string, token: string): Promise<AmoUser[]> {
  const data = await amoGet<{ _embedded?: { users: AmoUser[] } }>(
    domain, token, "/users", { limit: "100", with: "role,group,rights" }
  )
  const all = data._embedded?.users || []
  return all.filter((u) =>
    u.rights?.is_active !== false &&
    !AMO_EXCLUDED_MANAGER_IDS.has(u.id)
  )
}

// Fetch all users without filter (for the manager settings UI)
export async function fetchAllUsers(domain: string, token: string): Promise<AmoUser[]> {
  const data = await amoGet<{ _embedded?: { users: AmoUser[] } }>(
    domain, token, "/users", { limit: "100", with: "role,group,rights" }
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
      "filter[type][]": "outgoing_call",
      "filter[created_at][from]": String(since),
    })
  } catch {
    return []
  }
}

// Fetch leads with arbitrary filter params (for deals page)
export async function fetchFilteredLeads(
  domain: string,
  token: string,
  params: Record<string, string>
): Promise<AmoLead[]> {
  return amoGetAll<AmoLead>(domain, token, "/leads", "leads", params)
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
