import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  const adminClient = createAdminClient()
  const [
    { data: profiles },
    { data: currentProfile },
    { data: { users } },
  ] = await Promise.all([
    supabase.from('profiles').select('*').order('naam', { ascending: true }),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const profile = currentProfile as unknown as Profile
  const isBeheerder = profile?.rol === 'beheerder'

  const emailBevestigd: Record<string, boolean> = {}
  for (const u of users) {
    emailBevestigd[u.id] = !!u.email_confirmed_at
  }

  return (
    <AppShell>
      <TeamPage
        profiles={(profiles ?? []) as unknown as Profile[]}
        currentProfile={profile}
        isBeheerder={isBeheerder}
        emailBevestigd={emailBevestigd}
        currentUserId={user.id}
      />
    </AppShell>
  )
}
