import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { Header } from '@/components/layout/header'
import { Phase2Placeholder } from '@/components/ui/phase2-placeholder'

export default async function TrajectenRoute() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <AppShell>
      <Header title="Trajecten" />
      <Phase2Placeholder
        titel="Trajecten"
        beschrijving="Hier kun je straks zorgtrajecten en contactpersonen beheren."
      />
    </AppShell>
  )
}
