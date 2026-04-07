'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Heart, Shield, Loader2 } from 'lucide-react'

export default function Verify2FAPage() {
  const router = useRouter()
  const supabase = createClient()

  const [factorId, setFactorId] = useState<string | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [loadingChallenge, setLoadingChallenge] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function initChallenge() {
      // Haal ingeschreven TOTP factor op
      const { data: factorsData, error: factorsErr } = await supabase.auth.mfa.listFactors()
      if (factorsErr || !factorsData) {
        setError('Kon 2FA-factoren niet ophalen. Vernieuw de pagina.')
        setLoadingChallenge(false)
        return
      }

      const totp = factorsData.totp?.find((f) => f.status === 'verified')
      if (!totp) {
        // Geen geverifieerde factor → stuur naar setup
        router.replace('/setup-2fa')
        return
      }

      setFactorId(totp.id)

      // Maak direct een challenge aan
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: totp.id,
      })

      if (challengeErr || !challengeData) {
        setError('Challenge aanvragen mislukt. Vernieuw de pagina.')
        setLoadingChallenge(false)
        return
      }

      setChallengeId(challengeData.id)
      setLoadingChallenge(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }

    initChallenge()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleVerify = async () => {
    if (!factorId || !challengeId || code.length !== 6 || verifying) return
    setVerifying(true)
    setError('')

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    })

    if (verifyErr) {
      setError('Ongeldige code. Controleer je authenticator-app en probeer opnieuw.')
      setCode('')
      setVerifying(false)
      // Nieuwe challenge aanvragen (challenge verloopt na gebruik)
      const { data: newChallenge } = await supabase.auth.mfa.challenge({ factorId })
      if (newChallenge) setChallengeId(newChallenge.id)
      return
    }

    router.push('/')
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
          <p className="text-[#6B7280] text-sm mt-1">Twee-staps verificatie</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#4A7C59]/10 flex items-center justify-center">
              <Shield size={16} className="text-[#4A7C59]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Verificatiecode invoeren</h2>
              <p className="text-sm text-[#6B7280] mt-0.5">
                Open je authenticator-app en voer de 6-cijferige code in.
              </p>
            </div>
          </div>

          {loadingChallenge ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-[#4A7C59]" />
            </div>
          ) : (
            <>
              <div>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '')
                    setCode(val)
                    setError('')
                    // Automatisch verifiëren zodra 6 cijfers zijn ingevoerd
                    if (val.length === 6) {
                      setTimeout(() => {
                        setCode(val)
                      }, 0)
                    }
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleVerify() }}
                  placeholder="000000"
                  className="w-full px-4 py-4 rounded-xl border border-gray-200 bg-white text-center text-3xl font-mono tracking-[0.6em] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] transition-colors"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <button
                onClick={handleVerify}
                disabled={code.length !== 6 || verifying || !challengeId}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#4A7C59] text-white font-medium hover:bg-[#3d6a4a] disabled:opacity-50 transition-colors"
              >
                {verifying && <Loader2 size={16} className="animate-spin" />}
                {verifying ? 'Verifiëren...' : 'Bevestigen'}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[#6B7280] mt-5">
          Code kwijt?{' '}
          <a
            href="mailto:beheer@noahszorg.nl"
            className="text-[#4A7C59] hover:underline"
          >
            Neem contact op met de beheerder
          </a>
        </p>
      </div>
    </div>
  )
}
