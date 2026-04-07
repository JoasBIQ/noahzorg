import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { Header } from '@/components/layout/header'
import { Phase2Placeholder } from '@/components/ui/phase2-placeholder'
import type { Profile } from '@/types'

export default async function KluisRoute() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Only beheerders may access the kluis
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as unknown as Profile | null

  if (profile?.rol !== 'beheerder') {
    redirect('/')
  }

  return (
    <AppShell>
      <Header title="Accounts Kluis" />
      <Phase2Placeholder
        titel="Accounts Kluis"
        beschrijving="Hier kun je straks veilig inloggegevens bewaren voor diensten rondom Noah."
      />
    </AppShell>
  )
}
