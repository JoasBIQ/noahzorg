import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // --- Niet-ingelogde gebruikers ---
  if (!user) {
    const isPublic =
      pathname.startsWith('/login') ||
      pathname.startsWith('/invite-accept') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/icons') ||
      pathname === '/manifest.json' ||
      pathname === '/sw.js'
    if (!isPublic) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // --- Ingelogde gebruikers: stuur weg van /login ---
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // --- MFA-check (niet op API-routes of statische bestanden) ---
  const skipMfa =
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/invite-accept') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js'

  if (!skipMfa) {
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    const currentLevel = aalData?.currentLevel  // 'aal1' | 'aal2'
    const nextLevel = aalData?.nextLevel        // 'aal1' (geen MFA) | 'aal2' (MFA ingeschreven)

    const fullyAuthenticated = currentLevel === 'aal2'
    const hasMfaEnrolled = nextLevel === 'aal2'

    if (fullyAuthenticated) {
      // Volledig ingelogd: stuur weg van 2FA-pagina's
      if (pathname === '/setup-2fa' || pathname === '/verify-2fa') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    } else if (hasMfaEnrolled) {
      // 2FA ingeschreven maar nog niet geverifieerd deze sessie
      if (pathname !== '/verify-2fa') {
        return NextResponse.redirect(new URL('/verify-2fa', request.url))
      }
    } else {
      // Geen 2FA ingeschreven → verplichte setup
      if (pathname !== '/setup-2fa') {
        return NextResponse.redirect(new URL('/setup-2fa', request.url))
      }
    }
  }

  return supabaseResponse
}
