import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTrelloCredentials } from '@/lib/trello-credentials'

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

interface AppProfile {
  id: string
  naam: string
  kleur: string
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
  toegewezen_profielen?: AppProfile[]
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

    const { apiKey, apiToken, boardId } = await getTrelloCredentials()

    if (!apiKey || !apiToken || !boardId) {
      return NextResponse.json({ lists: [], boardUrl: '', configured: false })
    }

    const boardUrl = `https://trello.com/b/${boardId}`

    // Stuur cache terug als die nog vers is
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
      return NextResponse.json({ lists: cache.lists, boardUrl: cache.boardUrl, configured: true })
    }

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

    if (!listsRes.ok) {
      const errText = await listsRes.text()
      return NextResponse.json({ lists: [], boardUrl, configured: true, error: `Lists fout (${listsRes.status}): ${errText}` })
    }

    if (!cardsRes.ok) {
      const errText = await cardsRes.text()
      return NextResponse.json({ lists: [], boardUrl, configured: true, error: `Cards fout (${cardsRes.status}): ${errText}` })
    }

    const rawLists: TrelloRawList[] = await listsRes.json()
    const rawCards: TrelloCard[] = await cardsRes.json()

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
    // cardId → geresolveerde AppProfiles (multi-toewijzing)
    const toegewezenProfielenMap: Record<string, AppProfile[]> = {}

    if (allCardIds.length > 0) {
      const adminClient = createAdminClient()

      // Haal alle actieve profielen eenmalig op voor naam/kleur lookup
      const { data: alleProfielen } = await adminClient
        .from('profiles')
        .select('id, naam, kleur')
        .eq('actief', true)
      const profielenMap: Record<string, AppProfile> = {}
      for (const p of (alleProfielen ?? []) as AppProfile[]) {
        profielenMap[p.id] = p
      }

      const { data: kaarten } = await adminClient
        .from('trello_kaarten')
        .select(`
          trello_card_id,
          toegewezen_aan_ids,
          maker:aangemaakt_door ( naam, kleur ),
          toegewezen:toegewezen_aan ( id, naam, kleur )
        `)
        .in('trello_card_id', allCardIds)

      for (const k of kaarten ?? []) {
        const maker = k.maker as unknown as { naam: string; kleur: string } | null
        if (maker) makerMap[k.trello_card_id] = { naam: maker.naam, kleur: maker.kleur }

        // Multi-toewijzing heeft prioriteit
        const ids = (k.toegewezen_aan_ids ?? []) as string[]
        if (ids.length > 0) {
          toegewezenProfielenMap[k.trello_card_id] = ids
            .map((id) => profielenMap[id])
            .filter(Boolean)
        } else {
          // Fallback naar oude enkelvoudige kolom
          const toegewezen = k.toegewezen as unknown as AppProfile | null
          if (toegewezen) {
            toegewezenProfielenMap[k.trello_card_id] = [toegewezen]
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
      const profielen = toegewezenProfielenMap[card.id] ?? []
      if (profielen.length > 0) {
        // Backwards-compat: eerste toegewezene ook als enkele velden
        card.toegewezen_aan_id = profielen[0].id
        card.toegewezen_aan_naam = profielen[0].naam
        card.toegewezen_aan_kleur = profielen[0].kleur
      }
      card.toegewezen_profielen = profielen
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

// POST — invalideert de cache zodat de volgende GET vers data ophaalt
export async function POST() {
  cache = null
  return NextResponse.json({ success: true })
}
