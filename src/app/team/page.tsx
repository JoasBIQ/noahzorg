import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { TeamPage } from '@/components/team/team-page'
import type { Profile } from '@/types'

export default async function TeamRoute() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('naam', { ascending: true })

  // Fetch current user profile
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = currentProfile as unknown as Profile
  const isBeheerder = profile?.rol === 'beheerder'

  return (
    <AppShell>
      <TeamPage
        profiles={(profiles ?? []) as unknown as Profile[]}
        currentProfile={profile}
        isBeheerder={isBeheerder}
      />
    </AppShell>
  )
}
