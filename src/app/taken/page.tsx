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

  // Haal huidig profiel én alle actieve profielen op (parallel)
  const [{ data: currentProfile }, { data: alleProfielen }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('profiles').select('id, naam, kleur').eq('actief', true).order('naam'),
  ])

  const profile = currentProfile as unknown as Profile
  const profielen = (alleProfielen ?? []) as { id: string; naam: string; kleur: string }[]

  return (
    <AppShell>
      <TrelloBoard
        currentUserId={user.id}
        isBeheerder={profile?.rol === 'beheerder'}
        initialTaakTekst={searchParams.maakTaak}
        allProfiles={profielen}
      />
    </AppShell>
  )
}
