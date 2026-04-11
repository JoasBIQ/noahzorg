'use client'

import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'

const LS_GEWEIGERD = 'notificatie_geweigerd'
const SS_GEZIEN = 'notificatie_banner_gezien'

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
  const reg = existing ?? await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  if (reg.active) return reg
  return navigator.serviceWorker.ready
}

/**
 * Toont een groene banner als de gebruiker nog geen push notificaties heeft
 * ingeschakeld. Verdwijnt zodra notificaties worden aangezet of als de
 * gebruiker op "Niet nu" klikt. Wordt eenmalig per sessie getoond.
 */
export function NotificatieBanner() {
  const [zichtbaar, setZichtbaar] = useState(false)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  useEffect(() => {
    // Browserondersteuning nodig voor push notificaties
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) return

    // Gebruiker heeft eerder bewust geweigerd → nooit meer tonen
    if (localStorage.getItem(LS_GEWEIGERD)) return

    // Al een keer getoond deze sessie → niet opnieuw tonen
    if (sessionStorage.getItem(SS_GEZIEN)) return

    // Browser heeft toestemming geblokkeerd → kan toch niet aanzetten
    if (Notification.permission === 'denied') return

    // Toestemming al gegeven → controleer of er ook een actieve subscription is
    if (Notification.permission === 'granted') {
      fetch('/api/notifications/subscribe')
        .then((r) => r.json())
        .then((d) => {
          if (!d.actief) {
            // Toestemming wel, subscription niet → toon banner
            sessionStorage.setItem(SS_GEZIEN, '1')
            setZichtbaar(true)
          }
          // Subscription actief → banner niet nodig
        })
        .catch(() => {})
      return
    }

    // Toestemming nog niet gevraagd → toon de banner
    sessionStorage.setItem(SS_GEZIEN, '1')
    setZichtbaar(true)
  }, [])

  async function aanzetten() {
    setBezig(true)
    setFout(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'denied') {
        setFout('Toestemming geweigerd. Sta meldingen toe via de browserinstellingen.')
        return
      }
      if (permission !== 'granted') {
        // Gebruiker heeft het dialoogvenster gesloten zonder keuze → sluit de banner
        sluiten()
        return
      }

      const reg = await swReady()
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        setFout('Configuratiefout — neem contact op met de beheerder.')
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
      if (!res.ok) throw new Error(`Opslaan mislukt (${res.status})`)

      setZichtbaar(false)
    } catch (e) {
      console.error('[notificatie-banner] aanzetten fout:', e)
      setFout(e instanceof Error ? e.message : 'Er ging iets mis. Probeer het opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  function sluiten() {
    localStorage.setItem(LS_GEWEIGERD, '1')
    setZichtbaar(false)
  }

  if (!zichtbaar) return null

  return (
    <div className="bg-[#4A7C59] text-white px-4 py-2.5">
      <div className="flex items-center gap-3 max-w-screen-xl mx-auto">
        <Bell size={16} className="flex-shrink-0 opacity-90" />
        <p className="flex-1 text-sm font-medium leading-snug">
          Zet notificaties aan zodat je niets mist rondom Noah. 🔔
        </p>
        {fout && (
          <p className="hidden sm:block text-xs text-red-200 flex-shrink-0 max-w-[180px] leading-tight">
            {fout}
          </p>
        )}
        <button
          onClick={aanzetten}
          disabled={bezig}
          className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold bg-white text-[#4A7C59] rounded-lg hover:bg-gray-50 active:bg-gray-100 disabled:opacity-60 transition-colors"
        >
          {bezig ? 'Bezig…' : 'Aanzetten'}
        </button>
        <button
          onClick={sluiten}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/20 active:bg-white/30 transition-colors"
          aria-label="Niet nu"
          title="Niet nu"
        >
          <X size={15} />
        </button>
      </div>
      {/* Foutmelding op mobiel onder de balk */}
      {fout && (
        <p className="sm:hidden mt-1 text-xs text-red-200 leading-tight">{fout}</p>
      )}
    </div>
  )
}
