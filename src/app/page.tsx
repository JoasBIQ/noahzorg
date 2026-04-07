import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { DashboardContent } from '@/components/dashboard-content'
import type { LogEntry, AgendaItem, Profile } from '@/types'

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch current user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch all profiles (for avatar lookups)
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('*')

  // Fetch latest 3 logboek entries (not archived)
  const { data: logboekEntries } = await supabase
    .from('logboek')
    .select('*')
    .eq('gearchiveerd', false)
    .order('created_at', { ascending: false })
    .limit(3)

  // Fetch next 3 agenda items (from now onwards)
  const { data: agendaItems } = await supabase
    .from('agenda')
    .select('*')
    .gte('datum_tijd', new Date().toISOString())
    .order('datum_tijd', { ascending: true })
    .limit(3)

  return (
    <AppShell>
      <DashboardContent
        profile={profile as unknown as Profile}
        allProfiles={(allProfiles ?? []) as Profile[]}
        logboekEntries={(logboekEntries ?? []) as LogEntry[]}
        agendaItems={(agendaItems ?? []) as AgendaItem[]}
      />
    </AppShell>
  )
}
