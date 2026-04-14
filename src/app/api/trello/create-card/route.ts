import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Haal het label-ID op voor een kleur op het bord, of maak het aan
async function getOrCreateLabelId(
  boardId: string,
  color: string,
  name: string,
  apiKey: string,
  apiToken: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.trello.com/1/boards/${boardId}/labels?key=${apiKey}&token=${apiToken}`
    )
    if (!res.ok) return null

    const labels = await res.json() as { id: string; color: string; name: string }[]
    const existing = labels.find((l) => l.color === color)
    if (existing) return existing.id

    // Maak nieuw label aan
    const createRes = await fetch(
      `https://api.trello.com/1/labels?key=${apiKey}&token=${apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color, idBoard: boardId }),
      }
    )
    if (!createRes.ok) return null
    const newLabel = await createRes.json()
    return newLabel.id
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const { name, description, idList, urgentie } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Kaartnaam is verplicht.' }, { status: 400 })
    }

    const { data: allSettings } = await supabase
      .from('app_instellingen')
      .select('key, value')
      .in('key', ['trello_api_key', 'trello_api_token', 'trello_board_id', 'trello_inbox_list_id'])

    const settings: Record<string, string> = {}
    for (const s of allSettings || []) {
      settings[s.key] = s.value
    }

    const apiKey = settings['trello_api_key']
    const apiToken = settings['trello_api_token']
    const boardId = settings['trello_board_id']

    if (!apiKey || !apiToken || !boardId) {
      return NextResponse.json({ error: 'Trello niet geconfigureerd.' }, { status: 400 })
    }

    let targetListId = idList || settings['trello_inbox_list_id']

    if (!targetListId) {
      const listsRes = await fetch(
        `https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${apiToken}&filter=open`
      )
      if (!listsRes.ok) {
        return NextResponse.json({ error: 'Trello lijsten ophalen mislukt.' }, { status: 500 })
      }
      const lists = await listsRes.json() as { id: string; name: string }[]
      const inboxList = lists.find((l) => l.name.toLowerCase() === 'inbox')
      targetListId = inboxList ? inboxList.id : lists[0]?.id

      if (!targetListId) {
        return NextResponse.json({ error: 'Geen lijsten gevonden op het bord.' }, { status: 400 })
      }

      if (inboxList) {
        const adminClient = createAdminClient()
        await adminClient.from('app_instellingen').upsert(
          { key: 'trello_inbox_list_id', value: targetListId, updated_by: user.id },
          { onConflict: 'key' }
        )
      }
    }

    // Resolve urgentie naar label ID
    const URGENTIE_MAP: Record<string, { color: string; naam: string }> = {
      laag: { color: 'green', naam: 'Lage urgentie' },
      middel: { color: 'yellow', naam: 'Middel urgentie' },
      hoog: { color: 'red', naam: 'Hoge urgentie' },
    }

    let idLabels: string[] = []
    if (urgentie && URGENTIE_MAP[urgentie]) {
      const { color, naam } = URGENTIE_MAP[urgentie]
      const labelId = await getOrCreateLabelId(boardId, color, naam, apiKey, apiToken)
      if (labelId) idLabels = [labelId]
    }

    const params = new URLSearchParams({
      key: apiKey,
      token: apiToken,
      idList: targetListId,
      name: name.trim(),
    })

    if (description?.trim()) params.set('desc', description.trim())
    if (idLabels.length > 0) params.set('idLabels', idLabels.join(','))

    const res = await fetch(`https://api.trello.com/1/cards?${params.toString()}`, {
      method: 'POST',
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[Trello] Create card error:', errText)
      return NextResponse.json({ error: `Trello fout (${res.status}): ${errText}` }, { status: res.status })
    }

    const card = await res.json()

    // Sla de koppeling maker ↔ kaart op in Supabase
    const adminClient = createAdminClient()
    await adminClient
      .from('trello_kaarten')
      .insert({ trello_card_id: card.id, aangemaakt_door: user.id })
      .then(({ error }) => {
        if (error) console.error('[Trello] Kaart opslaan in supabase mislukt:', error)
      })

    return NextResponse.json({ success: true, card })
  } catch (error) {
    console.error('Trello create card error:', error)
    return NextResponse.json({ error: 'Kaart aanmaken mislukt.' }, { status: 500 })
  }
}
