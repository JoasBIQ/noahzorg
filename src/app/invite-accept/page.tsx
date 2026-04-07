'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Heart, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Shield } from 'lucide-react'

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
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // Supabase verwerkt de hash-tokens automatisch via de browser client.
    // We luisteren naar de SIGNED_IN event die wordt getriggerd zodra de
    // uitnodigingstoken verwerkt is.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          const user = session.user
          setUserId(user.id)
          // Vul naam voor in vanuit user metadata (ingesteld door de beheerder)
          const metaNaam = user.user_metadata?.naam as string | undefined
          if (metaNaam) setNaam(metaNaam)
          setStep('form')
        } else if (event === 'INITIAL_SESSION' && !session) {
          // Geen sessie en geen token in de URL → stuur naar login
          setStep('error')
        }
      }
    )

    // Controleer ook direct of er al een sessie is (PKCE code al verwerkt)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const user = session.user
        setUserId(user.id)
        const metaNaam = user.user_metadata?.naam as string | undefined
        if (metaNaam) setNaam(metaNaam)
        setStep('form')
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  // Timeout: als er na 8 seconden nog niets is, toon foutmelding
  useEffect(() => {
    const timer = setTimeout(() => {
      setStep((prev) => {
        if (prev === 'loading') return 'error'
        return prev
      })
    }, 8000)
    return () => clearTimeout(timer)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!naam.trim()) { setError('Vul je naam in.'); return }
    if (wachtwoord.length < 8) { setError('Wachtwoord moet minimaal 8 tekens bevatten.'); return }
    if (wachtwoord !== bevestig) { setError('Wachtwoorden komen niet overeen.'); return }

    setSaving(true)

    // Wachtwoord instellen en naam bijwerken in auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: wachtwoord,
      data: { naam: naam.trim() },
    })

    if (updateError) {
      setError('Account aanmaken mislukt: ' + updateError.message)
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#4A7C59]/10 mb-4">
            <Heart className="w-8 h-8 text-[#4A7C59]" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Noah&apos;s Zorg</h1>
          <p className="text-[#6B7280] text-sm mt-1">Je bent uitgenodigd om deel te nemen</p>
        </div>

        {/* Loading */}
        {step === 'loading' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin text-[#4A7C59]" />
            <p className="text-sm text-[#6B7280]">Uitnodiging verwerken...</p>
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
                {/* Wachtwoord match indicator */}
                {bevestig && (
                  <p className={`text-xs mt-1.5 ${wachtwoord === bevestig ? 'text-green-600' : 'text-red-500'}`}>
                    {wachtwoord === bevestig ? '✓ Wachtwoorden komen overeen' : '✗ Wachtwoorden komen niet overeen'}
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  {error}
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
