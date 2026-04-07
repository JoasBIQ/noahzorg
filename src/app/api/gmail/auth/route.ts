import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthUrl } from '@/lib/gmail'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    // Alleen beheerder mag Gmail koppelen
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (profile?.rol !== 'beheerder') {
      return NextResponse.json({ error: 'Geen rechten.' }, { status: 403 })
    }

    const url = getAuthUrl()
    return NextResponse.redirect(url)
  } catch (error) {
    console.error('[Gmail auth] Error:', error)
    return NextResponse.json({ error: 'Fout bij genereren OAuth URL.' }, { status: 500 })
  }
}
