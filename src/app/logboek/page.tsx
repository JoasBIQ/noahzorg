import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { LogboekPage } from '@/components/logboek/logboek-page'
import type { LogEntry, Profile } from '@/types'

export default async function LogboekRoute() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all non-archived logboek entries, ordered by created_at DESC
  const { data: entries } = await supabase
    .from('logboek')
    .select('*')
    .eq('gearchiveerd', false)
    .order('created_at', { ascending: false })

  // Fetch all profiles for filter dropdown and avatar display
  const { data: profiles } = await supabase.from('profiles').select('*')

  // Fetch current user profile
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <AppShell>
      <LogboekPage
        initialEntries={(entries ?? []) as LogEntry[]}
        allProfiles={(profiles ?? []) as Profile[]}
        currentProfile={currentProfile as unknown as Profile}
        currentUserId={user.id}
      />
    </AppShell>
  )
}
