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

  // Fetch all agenda items ordered by datum_tijd ASC
  const { data: items } = await supabase
    .from('agenda')
    .select('*')
    .order('datum_tijd', { ascending: true })

  // Fetch all profiles for betrokkenen display
  const { data: profiles } = await supabase.from('profiles').select('*')

  // Fetch current user profile
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

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
