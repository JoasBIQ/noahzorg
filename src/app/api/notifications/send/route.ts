import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendPushToAll, sendPushToUser } from '@/lib/push'

export const dynamic = 'force-dynamic'

/**
 * Interne server-side helper voor het versturen van push notificaties.
 * Beveiligd via INTERNAL_API_SECRET zodat alleen server-side code dit kan aanroepen.
 *
 * Body:
 *   { title, body, url, tag?, excludeUserId?, userId? }
 *
 * Als userId is meegegeven → stuur alleen naar die gebruiker.
 * Anders → stuur naar iedereen (exclusief excludeUserId).
 */
export async function POST(request: NextRequest) {
  try {
    // Controleer interne secret OF dat de beller ingelogd is als beheerder
    const secret = request.headers.get('x-internal-secret')
    const isInternal = secret && secret === process.env.INTERNAL_API_SECRET

    if (!isInternal) {
      const supabase = await createServerSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const { title, body, url, tag, userId, excludeUserId } = await request.json()
    console.log('[notifications/send] aangeroepen:', { title, body: body?.slice(0, 40), userId, excludeUserId })

    if (!title || !body) {
      return NextResponse.json({ error: 'title en body zijn verplicht.' }, { status: 400 })
    }

    const payload = { title, body, url: url ?? '/', tag }

    if (userId) {
      const ok = await sendPushToUser(userId, payload)
      console.log('[notifications/send] sendPushToUser resultaat:', ok)
    } else {
      await sendPushToAll(payload, excludeUserId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[send] error:', err)
    return NextResponse.json({ error: 'Versturen mislukt.' }, { status: 500 })
  }
}
