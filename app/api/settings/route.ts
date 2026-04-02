import { NextRequest, NextResponse } from "next/server"
import { loadSettings, saveSettings } from "@/lib/settings/storage"

export async function GET() {
  const settings = await loadSettings()
  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const updated = await saveSettings(body)
  return NextResponse.json(updated)
}
