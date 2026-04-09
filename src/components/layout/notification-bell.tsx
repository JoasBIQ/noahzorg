'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useOngelezen } from '@/hooks/use-ongelezen'
import { useProfile } from '@/hooks/use-profile'
import { markeerAlsGezien } from '@/lib/markeer-als-gezien'
import { formatRelative } from '@/lib/utils'

interface NotitieItem {
  id: string
  bericht: string
  auteur_id: string
  auteur_naam?: string
  created_at: string
}

interface MailItem {
  id: string
  from: string
  subject: string
}

interface OverlegItem {
  id: string
  titel: string
  datum_tijd: string
  bespreekpunten?: Array<{ tekst: string }>
}

interface DropdownItems {
  notities: NotitieItem[]
  mail: MailItem[]
  overleggen: OverlegItem[]
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#DC2626] px-1 text-[9px] font-bold text-white leading-none">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<DropdownItems>({ notities: [], mail: [], overleggen: [] })
  const [laden, setLaden] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { totaal, notities: notitiesCount, overleggen: overleggenCount, refresh } = useOngelezen()
  const { user } = useProfile()
  const router = useRouter()
  const supabase = createClient()

  // Sluit bij klik buiten
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const fetchDropdown = useCallback(async () => {
    if (!user) return
    setLaden(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    try {
      // Ongelezen notities
      const { data: gezienNotities } = await db
        .from('user_gezien')
        .select('item_id')
        .eq('user_id', user.id)
        .eq('item_type', 'notitie')

      const gezeienNotitieIds = new Set<string>(
        (gezienNotities ?? []).map((g: { item_id: string }) => g.item_id)
      )

      const { data: alleNotities } = await supabase
        .from('logboek')
        .select('id, bericht, auteur_id, created_at')
        .eq('gearchiveerd', false)
        .neq('auteur_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      const unreadNotities: NotitieItem[] = (alleNotities ?? [])
        .filter((n) => !gezeienNotitieIds.has(n.id))
        .slice(0, 3)

      // Auteur namen ophalen
      if (unreadNotities.length > 0) {
        const auteurIds = Array.from(new Set(unreadNotities.map((n) => n.auteur_id)))
        const { data: profielen } = await supabase
          .from('profiles')
          .select('id, naam')
          .in('id', auteurIds)

        const profielMap = new Map((profielen ?? []).map((p) => [p.id, p.naam]))
        unreadNotities.forEach((n: NotitieItem) => {
          n.auteur_naam = profielMap.get(n.auteur_id) ?? 'Onbekend'
        })
      }

      // Ongelezen overleggen
      const { data: gezienOverleg } = await db
        .from('user_gezien')
        .select('item_id')
        .eq('user_id', user.id)
        .eq('item_type', 'overleg')

      const gezeienOverlegIds = new Set<string>(
        (gezienOverleg ?? []).map((g: { item_id: string }) => g.item_id)
      )

      const { data: alleOverleggen } = await supabase
        .from('overleggen')
        .select('id, titel, datum_tijd, bespreekpunten, aangemaakt_door')
        .neq('aangemaakt_door', user.id)
        .order('datum_tijd', { ascending: false })
        .limit(20)

      const unreadOverleggen: OverlegItem[] = (alleOverleggen ?? [])
        .filter((o) => !gezeienOverlegIds.has(o.id))
        .slice(0, 3)

      // Ongelezen mail via API
      let unreadMail: MailItem[] = []
      try {
        const res = await fetch('/api/gmail/messages?maxResults=10&label=INBOX')
        if (res.ok) {
          const data = await res.json()
          unreadMail = (data.messages ?? [])
            .filter((m: { gelezen?: boolean }) => !m.gelezen)
            .slice(0, 3)
            .map((m: { id: string; from: string; subject: string }) => ({
              id: m.id,
              from: m.from,
              subject: m.subject,
            }))
        }
      } catch {}

      setItems({ notities: unreadNotities, mail: unreadMail, overleggen: unreadOverleggen })
    } finally {
      setLaden(false)
    }
  }, [user, supabase])

  async function markeerAlles() {
    if (!user) return
    const notitieIds = items.notities.map((n) => n.id)
    const overlegIds = items.overleggen.map((o) => o.id)
    await Promise.all([
      markeerAlsGezien(user.id, 'notitie', notitieIds),
      markeerAlsGezien(user.id, 'overleg', overlegIds),
    ])
    refresh()
    setOpen(false)
  }

  const heeftItems = totaal > 0

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v)
          if (!open) fetchDropdown()
        }}
        className="relative p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label="Notificaties"
      >
        {heeftItems ? <Bell size={20} /> : <Bell size={20} />}
        <Badge count={totaal} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[500px] overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-100 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white">
            <span className="text-sm font-semibold text-gray-900">Notificaties</span>
            {heeftItems && (
              <button
                onClick={markeerAlles}
                className="text-xs text-[#4A7C59] hover:underline font-medium"
              >
                Alles als gelezen
              </button>
            )}
          </div>

          {laden ? (
            <p className="text-sm text-gray-400 text-center py-8 animate-pulse">Laden…</p>
          ) : !heeftItems ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
              <BellOff size={24} />
              <p className="text-sm">Geen ongelezen items</p>
            </div>
          ) : (
            <div>
              {/* Notities */}
              {items.notities.length > 0 && (
                <section>
                  <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Notities
                    </span>
                  </div>
                  {items.notities.map((n) => (
                    <button
                      key={n.id}
                      onClick={async () => {
                        if (user) await markeerAlsGezien(user.id, 'notitie', [n.id])
                        router.push('/logboek')
                        setOpen(false)
                        refresh()
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors"
                    >
                      <p className="text-xs font-medium text-gray-500 mb-0.5">
                        {n.auteur_naam} · {formatRelative(n.created_at)}
                      </p>
                      <p className="text-sm text-gray-800 line-clamp-1">
                        {n.bericht?.slice(0, 60)}{(n.bericht?.length ?? 0) > 60 ? '…' : ''}
                      </p>
                    </button>
                  ))}
                  {notitiesCount > 3 && (
                    <button
                      onClick={() => { router.push('/logboek'); setOpen(false) }}
                      className="w-full text-center text-xs text-[#4A7C59] py-2 hover:underline border-b border-gray-50"
                    >
                      +{notitiesCount - 3} meer
                    </button>
                  )}
                </section>
              )}

              {/* Mail */}
              {items.mail.length > 0 && (
                <section>
                  <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Mail
                    </span>
                  </div>
                  {items.mail.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { router.push('/mail'); setOpen(false) }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-800 line-clamp-1">{m.from}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{m.subject}</p>
                    </button>
                  ))}
                </section>
              )}

              {/* Overleggen */}
              {items.overleggen.length > 0 && (
                <section>
                  <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Familieoverleg
                    </span>
                  </div>
                  {items.overleggen.map((o) => (
                    <button
                      key={o.id}
                      onClick={async () => {
                        if (user) await markeerAlsGezien(user.id, 'overleg', [o.id])
                        router.push('/overleggen')
                        setOpen(false)
                        refresh()
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-800">{o.titel}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(o.datum_tijd).toLocaleDateString('nl-NL', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                        {o.bespreekpunten?.[0]?.tekst
                          ? ` · ${o.bespreekpunten[0].tekst.slice(0, 40)}`
                          : ''}
                      </p>
                    </button>
                  ))}
                  {overleggenCount > 3 && (
                    <button
                      onClick={() => { router.push('/overleggen'); setOpen(false) }}
                      className="w-full text-center text-xs text-[#4A7C59] py-2 hover:underline"
                    >
                      +{overleggenCount - 3} meer
                    </button>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
