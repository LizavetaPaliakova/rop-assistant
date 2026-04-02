import { NextResponse } from "next/server"

export async function POST() {
  const res = NextResponse.json({ success: true })
  res.cookies.delete("amo_access_token")
  res.cookies.delete("amo_refresh_token")
  res.cookies.delete("amo_domain")
  res.cookies.delete("amo_token_expires")
  return res
}
