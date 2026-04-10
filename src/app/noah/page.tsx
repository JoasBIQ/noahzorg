import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { NoahTabs } from '@/components/noah/noah-tabs'
import type { Profile, NoahProfiel } from '@/types'

export default async function NoahRoute() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: noahProfiel }, { data: currentProfile }, { data: allProfiles }] = await Promise.all([
    supabase.from('noah_profiel').select('*').limit(1).single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    // Haal alle profielen tegelijk op zodat we geen extra round-trip nodig hebben
    // voor het updated_by profiel van Noah
    supabase.from('profiles').select('id, naam, kleur'),
  ])

  const noah = noahProfiel as unknown as NoahProfiel | null

  const updatedByProfile =
    noah?.updated_by
      ? ((allProfiles ?? []).find((p) => p.id === noah.updated_by) as unknown as Profile | null) ?? null
      : null

  return (
    <AppShell>
      <NoahTabs
        noahProfiel={noah}
        currentProfile={currentProfile as unknown as Profile}
        updatedByProfile={updatedByProfile}
      />
    </AppShell>
  )
}
