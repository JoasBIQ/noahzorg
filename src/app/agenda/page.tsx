import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { AgendaPage } from '@/components/agenda/agenda-page'
import type { AgendaItem, Profile } from '@/types'

export default async function AgendaRoute() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [
    { data: items },
    { data: profiles },
    { data: currentProfile },
  ] = await Promise.all([
    supabase.from('agenda').select('*').order('datum_tijd', { ascending: true }),
    supabase.from('profiles').select('*'),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  return (
    <AppShell>
      <AgendaPage
        initialItems={(items ?? []) as AgendaItem[]}
        allProfiles={(profiles ?? []) as Profile[]}
        currentProfile={currentProfile as unknown as Profile}
        currentUserId={user.id}
      />
    </AppShell>
  )
}
