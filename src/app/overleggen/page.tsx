import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { OverleggenPage } from '@/components/overleggen/overleggen-page'
import type { Profile } from '@/types'

export default async function OverleggenRoute() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Haal de Drive verslagen-map ID op
  const { data: verslagenSetting } = await supabase
    .from('app_instellingen')
    .select('value')
    .eq('key', 'drive_map_verslagen')
    .maybeSingle()

  const verslagenFolderId = (verslagenSetting as { value: string } | null)?.value ?? null

  return (
    <AppShell>
      <OverleggenPage
        currentProfile={currentProfile as unknown as Profile}
        currentUserId={user.id}
        verslagenFolderId={verslagenFolderId}
      />
    </AppShell>
  )
}
