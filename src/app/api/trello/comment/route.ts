import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET: ophalen van comments voor een kaart
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const cardId = request.nextUrl.searchParams.get('cardId')
    if (!cardId) {
      return NextResponse.json({ error: 'cardId is verplicht.' }, { status: 400 })
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

    const res = await fetch(
      `https://api.trello.com/1/cards/${cardId}/actions?filter=commentCard&key=${apiKey}&token=${apiToken}`
    )

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `Trello fout (${res.status}): ${errText}` }, { status: res.status })
    }

    const actions = await res.json()
    const comments = actions.map((a: { id: string; data: { text: string }; memberCreator: { fullName: string }; date: string }) => ({
      id: a.id,
      text: a.data.text,
      memberCreator: a.memberCreator.fullName,
      date: a.date,
    }))

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Trello comments fetch error:', error)
    return NextResponse.json({ error: 'Comments ophalen mislukt.' }, { status: 500 })
  }
}

// POST: nieuw comment toevoegen
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const { cardId, text } = await request.json()

    if (!cardId || !text?.trim()) {
      return NextResponse.json({ error: 'cardId en text zijn verplicht.' }, { status: 400 })
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

    const res = await fetch(
      `https://api.trello.com/1/cards/${cardId}/actions/comments?key=${apiKey}&token=${apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      }
    )

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `Trello fout (${res.status}): ${errText}` }, { status: res.status })
    }

    const comment = await res.json()
    return NextResponse.json({ success: true, comment })
  } catch (error) {
    console.error('Trello comment post error:', error)
    return NextResponse.json({ error: 'Comment plaatsen mislukt.' }, { status: 500 })
  }
}
