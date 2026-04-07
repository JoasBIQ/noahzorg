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

  const { data: noahProfiel } = await supabase
    .from('noah_profiel')
    .select('*')
    .limit(1)
    .single()

  const noah = noahProfiel as unknown as NoahProfiel | null

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  let updatedByProfile: Profile | null = null
  if (noah?.updated_by) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', noah.updated_by)
      .single()
    updatedByProfile = data as unknown as Profile | null
  }

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
