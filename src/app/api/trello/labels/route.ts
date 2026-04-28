import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getTrelloCredentials } from '@/lib/trello-credentials'

export const dynamic = 'force-dynamic'

const URGENTIE_MAP: Record<string, { color: string; naam: string }> = {
  laag: { color: 'green', naam: 'Lage urgentie' },
  middel: { color: 'yellow', naam: 'Middel urgentie' },
  hoog: { color: 'red', naam: 'Hoge urgentie' },
}

// Haal label-ID op voor een kleur, of maak aan
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
    const labels = await res.json() as { id: string; color: string }[]
    const existing = labels.find((l) => l.color === color)
    if (existing) return existing.id

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

// PUT: urgentie instellen op een kaart
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const { cardId, urgentie } = await request.json()

    if (!cardId) {
      return NextResponse.json({ error: 'cardId is verplicht.' }, { status: 400 })
    }

    const { apiKey, apiToken, boardId } = await getTrelloCredentials()

    if (!apiKey || !apiToken || !boardId) {
      return NextResponse.json({ error: 'Trello niet geconfigureerd.' }, { status: 400 })
    }

    let idLabels = ''
    if (urgentie && URGENTIE_MAP[urgentie]) {
      const { color, naam } = URGENTIE_MAP[urgentie]
      const labelId = await getOrCreateLabelId(boardId, color, naam, apiKey, apiToken)
      if (labelId) idLabels = labelId
    }

    // Haal huidige kaart op om niet-urgentie labels te bewaren
    const cardRes = await fetch(
      `https://api.trello.com/1/cards/${cardId}?key=${apiKey}&token=${apiToken}&fields=idLabels`
    )
    const urgentieColors = new Set(['green', 'yellow', 'red'])

    let existingLabels: string[] = []
    if (cardRes.ok) {
      const boardLabelsRes = await fetch(
        `https://api.trello.com/1/boards/${boardId}/labels?key=${apiKey}&token=${apiToken}`
      )
      if (boardLabelsRes.ok) {
        const cardData = await cardRes.json()
        const allLabels = await boardLabelsRes.json() as { id: string; color: string }[]
        // Bewaar labels die geen urgentie-kleur hebben
        existingLabels = (cardData.idLabels as string[]).filter((id: string) => {
          const label = allLabels.find((l) => l.id === id)
          return label && !urgentieColors.has(label.color)
        })
      }
    }

    const finalLabels = idLabels
      ? [...existingLabels, idLabels].join(',')
      : existingLabels.join(',')

    const updateRes = await fetch(
      `https://api.trello.com/1/cards/${cardId}?key=${apiKey}&token=${apiToken}&idLabels=${finalLabels}`,
      { method: 'PUT' }
    )

    if (!updateRes.ok) {
      const errText = await updateRes.text()
      return NextResponse.json({ error: `Trello fout (${updateRes.status}): ${errText}` }, { status: updateRes.status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Trello labels error:', error)
    return NextResponse.json({ error: 'Label bijwerken mislukt.' }, { status: 500 })
  }
}
