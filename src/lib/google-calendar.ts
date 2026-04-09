import { google } from 'googleapis'
import { getAuthorizedClient } from './gmail'
import type { GoogleCalendarEvent } from '@/types'

export async function getCalendarClient() {
  const auth = await getAuthorizedClient()
  if (!auth) return null
  return google.calendar({ version: 'v3', auth })
}

export function mapGoogleEvent(
  event: {
    id?: string | null
    summary?: string | null
    start?: { dateTime?: string | null; date?: string | null } | null
    end?: { dateTime?: string | null; date?: string | null } | null
    location?: string | null
    description?: string | null
    htmlLink?: string | null
    extendedProperties?: {
      private?: Record<string, string> | null
    } | null
  }
): GoogleCalendarEvent {
  return {
    id: event.id ?? `gcal-${Math.random().toString(36).slice(2)}`,
    summary: event.summary || 'Geen titel',
    start: event.start?.dateTime || event.start?.date || new Date().toISOString(),
    end: event.end?.dateTime || event.end?.date || new Date().toISOString(),
    location: event.location || undefined,
    description: event.description || undefined,
    htmlLink: event.htmlLink || '',
    isGoogleEvent: true as const,
    source: 'family' as const,
    aangemaakt_door: event.extendedProperties?.private?.aangemaakt_door || undefined,
  }
}
