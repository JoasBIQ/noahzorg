import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    // Alleen beheerder
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (profile?.rol !== 'beheerder') {
      return NextResponse.json({ error: 'Geen rechten.' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, factorId } = body as { userId: string; factorId: string }

    if (!userId || !factorId) {
      return NextResponse.json({ error: 'userId en factorId zijn verplicht.' }, { status: 400 })
    }

    // Verwijder de TOTP-factor via de Supabase Admin REST API
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}/factors/${factorId}`
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      },
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      console.error('[2FA reset] Delete factor failed:', errorData)
      return NextResponse.json({ error: '2FA resetten mislukt.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[2FA reset] Error:', error)
    return NextResponse.json({ error: '2FA resetten mislukt.' }, { status: 500 })
  }
}
