import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { Header } from '@/components/layout/header'
import { ProfielPage } from '@/components/profiel/profiel-page'
import type { Profile } from '@/types'

export default async function ProfielRoute() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as unknown as Profile | null
  if (!profile) redirect('/login')

  return (
    <AppShell>
      <Header title="Mijn profiel" />
      <ProfielPage
        naam={profile.naam}
        email={user.email ?? ''}
        kleur={profile.kleur ?? '#4A7C59'}
      />
    </AppShell>
  )
}
