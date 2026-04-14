import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// PUT — wijs een Trello-kaart toe aan een app-gebruiker (of verwijder toewijzing)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })

    const { cardId, toegewezenAan } = await request.json()
    if (!cardId) return NextResponse.json({ error: 'cardId is verplicht.' }, { status: 400 })

    const adminClient = createAdminClient()

    // Upsert: zorg dat er een rij bestaat, en stel toegewezen_aan in
    const { error } = await adminClient
      .from('trello_kaarten')
      .upsert(
        {
          trello_card_id: cardId,
          aangemaakt_door: user.id,   // wordt genegeerd als rij al bestaat (zie onConflict)
          toegewezen_aan: toegewezenAan ?? null,
        },
        {
          onConflict: 'trello_card_id',
          ignoreDuplicates: false,
        }
      )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[toewijzing] Fout:', error)
    return NextResponse.json({ error: 'Toewijzing opslaan mislukt.' }, { status: 500 })
  }
}
