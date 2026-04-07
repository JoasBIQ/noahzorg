import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (profile?.rol !== 'beheerder') {
      return NextResponse.json({ error: 'Geen rechten.' }, { status: 403 })
    }

    const adminClient = createAdminClient()
    await adminClient.from('gmail_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Gmail disconnect] Error:', error)
    return NextResponse.json({ error: 'Ontkoppelen mislukt.' }, { status: 500 })
  }
}
