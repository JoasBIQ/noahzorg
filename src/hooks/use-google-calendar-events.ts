'use client'

import { useState, useEffect } from 'react'
import type { GoogleCalendarEvent } from '@/types'

export function useGoogleCalendarEvents(startDate: Date, endDate: Date) {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [familyConnected, setFamilyConnected] = useState<boolean | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    const timeMin = startDate.toISOString()
    const timeMax = endDate.toISOString()

    let cancelled = false

    async function fetchAll() {
      setLoading(true)
      try {
        const params = new URLSearchParams({ timeMin, timeMax })

        const [noahResult, familyResult] = await Promise.allSettled([
          fetch(`/api/calendar/events?${params}`).then((r) => r.json()),
          fetch(`/api/calendar/family-events?${params}`).then((r) => r.json()),
        ])

        if (cancelled) return

        const noahEvents: GoogleCalendarEvent[] =
          noahResult.status === 'fulfilled'
            ? (noahResult.value.events ?? [])
            : []

        const familyData =
          familyResult.status === 'fulfilled'
            ? familyResult.value
            : { events: [], connected: false }

        setFamilyConnected(familyData.connected ?? false)
        setEvents([...noahEvents, ...(familyData.events ?? [])])
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

    fetchAll()

    return () => {
      cancelled = true
    }
  }, [startDate.toISOString(), endDate.toISOString(), refreshTick])

  return {
    events,
    loading,
    familyConnected,
    refreshFamilyEvents: () => setRefreshTick((t) => t + 1),
  }
}
