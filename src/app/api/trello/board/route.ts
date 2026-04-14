import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

interface TrelloLabel {
  id: string
  name: string
  color: string
}

interface TrelloMember {
  id: string
  fullName: string
  avatarUrl: string | null
}

interface TrelloCard {
  id: string
  name: string
  labels: TrelloLabel[]
  idMembers: string[]
  idList: string
  due: string | null
  url: string
  desc: string
  members?: TrelloMember[]
  aangemaakt_door_naam?: string
  aangemaakt_door_kleur?: string
  toegewezen_aan_id?: string | null
  toegewezen_aan_naam?: string | null
  toegewezen_aan_kleur?: string | null
}

interface TrelloList {
  id: string
  name: string
  cards: TrelloCard[]
}

interface TrelloRawList {
  id: string
  name: string
}

// In-memory cache
let cache: {
  lists: TrelloList[]
  boardUrl: string
  fetchedAt: number
} | null = null

const CACHE_TTL = 5 * 60 * 1000 // 5 minuten

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    // Fetch Trello settings from app_instellingen
    const { data: allSettings } = await supabase
      .from('app_instellingen')
      .select('key, value')
      .in('key', ['trello_api_key', 'trello_api_token', 'trello_board_id'])

    if (!allSettings || allSettings.length === 0) {
      return NextResponse.json({ lists: [], boardUrl: '', configured: false })
    }

    const settingsMap: Record<string, string> = {}
    for (const s of allSettings) {
      settingsMap[s.key] = s.value
    }

    const apiKey = settingsMap['trello_api_key']
    const apiToken = settingsMap['trello_api_token']
    const boardId = settingsMap['trello_board_id']

    if (!apiKey || !apiToken || !boardId) {
      console.log('[Trello] Missing credentials:', { hasKey: !!apiKey, hasToken: !!apiToken, hasBoardId: !!boardId })
      return NextResponse.json({ lists: [], boardUrl: '', configured: false, debug: `Missing: key=${!!apiKey} token=${!!apiToken} board=${!!boardId}` })
    }

    console.log('[Trello] Fetching board:', boardId)
    console.log('[Trello] API Key (first 8):', apiKey.slice(0, 8) + '...')
    console.log('[Trello] Token (first 8):', apiToken.slice(0, 8) + '...')

    const boardUrl = `https://trello.com/b/${boardId}`

    // Skip cache for debugging
    // if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    //   return NextResponse.json({ lists: cache.lists, boardUrl: cache.boardUrl, configured: true })
    // }

    const auth = `key=${apiKey}&token=${apiToken}`

    const listsUrl = `https://api.trello.com/1/boards/${boardId}/lists?${auth}&filter=open`
    const cardsUrl = `https://api.trello.com/1/boards/${boardId}/cards?${auth}&fields=name,labels,idMembers,idList,due,url,desc`
    const membersUrl = `https://api.trello.com/1/boards/${boardId}/members?${auth}&fields=fullName,avatarUrl`

    console.log('[Trello] Lists URL:', listsUrl.replace(apiKey, 'KEY').replace(apiToken, 'TOKEN'))

    const [listsRes, cardsRes, membersRes] = await Promise.all([
      fetch(listsUrl),
      fetch(cardsUrl),
      fetch(membersUrl),
    ])

    console.log('[Trello] Lists status:', listsRes.status)
    console.log('[Trello] Cards status:', cardsRes.status)
    console.log('[Trello] Members status:', membersRes.status)

    if (!listsRes.ok) {
      const errText = await listsRes.text()
      console.error('[Trello] Lists error body:', errText)
      return NextResponse.json({ lists: [], boardUrl, configured: true, error: `Lists fout (${listsRes.status}): ${errText}` })
    }

    if (!cardsRes.ok) {
      const errText = await cardsRes.text()
      console.error('[Trello] Cards error body:', errText)
      return NextResponse.json({ lists: [], boardUrl, configured: true, error: `Cards fout (${cardsRes.status}): ${errText}` })
    }

    const rawLists: TrelloRawList[] = await listsRes.json()
    const rawCards: TrelloCard[] = await cardsRes.json()
    console.log('[Trello] Found lists:', rawLists.length, rawLists.map(l => l.name))
    console.log('[Trello] Found cards:', rawCards.length)

    // Build members map
    const membersMap: Record<string, TrelloMember> = {}
    if (membersRes.ok) {
      const members: TrelloMember[] = await membersRes.json()
      for (const m of members) {
        membersMap[m.id] = m
      }
    }

    // Group cards by list and add member info
    const cardsByList: Record<string, TrelloCard[]> = {}
    for (const card of rawCards) {
      card.members = card.idMembers
        .map((id) => membersMap[id])
        .filter(Boolean)
      if (!cardsByList[card.idList]) {
        cardsByList[card.idList] = []
      }
      cardsByList[card.idList].push(card)
    }

    // Haal maker- en toewijzingsinfo op uit Supabase voor alle kaarten
    const allCardIds = rawCards.map((c) => c.id)
    const makerMap: Record<string, { naam: string; kleur: string }> = {}
    const toegewezenMap: Record<string, { id: string; naam: string; kleur: string }> = {}
    if (allCardIds.length > 0) {
      const adminClient = createAdminClient()
      const { data: kaarten } = await adminClient
        .from('trello_kaarten')
        .select(`
          trello_card_id,
          maker:aangemaakt_door ( naam, kleur ),
          toegewezen:toegewezen_aan ( id, naam, kleur )
        `)
        .in('trello_card_id', allCardIds)

      for (const k of kaarten ?? []) {
        const maker = k.maker as unknown as { naam: string; kleur: string } | null
        if (maker) makerMap[k.trello_card_id] = { naam: maker.naam, kleur: maker.kleur }

        const toegewezen = k.toegewezen as unknown as { id: string; naam: string; kleur: string } | null
        if (toegewezen) {
          toegewezenMap[k.trello_card_id] = {
            id: toegewezen.id,
            naam: toegewezen.naam,
            kleur: toegewezen.kleur,
          }
        }
      }
    }

    // Voeg maker- en toewijzingsinfo toe aan elke kaart
    for (const card of rawCards) {
      if (makerMap[card.id]) {
        card.aangemaakt_door_naam = makerMap[card.id].naam
        card.aangemaakt_door_kleur = makerMap[card.id].kleur
      }
      if (toegewezenMap[card.id]) {
        card.toegewezen_aan_id = toegewezenMap[card.id].id
        card.toegewezen_aan_naam = toegewezenMap[card.id].naam
        card.toegewezen_aan_kleur = toegewezenMap[card.id].kleur
      }
    }

    // Combine into final structure — filter out "Archief" list (case-insensitive)
    const lists: TrelloList[] = rawLists
      .filter((list) => list.name.toLowerCase() !== 'archief')
      .map((list) => ({
        id: list.id,
        name: list.name,
        cards: cardsByList[list.id] || [],
      }))

    // Update cache
    cache = { lists, boardUrl, fetchedAt: Date.now() }

    return NextResponse.json({ lists, boardUrl, configured: true })
  } catch (error) {
    console.error('Trello board error:', error)
    return NextResponse.json({ lists: [], boardUrl: '', configured: false })
  }
}
