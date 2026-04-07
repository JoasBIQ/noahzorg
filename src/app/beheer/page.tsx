import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { Header } from '@/components/layout/header'
import { BeheerContent } from '@/components/beheer/beheer-content'
import type { Profile } from '@/types'

export default async function BeheerRoute() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Only beheerders may access beheer
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as unknown as Profile | null

  if (profile?.rol !== 'beheerder') {
    redirect('/')
  }

  // Fetch all profiles for audit log
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('*')
    .order('naam', { ascending: true })

  return (
    <AppShell>
      <Header title="Beheer" />
      <BeheerContent
        currentUserId={user.id}
        allProfiles={(allProfiles ?? []) as Profile[]}
      />
    </AppShell>
  )
}
