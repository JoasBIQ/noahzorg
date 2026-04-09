'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Shield, Smartphone, Copy, CheckCircle, Loader2, ChevronRight } from 'lucide-react'
import Image from 'next/image'

type Step = 'loading' | 'scan' | 'confirm' | 'done'

export default function Setup2FAPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('loading')
  const [factorId, setFactorId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function enroll() {
      // Controleer of er al een niet-bevestigde factor is en verwijder die eerst
      const { data: factorsData } = await supabase.auth.mfa.listFactors()
      const existing = factorsData?.totp?.find((f) => f.status !== 'verified')
      if (existing) {
        await supabase.auth.mfa.unenroll({ factorId: existing.id })
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: "Noah's Zorg",
        friendlyName: 'Authenticator',
      })

      if (error || !data) {
        console.error('[setup-2fa] enroll fout:', error)
        setError('Inschrijving mislukt. Probeer de pagina te vernieuwen.')
        setStep('scan')
        return
      }

      console.log('[setup-2fa] enroll ok — factorId:', data.id, '| qr_code lengte:', data.totp.qr_code?.length)
      setFactorId(data.id)
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
      setStep('scan')
    }

    enroll()
  }, [supabase])

  const handleVerify = async () => {
    if (code.length !== 6) return
    setVerifying(true)
    setError('')

    // Challenge aanvragen
    const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeErr || !challengeData) {
      setError('Verificatie aanvragen mislukt. Probeer opnieuw.')
      setVerifying(false)
      return
    }

    // Verificatie met de ingevoerde code
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    })

    if (verifyErr) {
      setError('Ongeldige code. Controleer je authenticator-app en probeer opnieuw.')
      setCode('')
      setVerifying(false)
      return
    }

    setStep('done')
    setTimeout(() => {
      router.push('/')
      router.refresh()
    }, 1500)
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
          <p className="text-[#6B7280] text-sm mt-1">Twee-staps verificatie instellen</p>
        </div>

        {/* Beveiligingsuitleg */}
        <div className="bg-[#4A7C59]/8 border border-[#4A7C59]/20 rounded-xl px-4 py-3 mb-6 flex gap-3">
          <Shield size={18} className="text-[#4A7C59] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#374151]">
            Deze app bevat gevoelige informatie over Noah. Twee-staps verificatie beschermt zijn gegevens.
          </p>
        </div>

        {step === 'loading' && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[#4A7C59]" />
          </div>
        )}

        {step === 'scan' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Stap 1 — Scan de QR-code</h2>
              <p className="text-sm text-[#6B7280]">
                Open <strong>Google Authenticator</strong>, <strong>Authy</strong> of een andere TOTP-app
                en scan de QR-code.
              </p>
            </div>

            {/* QR-code — Supabase geeft een data URI terug (data:image/svg+xml;utf-8,...) */}
            {qrCode ? (
              <div className="flex justify-center">
                <div className="p-3 bg-white border-2 border-gray-200 rounded-xl inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="QR-code voor authenticator" width={160} height={160} />
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-40 h-40 rounded-xl bg-gray-100 animate-pulse" />
              </div>
            )}

            {/* Handmatige sleutel */}
            <div>
              <p className="text-xs text-[#6B7280] mb-1.5">Of voer de sleutel handmatig in:</p>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                <code className="flex-1 text-xs font-mono text-gray-700 tracking-wide break-all">
                  {secret}
                </code>
                <button onClick={copySecret} className="text-[#6B7280] hover:text-gray-900 flex-shrink-0">
                  {copied ? <CheckCircle size={15} className="text-[#4A7C59]" /> : <Copy size={15} />}
                </button>
              </div>
            </div>

            <button
              onClick={() => setStep('confirm')}
              disabled={!qrCode}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#4A7C59] text-white font-medium hover:bg-[#3d6a4a] disabled:opacity-50 transition-colors"
            >
              Ik heb de code gescand
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Stap 2 — Bevestig de koppeling</h2>
              <p className="text-sm text-[#6B7280]">
                Voer de 6-cijferige code in die je authenticator-app toont om de koppeling te bevestigen.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Verificatiecode
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerify() }}
                placeholder="123456"
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 focus:border-[#4A7C59] transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setStep('scan'); setCode(''); setError('') }}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-sm font-medium text-[#6B7280] hover:bg-gray-50 transition-colors"
              >
                Terug
              </button>
              <button
                onClick={handleVerify}
                disabled={code.length !== 6 || verifying}
                className="flex-2 flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#4A7C59] text-white font-medium hover:bg-[#3d6a4a] disabled:opacity-50 transition-colors"
              >
                {verifying ? <Loader2 size={16} className="animate-spin" /> : null}
                {verifying ? 'Verifiëren...' : 'Bevestigen'}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="bg-white rounded-2xl border border-green-200 p-6 text-center space-y-3">
            <div className="flex justify-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CheckCircle size={28} className="text-green-600" />
              </div>
            </div>
            <h2 className="text-base font-semibold text-gray-900">Twee-staps verificatie actief</h2>
            <p className="text-sm text-[#6B7280]">Je account is beveiligd. Je wordt nu doorgestuurd...</p>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-[#6B7280]">
          <Smartphone size={13} />
          <span>Werkt met Google Authenticator, Authy en andere TOTP-apps</span>
        </div>
      </div>
    </div>
  )
}
