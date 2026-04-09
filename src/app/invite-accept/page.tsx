'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Shield } from 'lucide-react'
import Image from 'next/image'

type Step = 'loading' | 'form' | 'error'

export default function InviteAcceptPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('loading')
  const [naam, setNaam] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [bevestig, setBevestig] = useState('')
  const [showWachtwoord, setShowWachtwoord] = useState(false)
  const [showBevestig, setShowBevestig] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  function applySession(user: { id: string; user_metadata?: Record<string, unknown> }) {
    setUserId(user.id)
    const metaNaam = user.user_metadata?.naam as string | undefined
    if (metaNaam) setNaam(metaNaam)
    setStep('form')
  }

  useEffect(() => {
    // Debug: log what's in the URL
    console.log('[invite-accept] href:', window.location.href)
    console.log('[invite-accept] search:', window.location.search)
    console.log('[invite-accept] hash:', window.location.hash)

    // ── PKCE flow: Supabase stuurt ?code=xxx naar de pagina ──────────────
    const searchParams = new URLSearchParams(window.location.search)
    const code = searchParams.get('code')
    if (code) {
      console.log('[invite-accept] PKCE code gevonden, exchangeCodeForSession aanroepen...')
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        console.log('[invite-accept] exchangeCodeForSession result:', { user: data.session?.user?.email, error })
        if (data.session?.user) {
          applySession(data.session.user)
        } else {
          console.error('[invite-accept] exchange mislukt:', error)
          setStep('error')
        }
      })
      return
    }

    // ── Hash / implicit flow: #access_token=...&type=invite ──────────────
    // Supabase browser client verwerkt de hash automatisch en triggert
    // SIGNED_IN of PASSWORD_RECOVERY zodra de tokens verwerkt zijn.
    // BELANGRIJK: INITIAL_SESSION met null sessie vuren VOOR de hash
    // verwerkt is — die moet genegeerd worden.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[invite-accept] onAuthStateChange:', event, 'user:', session?.user?.email ?? 'geen')

      if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED')) {
        applySession(session.user)
      }
      // INITIAL_SESSION zonder sessie wordt genegeerd — de hash wordt
      // asynchroon verwerkt, SIGNED_IN volgt daarna vanzelf.
    })

    // Fallback: misschien is de sessie al aanwezig (bijv. na page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[invite-accept] getSession:', session?.user?.email ?? 'geen sessie')
      if (session?.user) {
        applySession(session.user)
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Timeout: als er na 12 seconden nog steeds geen sessie is, toon fout
  useEffect(() => {
    const timer = setTimeout(() => {
      setStep((prev) => {
        if (prev === 'loading') {
          console.warn('[invite-accept] Timeout bereikt, geen sessie ontvangen.')
          return 'error'
        }
        return prev
      })
    }, 12000)
    return () => clearTimeout(timer)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!naam.trim()) { setFormError('Vul je naam in.'); return }
    if (wachtwoord.length < 8) { setFormError('Wachtwoord moet minimaal 8 tekens bevatten.'); return }
    if (wachtwoord !== bevestig) { setFormError('Wachtwoorden komen niet overeen.'); return }

    setSaving(true)

    // Wachtwoord instellen + naam bijwerken in auth metadata
    const { error: updateError } = await supabase.auth.updateUser({
      password: wachtwoord,
      data: { naam: naam.trim() },
    })

    if (updateError) {
      setFormError('Account aanmaken mislukt: ' + updateError.message)
      setSaving(false)
      return
    }

    // Naam bijwerken in profiles tabel
    if (userId) {
      await supabase
        .from('profiles')
        .update({ naam: naam.trim() })
        .eq('id', userId)
    }

    // Doorsturen naar 2FA setup
    router.push('/setup-2fa')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F9FAFB]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#4A7C59]/10 mb-4 overflow-hidden">
            <Image src="/icons/icon-192x192.png" alt="Noah's Zorg" width={56} height={56} />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Noah&apos;s Zorg</h1>
          <p className="text-[#6B7280] text-sm mt-1">Je bent uitgenodigd om deel te nemen</p>
        </div>

        {/* Loading */}
        {step === 'loading' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin text-[#4A7C59]" />
            <p className="text-sm text-[#6B7280]">Uitnodiging verwerken...</p>
            <p className="text-xs text-gray-400 text-center">
              Even geduld, je uitnodiging wordt gecontroleerd.
            </p>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="bg-white rounded-2xl border border-red-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={18} className="text-red-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Uitnodiging niet gevonden</h2>
                <p className="text-sm text-[#6B7280] mt-0.5">
                  De link is verlopen of ongeldig. Vraag de beheerder om een nieuwe uitnodiging te sturen.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Terug naar inloggen
            </button>
          </div>
        )}

        {/* Form */}
        {step === 'form' && (
          <>
            {/* Welkom banner */}
            <div className="bg-[#4A7C59]/8 border border-[#4A7C59]/20 rounded-xl px-4 py-3 mb-5 flex gap-3">
              <CheckCircle size={18} className="text-[#4A7C59] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#374151]">
                Welkom bij <strong>Noah&apos;s Zorg</strong>! Stel hieronder je naam en wachtwoord in om je account af te ronden.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              {/* Naam */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Weergavenaam
                </label>
                <input
                  type="text"
                  value={naam}
                  onChange={(e) => setNaam(e.target.value)}
                  placeholder="Jouw naam"
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] transition-colors"
                />
              </div>

              {/* Wachtwoord */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Wachtwoord kiezen <span className="text-[#6B7280] font-normal">(min. 8 tekens)</span>
                </label>
                <div className="relative">
                  <input
                    type={showWachtwoord ? 'text' : 'password'}
                    value={wachtwoord}
                    onChange={(e) => setWachtwoord(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWachtwoord((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showWachtwoord ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Wachtwoord bevestigen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Wachtwoord bevestigen
                </label>
                <div className="relative">
                  <input
                    type={showBevestig ? 'text' : 'password'}
                    value={bevestig}
                    onChange={(e) => setBevestig(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBevestig((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showBevestig ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {bevestig && (
                  <p className={`text-xs mt-1.5 ${wachtwoord === bevestig ? 'text-green-600' : 'text-red-500'}`}>
                    {wachtwoord === bevestig ? '✓ Wachtwoorden komen overeen' : '✗ Wachtwoorden komen niet overeen'}
                  </p>
                )}
              </div>

              {formError && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#4A7C59] text-white font-medium hover:bg-[#3d6a4a] disabled:opacity-50 transition-colors mt-2"
              >
                {saving ? (
                  <><Loader2 size={16} className="animate-spin" /> Bezig...</>
                ) : (
                  'Maak account aan'
                )}
              </button>
            </form>

            {/* Volgende stap hint */}
            <div className="flex items-center justify-center gap-2 mt-5 text-xs text-[#6B7280]">
              <Shield size={13} />
              <span>Daarna stel je twee-staps verificatie in voor extra beveiliging</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
