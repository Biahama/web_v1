import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { runMaintenance } from '@/lib/maintenance'

export const maxDuration = 60
export const dynamic = 'force-dynamic'
export async function GET(req) {
  const secret = process.env.CRON_SECRET
  const received = Buffer.from(req.headers.get('authorization') || '')
  const expected = Buffer.from(`Bearer ${secret}`)
  if (!secret || received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await runMaintenance()
  return NextResponse.json(result, { status: result.failures ? 503 : 200 })
}
