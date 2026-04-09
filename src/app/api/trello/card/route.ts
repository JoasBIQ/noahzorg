import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getTrelloCredentials() {
  const supabase = await createServerSupabaseClient()
  const { data: allSettings } = await supabase
    .from('app_instellingen')
    .select('key, value')
    .in('key', ['trello_api_key', 'trello_api_token'])

  const map: Record<string, string> = {}
  for (const s of allSettings || []) map[s.key] = s.value
  return { apiKey: map['trello_api_key'], apiToken: map['trello_api_token'] }
}

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

    const url = `https://api.trello.com/1/cards/${cardId}?${params.toString()}`
    const res = await fetch(url, { method: 'PUT' })

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

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const { cardId, idList } = await request.json()

    console.log('[Trello Move] cardId:', cardId, 'idList:', idList)

    if (!cardId || !idList) {
      return NextResponse.json({ error: 'cardId en idList zijn verplicht.' }, { status: 400 })
    }

    const { data: allSettings } = await supabase
      .from('app_instellingen')
      .select('key, value')
      .in('key', ['trello_api_key', 'trello_api_token'])

    const settingsMap: Record<string, string> = {}
    for (const s of allSettings || []) {
      settingsMap[s.key] = s.value
    }

    const apiKey = settingsMap['trello_api_key']
    const apiToken = settingsMap['trello_api_token']

    if (!apiKey || !apiToken) {
      return NextResponse.json({ error: 'Trello niet geconfigureerd.' }, { status: 400 })
    }

    // Trello API verwacht parameters als query string, niet als JSON body
    const url = `https://api.trello.com/1/cards/${cardId}?key=${apiKey}&token=${apiToken}&idList=${idList}`
    console.log('[Trello Move] PUT URL:', url.replace(apiKey, 'KEY').replace(apiToken, 'TOKEN'))

    const res = await fetch(url, { method: 'PUT' })

    console.log('[Trello Move] Response status:', res.status)

    if (!res.ok) {
      const errText = await res.text()
      console.error('[Trello Move] Error:', errText)
      return NextResponse.json({ error: `Trello fout (${res.status}): ${errText}` }, { status: res.status })
    }

    const updated = await res.json()
    console.log('[Trello Move] Success, card now in list:', updated.idList)
    return NextResponse.json({ success: true, card: updated })
  } catch (error) {
    console.error('Trello card move error:', error)
    return NextResponse.json({ error: 'Verplaatsen mislukt.' }, { status: 500 })
  }
}
