'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogboekPage } from '@/components/logboek/logboek-page'
import type { LogEntry, Profile } from '@/types'

interface NotitiesTabProps {
  currentProfile: Profile
}

export function NotitiesTab({ currentProfile }: NotitiesTabProps) {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: e }, { data: p }] = await Promise.all([
        supabase
          .from('logboek')
          .select('*')
          .eq('gearchiveerd', false)
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
      ])
      setEntries((e ?? []) as LogEntry[])
      setAllProfiles((p ?? []) as Profile[])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-4 lg:p-8 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <LogboekPage
      initialEntries={entries}
      allProfiles={allProfiles}
      currentProfile={currentProfile}
      currentUserId={currentProfile.id}
    />
  )
}
