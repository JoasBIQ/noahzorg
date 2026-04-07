import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole, Profile } from '@/types'

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const currentProfile = profileData as unknown as Profile | null

    if (currentProfile?.rol !== 'beheerder') {
      return NextResponse.json(
        { error: 'Alleen beheerders kunnen rollen wijzigen.' },
        { status: 403 }
      )
    }

    const { userId, rol } = await request.json()

    if (!userId || !rol) {
      return NextResponse.json(
        { error: 'userId en rol zijn verplicht.' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ rol: rol as UserRole })
      .eq('id', userId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    await adminClient.from('audit_log').insert({
      gebruiker_id: user.id,
      actie: 'rol_gewijzigd',
      module: 'team',
      omschrijving: `Rol gewijzigd naar ${rol} voor gebruiker ${userId}`,
      metadata: { userId, rol },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update rol error:', error)
    return NextResponse.json(
      { error: 'Er ging iets mis bij het wijzigen van de rol.' },
      { status: 500 }
    )
  }
}
