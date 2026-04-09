'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/use-profile'
import { useMailCounts } from '@/hooks/use-mail-counts'

export interface OngelezenCounts {
  notities: number
  mail: number
  overleggen: number
  totaal: number
}

export function useOngelezen(): OngelezenCounts & { refresh: () => void } {
  const { user } = useProfile()
  const mailCounts = useMailCounts()
  const [notities, setNotities] = useState(0)
  const [overleggen, setOverleggen] = useState(0)
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchCounts = useCallback(async () => {
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // --- Notities ---
    const { data: gezienNotities } = await db
      .from('user_gezien')
      .select('item_id')
      .eq('user_id', user.id)
      .eq('item_type', 'notitie')

    const gezeienNotitieIds = new Set<string>(
      (gezienNotities ?? []).map((g: { item_id: string }) => g.item_id)
    )

    const { data: alleNotities } = await supabase
      .from('logboek')
      .select('id, auteur_id')
      .eq('gearchiveerd', false)

    const notitiesCount = (alleNotities ?? []).filter(
      (n) => n.auteur_id !== user.id && !gezeienNotitieIds.has(n.id)
    ).length

    // --- Overleggen ---
    const { data: gezienOverleg } = await db
      .from('user_gezien')
      .select('item_id')
      .eq('user_id', user.id)
      .eq('item_type', 'overleg')

    const gezeienOverlegIds = new Set<string>(
      (gezienOverleg ?? []).map((g: { item_id: string }) => g.item_id)
    )

    const { data: alleOverleggen } = await supabase
      .from('overleggen')
      .select('id, aangemaakt_door')

    const overleggenCount = (alleOverleggen ?? []).filter(
      (o) => o.aangemaakt_door !== user.id && !gezeienOverlegIds.has(o.id)
    ).length

    setNotities(notitiesCount)
    setOverleggen(overleggenCount)
  }, [user, supabase])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  // Realtime subscriptions — herlaad counts bij wijzigingen
  useEffect(() => {
    if (!user) return

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`ongelezen_${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logboek' }, () => {
        fetchCounts()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'overleggen' }, () => {
        fetchCounts()
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_gezien',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCounts()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase, fetchCounts])

  const mail = (mailCounts.unread ?? 0) + (mailCounts.overleg ?? 0)

  return {
    notities,
    mail,
    overleggen,
    totaal: notities + mail + overleggen,
    refresh: fetchCounts,
  }
}
