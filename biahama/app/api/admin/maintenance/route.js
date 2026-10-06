import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { runMaintenance } from '@/lib/maintenance'
import { withErrorLogging } from '@/lib/logger'
export const maxDuration = 60
export const POST = withErrorLogging('admin maintenance', async () => {
  await requireAdmin()
  const result = await runMaintenance()
  return NextResponse.json(result, { status: result.failures ? 503 : 200 })
})
