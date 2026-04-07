import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens } from '@/lib/gmail'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('[Gmail callback] OAuth error:', error)
      return NextResponse.redirect(new URL('/beheer?gmail=error', request.url))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/beheer?gmail=error', request.url))
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    await exchangeCodeForTokens(code, user.id)

    return NextResponse.redirect(new URL('/beheer?gmail=connected', request.url))
  } catch (error) {
    console.error('[Gmail callback] Error:', error)
    return NextResponse.redirect(new URL('/beheer?gmail=error', request.url))
  }
}
