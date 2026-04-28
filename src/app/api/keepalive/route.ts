/**
 * GET /api/keepalive
 *
 * Stuurt een simpele query naar Supabase om het project actief te houden
 * en te voorkomen dat het in slaapstand gaat.
 *
 * Wordt aangeroepen door:
 * - Vercel cron job (elke 5 dagen om 12:00 UTC, zie vercel.json)
 *
 * Authenticatie:
 * - Authorization: Bearer <CRON_SECRET>  (Vercel cron — automatisch)
 * - ?secret=<CRON_SECRET>                (handmatige aanroep)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // ── Authenticatie ──────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET niet ingesteld.' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  const querySecret = new URL(request.url).searchParams.get('secret')

  const isAuthorized =
    authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Niet geautoriseerd.' }, { status: 401 })
  }

  // ── Keep-alive query ───────────────────────────────────────────────────
  try {
    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('profiles')
      .select('id')
      .limit(1)

    if (error) {
      console.error('[keepalive] Supabase query mislukt:', error.message)
      return NextResponse.json(
        { ok: false, error: error.message, timestamp: new Date() },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, timestamp: new Date() })
  } catch (err) {
    console.error('[keepalive] Onverwachte fout:', err)
    return NextResponse.json(
      { ok: false, error: String(err), timestamp: new Date() },
      { status: 500 }
    )
  }
}
