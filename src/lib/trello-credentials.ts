/**
 * Trello API credentials cache
 *
 * De API key en token staan in app_instellingen in Supabase en veranderen
 * zelden. Ze worden maximaal 1× per 5 minuten opgehaald en daarna uit
 * module-level cache geserveerd — zo bespaart elke Trello-actie een extra
 * Supabase round-trip.
 */
import { createAdminClient } from '@/lib/supabase/admin'

export interface TrelloCredentials {
  apiKey: string
  apiToken: string
  boardId: string
  inboxListId: string
}

let _cache: TrelloCredentials | null = null
let _cacheTs = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minuten

export async function getTrelloCredentials(): Promise<TrelloCredentials> {
  const now = Date.now()
  if (_cache && now - _cacheTs < CACHE_TTL) return _cache

  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('app_instellingen')
    .select('key, value')
    .in('key', ['trello_api_key', 'trello_api_token', 'trello_board_id', 'trello_inbox_list_id'])

  const map: Record<string, string> = {}
  for (const s of data ?? []) map[s.key] = s.value

  _cache = {
    apiKey: map['trello_api_key'] ?? '',
    apiToken: map['trello_api_token'] ?? '',
    boardId: map['trello_board_id'] ?? '',
    inboxListId: map['trello_inbox_list_id'] ?? '',
  }
  _cacheTs = now
  return _cache
}

/** Roep aan na het wijzigen van Trello-instellingen */
export function invalidateTrelloCredentials() {
  _cache = null
  _cacheTs = 0
}
