import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET: notities voor een kaart ophalen uit Supabase (met app-profielnamen)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })

    const cardId = request.nextUrl.searchParams.get('cardId')
    if (!cardId) return NextResponse.json({ error: 'cardId is verplicht.' }, { status: 400 })

    const adminClient = createAdminClient()
    const { data: notities, error } = await adminClient
      .from('trello_kaart_notities')
      .select(`
        id,
        bericht,
        created_at,
        profiles:auteur_id ( naam, kleur )
      `)
      .eq('trello_card_id', cardId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const comments = (notities ?? []).map((n) => {
      const profile = n.profiles as unknown as { naam: string; kleur: string } | null
      return {
        id: n.id,
        text: n.bericht,
        memberCreator: profile?.naam ?? 'Onbekend',
        kleur: profile?.kleur ?? '#4A7C59',
        date: n.created_at,
      }
    })

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Notities ophalen mislukt:', error)
    return NextResponse.json({ error: 'Notities ophalen mislukt.' }, { status: 500 })
  }
}

// POST: nieuwe notitie opslaan in Supabase én doorsturen naar Trello
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })

    const { cardId, text } = await request.json()
    if (!cardId || !text?.trim()) {
      return NextResponse.json({ error: 'cardId en text zijn verplicht.' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Haal profielnaam op voor prefix in Trello-comment
    const { data: profile } = await adminClient
      .from('profiles')
      .select('naam, kleur')
      .eq('id', user.id)
      .single()

    const naam = profile?.naam ?? 'Onbekend'

    // Sla op in Supabase
    const { data: inserted, error: insertError } = await adminClient
      .from('trello_kaart_notities')
      .insert({ trello_card_id: cardId, auteur_id: user.id, bericht: text.trim() })
      .select('id, created_at')
      .single()

    if (insertError) throw insertError

    // Stuur ook naar Trello (met naam als prefix zodat het leesbaar is in Trello zelf)
    const { data: allSettings } = await supabase
      .from('app_instellingen')
      .select('key, value')
      .in('key', ['trello_api_key', 'trello_api_token'])

    const settingsMap: Record<string, string> = {}
    for (const s of allSettings || []) settingsMap[s.key] = s.value

    const apiKey = settingsMap['trello_api_key']
    const apiToken = settingsMap['trello_api_token']

    if (apiKey && apiToken) {
      await fetch(
        `https://api.trello.com/1/cards/${cardId}/actions/comments?key=${apiKey}&token=${apiToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `[${naam}] ${text.trim()}` }),
        }
      ).catch((err) => console.error('[Trello] Comment doorsturen mislukt:', err))
    }

    return NextResponse.json({
      success: true,
      comment: {
        id: inserted.id,
        text: text.trim(),
        memberCreator: naam,
        kleur: profile?.kleur ?? '#4A7C59',
        date: inserted.created_at,
      },
    })
  } catch (error) {
    console.error('Notitie plaatsen mislukt:', error)
    return NextResponse.json({ error: 'Notitie plaatsen mislukt.' }, { status: 500 })
  }
}
