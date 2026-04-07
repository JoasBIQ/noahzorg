'use client'

import { useState, useEffect, useCallback } from 'react'

interface MailCounts {
  unread: number
  drafts: number
  overleg: number
}

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minuten

export function useMailCounts() {
  const [counts, setCounts] = useState<MailCounts>({ unread: 0, drafts: 0, overleg: 0 })

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/gmail/counts')
      if (res.ok) {
        const data = await res.json()
        setCounts({
          unread: data.unread ?? 0,
          drafts: data.drafts ?? 0,
          overleg: data.overleg ?? 0,
        })
      }
    } catch {
      // Stil falen — badges tonen gewoon 0
    }
  }, [])

  useEffect(() => {
    fetchCounts()
    const interval = setInterval(fetchCounts, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchCounts])

  return { ...counts, refresh: fetchCounts }
}
