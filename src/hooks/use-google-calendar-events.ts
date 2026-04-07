'use client'

import { useState, useEffect } from 'react'
import type { GoogleCalendarEvent } from '@/types'

export function useGoogleCalendarEvents(startDate: Date, endDate: Date) {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const timeMin = startDate.toISOString()
    const timeMax = endDate.toISOString()

    let cancelled = false

    async function fetchEvents() {
      setLoading(true)
      try {
        const params = new URLSearchParams({ timeMin, timeMax })
        const response = await fetch(`/api/calendar/events?${params}`)

        if (!response.ok) {
          setEvents([])
          return
        }

        const data = await response.json()

        if (!cancelled) {
          setEvents(Array.isArray(data.events) ? data.events : [])
        }
      } catch {
        if (!cancelled) {
          setEvents([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchEvents()

    return () => {
      cancelled = true
    }
  }, [startDate.toISOString(), endDate.toISOString()])

  return { events, loading }
}
