import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/mail/reacties-leestatus
 * Retourneert de gmail_message_ids waarbij de huidige gebruiker
 * ongelezen overleg-reacties heeft (van anderen).
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ messageIds: [] })
    }

    const [{ data: alleReacties }, { data: gelezenReacties }] = await Promise.all([
      supabase.from('mail_reacties').select('id, gmail_message_id').neq('auteur_id', user.id),
      supabase.from('mail_reacties_leestatus').select('mail_reactie_id').eq('gebruiker_id', user.id),
    ])

    const gelezenSet = new Set(gelezenReacties?.map((g) => g.mail_reactie_id) ?? [])
    const messageIds = Array.from(
      new Set(
        (alleReacties ?? [])
          .filter((r) => !gelezenSet.has(r.id))
          .map((r) => r.gmail_message_id)
      )
    )

    return NextResponse.json({ messageIds })
  } catch {
    return NextResponse.json({ messageIds: [] })
  }
}

/**
 * POST /api/mail/reacties-leestatus
 * Body: { messageId: string }
 * Markeert alle reacties van anderen op dit bericht als gelezen.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const { messageId } = await request.json()
    if (!messageId) {
      return NextResponse.json({ error: 'messageId is verplicht.' }, { status: 400 })
    }

    // Haal alle reactie-IDs op voor dit bericht (van anderen)
    const { data: reacties } = await supabase
      .from('mail_reacties')
      .select('id')
      .eq('gmail_message_id', messageId)
      .neq('auteur_id', user.id)

    if (!reacties || reacties.length === 0) {
      return NextResponse.json({ success: true })
    }

    // Bulk-insert leestatus, conflicten negeren
    const inserts = reacties.map((r) => ({
      mail_reactie_id: r.id,
      gebruiker_id: user.id,
    }))

    await supabase
      .from('mail_reacties_leestatus')
      .upsert(inserts, { onConflict: 'mail_reactie_id,gebruiker_id', ignoreDuplicates: true })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Markeren als gelezen mislukt.' }, { status: 500 })
  }
}
