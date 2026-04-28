import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getTrelloCredentials } from '@/lib/trello-credentials'

export const dynamic = 'force-dynamic'

// PUT — update kaart eigenschappen (closed, due, etc.)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })

    const body = await request.json()
    const { cardId, ...fields } = body

    if (!cardId) return NextResponse.json({ error: 'cardId is verplicht.' }, { status: 400 })

    const { apiKey, apiToken } = await getTrelloCredentials()
    if (!apiKey || !apiToken) return NextResponse.json({ error: 'Trello niet geconfigureerd.' }, { status: 400 })

    const params = new URLSearchParams({ key: apiKey, token: apiToken })
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) params.set(k, v === null ? 'null' : String(v))
    }

    const res = await fetch(`https://api.trello.com/1/cards/${cardId}?${params.toString()}`, { method: 'PUT' })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `Trello fout: ${errText}` }, { status: res.status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Trello card update error:', error)
    return NextResponse.json({ error: 'Bijwerken mislukt.' }, { status: 500 })
  }
}

// PATCH — kaart naar andere lijst verplaatsen
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })

    const { cardId, idList } = await request.json()
    if (!cardId || !idList) return NextResponse.json({ error: 'cardId en idList zijn verplicht.' }, { status: 400 })

    const { apiKey, apiToken } = await getTrelloCredentials()
    if (!apiKey || !apiToken) return NextResponse.json({ error: 'Trello niet geconfigureerd.' }, { status: 400 })

    const res = await fetch(
      `https://api.trello.com/1/cards/${cardId}?key=${apiKey}&token=${apiToken}&idList=${idList}`,
      { method: 'PUT' }
    )

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `Trello fout (${res.status}): ${errText}` }, { status: res.status })
    }

    const updated = await res.json()
    return NextResponse.json({ success: true, card: updated })
  } catch (error) {
    console.error('Trello card move error:', error)
    return NextResponse.json({ error: 'Verplaatsen mislukt.' }, { status: 500 })
  }
}
