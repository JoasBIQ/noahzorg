import { redirect } from 'next/navigation'
import { addDays } from 'date-fns'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { DashboardContent } from '@/components/dashboard-content'
import type { LogEntry, AgendaItem, Profile, Overleg } from '@/types'

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const now = new Date()
  const sevenDaysFromNow = addDays(now, 7)

  const [
    { data: profile },
    { data: allProfiles },
    { data: logboekEntries },
    { data: agendaItems },
    { data: overleggen },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('profiles').select('*'),
    supabase.from('logboek').select('*').eq('gearchiveerd', false).order('created_at', { ascending: false }).limit(10),
    supabase.from('agenda').select('*').gte('datum_tijd', now.toISOString()).lte('datum_tijd', sevenDaysFromNow.toISOString()).order('datum_tijd', { ascending: true }).limit(5),
    supabase.from('overleggen').select('*').eq('gearchiveerd', false).order('created_at', { ascending: false }).limit(3),
  ])

  return (
    <AppShell>
      <DashboardContent
        profile={profile as unknown as Profile}
        allProfiles={(allProfiles ?? []) as Profile[]}
        logboekEntries={(logboekEntries ?? []) as LogEntry[]}
        agendaItems={(agendaItems ?? []) as AgendaItem[]}
        overleggen={(overleggen ?? []) as Overleg[]}
      />
    </AppShell>
  )
}
