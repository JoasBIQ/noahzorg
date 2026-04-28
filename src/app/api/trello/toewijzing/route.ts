import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// PUT — wijs een Trello-kaart toe aan meerdere app-gebruikers (of verwijder toewijzing)
// Body: { cardId: string, toegewezenAanIds: string[] }
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })

    const { cardId, toegewezenAanIds } = await request.json()
    if (!cardId) return NextResponse.json({ error: 'cardId is verplicht.' }, { status: 400 })

    const ids: string[] = Array.isArray(toegewezenAanIds) ? toegewezenAanIds : []

    const adminClient = createAdminClient()

    // Upsert: sla de array op + update backwards-compat enkelvoudige kolom
    const { error } = await adminClient
      .from('trello_kaarten')
      .upsert(
        {
          trello_card_id: cardId,
          aangemaakt_door: user.id,
          toegewezen_aan_ids: ids,
          toegewezen_aan: ids.length > 0 ? ids[0] : null,
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
