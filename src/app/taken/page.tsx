import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { TrelloBoard } from '@/components/taken/trello-board'
import type { Profile } from '@/types'

export default async function TakenRoute({
  searchParams,
}: {
  searchParams: { maakTaak?: string }
}) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch current user profile
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = currentProfile as unknown as Profile

  return (
    <AppShell>
      <TrelloBoard
        currentUserId={user.id}
        isBeheerder={profile?.rol === 'beheerder'}
        initialTaakTekst={searchParams.maakTaak}
      />
    </AppShell>
  )
}
