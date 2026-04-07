import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Profile } from '@/types'

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
        { error: 'Alleen beheerders kunnen gebruikers deactiveren.' },
        { status: 403 }
      )
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is verplicht.' },
        { status: 400 }
      )
    }

    if (userId === user.id) {
      return NextResponse.json(
        { error: 'Je kunt jezelf niet deactiveren.' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ actief: false })
      .eq('id', userId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    const { error: banError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: '87600h',
    })

    if (banError) {
      console.error('Ban user error:', banError)
    }

    await adminClient.from('audit_log').insert({
      gebruiker_id: user.id,
      actie: 'gedeactiveerd',
      module: 'team',
      omschrijving: `Gebruiker gedeactiveerd: ${userId}`,
      metadata: { userId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Deactivate error:', error)
    return NextResponse.json(
      { error: 'Er ging iets mis bij het deactiveren.' },
      { status: 500 }
    )
  }
}
