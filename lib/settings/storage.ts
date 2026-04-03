import { Redis } from "@upstash/redis"

export interface UserSettings {
  selectedPipelineIds: number[]
  monthlyPlan: number
  managerPlans: Record<string, number>
}

const DEFAULT_SETTINGS: UserSettings = {
  selectedPipelineIds: [],
  monthlyPlan: 0,
  managerPlans: {},
}

const REDIS_KEY = "rop:settings"

let _redis: Redis | null = null
function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  if (!_redis) _redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  return _redis
}

export async function loadSettings(): Promise<UserSettings> {
  const redis = getRedis()
  if (redis) {
    try {
      const raw = await redis.get<string>(REDIS_KEY)
      if (raw) {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
        // Strip legacy fields that were removed
        const { paymentStatusIds: _p, activeStatusIds: _a, ...rest } = parsed as Record<string, unknown>
        return { ...DEFAULT_SETTINGS, ...rest }
      }
    } catch {}
  }
  return { ...DEFAULT_SETTINGS }
}

export async function saveSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
  const current = await loadSettings()
  const updated = { ...current, ...settings }
  const redis = getRedis()
  if (redis) {
    try { await redis.set(REDIS_KEY, JSON.stringify(updated)) } catch {}
  }
  return updated
}
