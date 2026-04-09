import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { MailPage } from '@/components/mail/mail-page'
import { isGmailConnected } from '@/lib/gmail'
import type { Profile } from '@/types'

export default async function MailRoute({
  searchParams,
}: {
  searchParams: { schrijf?: string }
}) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: currentProfile }, { connected, email: gmailEmail }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    isGmailConnected(),
  ])

  const profile = currentProfile as unknown as Profile

  return (
    <AppShell>
      <MailPage
        isBeheerder={profile?.rol === 'beheerder'}
        currentProfile={profile}
        initialConnected={connected}
        gmailEmail={connected ? gmailEmail ?? null : null}
        initialSchrijf={searchParams.schrijf === '1'}
      />
    </AppShell>
  )
}
