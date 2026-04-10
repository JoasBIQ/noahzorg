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

  const now = new Date()
  const nowIso = now.toISOString()
  // Haal overleggen op die begonnen zijn tot max. 2 uur geleden — zodat lopende
  // vergaderingen nog zichtbaar blijven. De client-side filter bepaalt daarna
  // definitief op basis van eind_tijd + 2 uur.
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()

  const [
    { data: currentProfile },
    { data: verslagenSetting },
    { data: overleggen },
    { data: verledenOverleggen },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('app_instellingen').select('value').eq('key', 'drive_map_verslagen').maybeSingle(),
    supabase.from('overleggen').select('*').eq('gearchiveerd', false).gte('datum_tijd', twoHoursAgo).order('datum_tijd', { ascending: true }),
    supabase.from('overleggen').select('*').lt('datum_tijd', twoHoursAgo).order('datum_tijd', { ascending: false }).limit(50),
  ])

  const verslagenFolderId = (verslagenSetting as { value: string } | null)?.value ?? null

  return (
    <AppShell>
      <OverleggenPage
        currentProfile={currentProfile as unknown as Profile}
        currentUserId={user.id}
        verslagenFolderId={verslagenFolderId}
        initialOverleggen={(overleggen ?? []) as Overleg[]}
        initialVerleden={(verledenOverleggen ?? []) as Overleg[]}
      />
    </AppShell>
  )
}
