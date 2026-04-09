import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { LogboekPage } from '@/components/logboek/logboek-page'
import type { LogEntry, Profile } from '@/types'

export default async function LogboekRoute({
  searchParams,
}: {
  searchParams: { nieuw?: string }
}) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [
    { data: entries },
    { data: profiles },
    { data: currentProfile },
  ] = await Promise.all([
    supabase.from('logboek').select('*').eq('gearchiveerd', false).order('created_at', { ascending: false }),
    supabase.from('profiles').select('*'),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  return (
    <AppShell>
      <LogboekPage
        initialEntries={(entries ?? []) as LogEntry[]}
        allProfiles={(profiles ?? []) as Profile[]}
        currentProfile={currentProfile as unknown as Profile}
        currentUserId={user.id}
        initialShowForm={searchParams.nieuw === '1'}
      />
    </AppShell>
  )
}
