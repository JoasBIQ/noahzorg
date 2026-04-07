import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { OverleggenPage } from '@/components/overleggen/overleggen-page'
import type { Overleg, Profile } from '@/types'

export default async function OverleggenRoute() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: overleggen } = await supabase
    .from('overleggen')
    .select('*')
    .order('datum_tijd', { ascending: false })

  const { data: profiles } = await supabase.from('profiles').select('*')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <AppShell>
      <OverleggenPage
        initialOverleggen={(overleggen ?? []) as Overleg[]}
        allProfiles={(profiles ?? []) as Profile[]}
        currentProfile={currentProfile as unknown as Profile}
        currentUserId={user.id}
      />
    </AppShell>
  )
}
