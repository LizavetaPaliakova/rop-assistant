import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/nextauth"
import { Redis } from "@upstash/redis"

const INVITE_KEY = "ROP"
const REDIS_KEY = "rop:verified_emails"

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL) return null
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { inviteKey } = await req.json()
  if (inviteKey !== INVITE_KEY) {
    return NextResponse.json({ error: "Неверный ключ доступа" }, { status: 403 })
  }

  const redis = getRedis()
  if (redis) {
    await redis.sadd(REDIS_KEY, session.user.email)
  }

  return NextResponse.json({ success: true })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ verified: false })
  }
  const redis = getRedis()
  if (!redis) return NextResponse.json({ verified: true }) // dev mode
  const isMember = await redis.sismember(REDIS_KEY, session.user.email)
  return NextResponse.json({ verified: !!isMember })
}
