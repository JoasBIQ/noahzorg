'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export function useRealtime<T extends { [key: string]: unknown }>(
  table: string,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void
) {
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => callback(payload as RealtimePostgresChangesPayload<T>)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table])
}
