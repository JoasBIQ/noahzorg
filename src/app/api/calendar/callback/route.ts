import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET
const REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/beheer?calendar=error', request.url))
  }

  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    return NextResponse.redirect(new URL('/beheer?calendar=error', request.url))
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Token exchange failed')
    }

    const tokens = await tokenResponse.json() as {
      access_token: string
      refresh_token?: string
      expires_in?: number
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    const adminClient = createAdminClient()

    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expiry: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      connected_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    }

    const { data: existing } = await adminClient
      .from('calendar_tokens')
      .select('id')
      .limit(1)
      .single()

    if (existing?.id) {
      await adminClient.from('calendar_tokens').update(tokenData).eq('id', existing.id)
    } else {
      await adminClient.from('calendar_tokens').insert(tokenData)
    }

    return NextResponse.redirect(new URL('/beheer?calendar=connected', request.url))
  } catch (err) {
    console.error('[Calendar callback] Error:', err)
    return NextResponse.redirect(new URL('/beheer?calendar=error', request.url))
  }
}
