import { randomUUID } from "crypto"
import * as fs from "fs"
import * as path from "path"

export interface StoredUser {
  id: string
  username: string
  name: string
  passwordHash: string
  createdAt: number
}

// ─── File-based storage ────────────────────────────────────────────────────────

const DATA_FILE = path.join(process.cwd(), "data", "users.json")

function readUsersFile(): StoredUser[] {
  try {
    if (!fs.existsSync(DATA_FILE)) return []
    const raw = fs.readFileSync(DATA_FILE, "utf-8")
    return JSON.parse(raw) as StoredUser[]
  } catch {
    return []
  }
}

function writeUsersFile(users: StoredUser[]): void {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), "utf-8")
}

// ─── Upstash Redis storage ─────────────────────────────────────────────────────

async function getRedis() {
  const { Redis } = await import("@upstash/redis")
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
}

const REDIS_USERS_KEY = "rop:users"

// ─── Public API ────────────────────────────────────────────────────────────────

const useRedis = !!process.env.UPSTASH_REDIS_REST_URL

export async function findUser(username: string): Promise<StoredUser | null> {
  if (useRedis) {
    const redis = await getRedis()
    const user = await redis.hget<StoredUser>(REDIS_USERS_KEY, username.toLowerCase())
    return user ?? null
  }
  const users = readUsersFile()
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase()) ?? null
}

export async function saveUser(user: Omit<StoredUser, "id"> & { id?: string }): Promise<StoredUser> {
  const stored: StoredUser = { id: user.id ?? randomUUID(), ...user }
  if (useRedis) {
    const redis = await getRedis()
    await redis.hset(REDIS_USERS_KEY, { [stored.username.toLowerCase()]: stored })
  } else {
    const users = readUsersFile()
    const idx = users.findIndex((u) => u.username.toLowerCase() === stored.username.toLowerCase())
    if (idx >= 0) {
      users[idx] = stored
    } else {
      users.push(stored)
    }
    writeUsersFile(users)
  }
  return stored
}

export async function countUsers(): Promise<number> {
  if (useRedis) {
    const redis = await getRedis()
    return redis.hlen(REDIS_USERS_KEY)
  }
  return readUsersFile().length
}
