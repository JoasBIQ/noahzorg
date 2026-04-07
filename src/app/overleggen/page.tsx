import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { OverleggenPage } from '@/components/overleggen/overleggen-page'
import type { Profile, Overleg } from '@/types'

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

  const { data: verslagenSetting } = await supabase
    .from('app_instellingen')
    .select('value')
    .eq('key', 'drive_map_verslagen')
    .maybeSingle()

  const verslagenFolderId = (verslagenSetting as { value: string } | null)?.value ?? null

  // Haal aankomende overleggen op
  const { data: overleggen } = await supabase
    .from('overleggen')
    .select('*')
    .eq('gearchiveerd', false)
    .gte('datum_tijd', new Date().toISOString())
    .order('datum_tijd', { ascending: true })

  return (
    <AppShell>
      <OverleggenPage
        currentProfile={currentProfile as unknown as Profile}
        currentUserId={user.id}
        verslagenFolderId={verslagenFolderId}
        initialOverleggen={(overleggen ?? []) as Overleg[]}
      />
    </AppShell>
  )
}
