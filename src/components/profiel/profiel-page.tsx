'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, BellRing, Shield, ShieldCheck, User } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i)
  }
  return buffer
}

async function swReady(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/')
  if (existing?.active) return existing

  let reg: ServiceWorkerRegistration
  try {
    reg = existing ?? await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`SW registratie mislukt: ${msg}`)
  }

  if (reg.active) return reg

  return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`SW niet actief na 20s. Status: installing=${!!reg.installing} waiting=${!!reg.waiting} active=${!!reg.active}`)),
      20_000
    )

    function watchSW(sw: ServiceWorker) {
      sw.addEventListener('statechange', () => {
        if (sw.state === 'activated') { clearTimeout(timeout); resolve(reg) }
        if (sw.state === 'redundant') {
          clearTimeout(timeout)
          reject(new Error('SW installatie mislukt (redundant). Herlaad de pagina en probeer opnieuw.'))
        }
      })
      if (sw.state === 'activated') { clearTimeout(timeout); resolve(reg) }
    }

    if (reg.installing) watchSW(reg.installing)
    else if (reg.waiting) watchSW(reg.waiting)

    reg.addEventListener('updatefound', () => {
      if (reg.installing) watchSW(reg.installing)
    })

    navigator.serviceWorker.ready.then((r) => { clearTimeout(timeout); resolve(r) }).catch(() => {})
  })
}

function NotificatieSectie() {
  const [status, setStatus] = useState<'laden' | 'aan' | 'uit' | 'niet-ondersteund'>('laden')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      setStatus('niet-ondersteund')
      return
    }
    fetch('/api/notifications/subscribe')
      .then((r) => r.json())
      .then((d) => setStatus(d.actief ? 'aan' : 'uit'))
      .catch(() => setStatus('uit'))
  }, [])

  async function aanzetten() {
    setBezig(true)
    setFout(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'denied') {
        setFout('Toestemming geweigerd. Sta notificaties toe via de browserinstellingen.')
        return
      }
      if (permission !== 'granted') return

      let reg: ServiceWorkerRegistration
      try {
        reg = await swReady()
      } catch (swErr) {
        const msg = swErr instanceof Error ? swErr.message : String(swErr)
        console.error('[notificaties] swReady fout:', swErr)
        setFout(`Service worker fout: ${msg}`)
        return
      }

      if (!reg.pushManager) {
        setFout('PushManager niet beschikbaar in deze browser.')
        return
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        setFout('VAPID sleutel ontbreekt. Voeg NEXT_PUBLIC_VAPID_PUBLIC_KEY toe aan de omgevingsvariabelen.')
        return
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      if (!res.ok) throw new Error(`API fout: ${res.status}`)
      setStatus('aan')
    } catch (e) {
      console.error('[notificaties] aanzetten fout:', e)
      setFout(e instanceof Error ? e.message : 'Onbekende fout. Zie browser console.')
    } finally {
      setBezig(false)
    }
  }

  async function uitzetten() {
    setBezig(true)
    setFout(null)
    try {
      const reg = await swReady()
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      await fetch('/api/notifications/subscribe', { method: 'DELETE' })
      setStatus('uit')
    } catch (e) {
      console.error('[notificaties] uitzetten fout:', e)
      setFout(e instanceof Error ? e.message : 'Uitschakelen mislukt.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <BellRing size={18} className="text-[#4A7C59]" />
        <h2 className="text-base font-semibold text-gray-800">Notificaties</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Ontvang meldingen op dit apparaat als er nieuwe notities of familieoverleggen zijn.
      </p>

      {fout && (
        <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{fout}</p>
      )}

      {status === 'laden' && (
        <p className="text-sm text-gray-400">Status laden…</p>
      )}

      {status === 'niet-ondersteund' && (
        <p className="text-sm text-gray-500">Push notificaties worden niet ondersteund door deze browser.</p>
      )}

      {(status === 'aan' || status === 'uit') && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status === 'aan' ? (
              <><Bell size={16} className="text-[#4A7C59]" /><span className="text-sm text-gray-700">Notificaties <span className="font-medium text-[#4A7C59]">aan</span></span></>
            ) : (
              <><BellOff size={16} className="text-gray-400" /><span className="text-sm text-gray-500">Notificaties <span className="font-medium">uit</span></span></>
            )}
          </div>
          {status === 'uit' ? (
            <button
              onClick={aanzetten}
              disabled={bezig}
              className="px-4 py-2 text-sm font-medium bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6b4a] disabled:opacity-50 transition-colors"
            >
              {bezig ? 'Bezig…' : 'Zet notificaties aan'}
            </button>
          ) : (
            <button
              onClick={uitzetten}
              disabled={bezig}
              className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {bezig ? 'Bezig…' : 'Zet notificaties uit'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function BeveiligingSectie() {
  const [heeft2FA, setHeeft2FA] = useState<boolean | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.mfa.listFactors()
      const verified = data?.totp?.some((f) => f.status === 'verified') ?? false
      setHeeft2FA(verified)
    }
    check()
  }, [supabase])

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={18} className="text-[#4A7C59]" />
        <h2 className="text-base font-semibold text-gray-800">Beveiliging</h2>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {heeft2FA === null ? (
            <span className="text-sm text-gray-400">Status laden…</span>
          ) : heeft2FA ? (
            <>
              <ShieldCheck size={16} className="text-[#4A7C59]" />
              <span className="text-sm text-gray-700">Twee-staps verificatie <span className="font-medium text-[#4A7C59]">actief</span></span>
            </>
          ) : (
            <>
              <Shield size={16} className="text-gray-400" />
              <span className="text-sm text-gray-500">Twee-staps verificatie <span className="font-medium">niet ingesteld</span></span>
            </>
          )}
        </div>
        {heeft2FA === false && (
          <Link
            href="/setup-2fa"
            className="px-4 py-2 text-sm font-medium bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6b4a] transition-colors"
          >
            Instellen
          </Link>
        )}
      </div>
    </div>
  )
}

interface ProfielPageProps {
  naam: string
  email: string
  kleur: string
}

export function ProfielPage({ naam, email, kleur }: ProfielPageProps) {
  function getInitials(n: string) {
    return n.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mijn profiel</h1>

      {/* Gebruikersinfo */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-[#4A7C59]" />
          <h2 className="text-base font-semibold text-gray-800">Account</h2>
        </div>
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white"
            style={{ backgroundColor: kleur || '#4A7C59' }}
          >
            {getInitials(naam)}
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">{naam}</p>
            <p className="text-sm text-gray-500">{email}</p>
          </div>
        </div>
      </div>

      {/* Notificaties */}
      <div className="mb-4">
        <NotificatieSectie />
      </div>

      {/* Beveiliging */}
      <BeveiligingSectie />
    </div>
  )
}
