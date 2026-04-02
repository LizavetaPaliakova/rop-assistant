import { Redis } from "@upstash/redis"
import * as fs from "fs"
import * as path from "path"

export interface StoredUser {
  id: string
  username: string
  name: string
  passwordHash: string
  createdAt: number
}

// ─── Redis client (lazy singleton) ────────────────────────────────────────────

let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return _redis
}

const REDIS_KEY = "rop:users"

// ─── File fallback ─────────────────────────────────────────────────────────────

const DATA_FILE = path.join(process.cwd(), "data", "users.json")

function readFile(): StoredUser[] {
  try {
    if (!fs.existsSync(DATA_FILE)) return []
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as StoredUser[]
  } catch { return [] }
}

function writeFile(users: StoredUser[]): void {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), "utf-8")
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function findUser(username: string): Promise<StoredUser | null> {
  const key = username.toLowerCase().trim()
  const redis = getRedis()
  if (redis) {
    try {
      const raw = await redis.hget(REDIS_KEY, key)
      if (!raw) return null
      // stored as JSON string
      return (typeof raw === "string" ? JSON.parse(raw) : raw) as StoredUser
    } catch (e) {
      console.error("Redis findUser error:", e)
      throw e
    }
  }
  return readFile().find((u) => u.username === key) ?? null
}

export async function saveUser(user: StoredUser): Promise<void> {
  const key = user.username.toLowerCase().trim()
  const toStore = { ...user, username: key }
  const redis = getRedis()
  if (redis) {
    try {
      // Store as JSON string to avoid serialization issues
      await redis.hset(REDIS_KEY, { [key]: JSON.stringify(toStore) })
      return
    } catch (e) {
      console.error("Redis saveUser error:", e)
      throw e
    }
  }
  const users = readFile()
  const idx = users.findIndex((u) => u.username === key)
  if (idx >= 0) users[idx] = toStore
  else users.push(toStore)
  writeFile(users)
}

export async function countUsers(): Promise<number> {
  const redis = getRedis()
  if (redis) {
    try {
      return await redis.hlen(REDIS_KEY)
    } catch { return 0 }
  }
  return readFile().length
}
