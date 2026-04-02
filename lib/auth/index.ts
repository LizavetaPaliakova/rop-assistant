import bcrypt from "bcryptjs"
import { SignJWT, jwtVerify } from "jose"

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-change-in-prod"
)

const EXPIRES_IN = "7d"

// ─── Password hashing ──────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ─── JWT ───────────────────────────────────────────────────────────────────────

export interface TokenPayload {
  userId: string
  username: string
  name: string
}

export async function createToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    if (
      typeof payload.userId === "string" &&
      typeof payload.username === "string" &&
      typeof payload.name === "string"
    ) {
      return {
        userId: payload.userId,
        username: payload.username,
        name: payload.name,
      }
    }
    return null
  } catch {
    return null
  }
}
