'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MoreVertical,
  CheckCircle2,
  Clock,
  ShieldCheck,
  UserX,
  User,
  Mail,
  Loader2,
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { Profile } from '@/types'

interface TeamMemberCardProps {
  profile: Profile
  isBeheerder: boolean
  currentUserId: string
  emailBevestigd: boolean
  onRolChange?: (userId: string, newRol: 'gebruiker' | 'beheerder') => Promise<void>
  onDeactivate?: (userId: string) => Promise<void>
}

function MemberMenu({
  profile,
  onRolChange,
  onDeactivate,
}: {
  profile: Profile
  onRolChange?: (userId: string, newRol: 'gebruiker' | 'beheerder') => Promise<void>
  onDeactivate?: (userId: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleRolChange = async () => {
    setOpen(false)
    setLoading(true)
    try {
      const newRol = profile.rol === 'gebruiker' ? 'beheerder' : 'gebruiker'
      await onRolChange?.(profile.id, newRol)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivate = async () => {
    setOpen(false)
    setLoading(true)
    try {
      await onDeactivate?.(profile.id)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
        aria-label="Opties"
      >
        {loading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <MoreVertical size={15} />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[160px] py-1 overflow-hidden"
          >
            {profile.rol === 'gebruiker' ? (
              <button
                onClick={handleRolChange}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ShieldCheck size={13} className="text-gray-400" />
                Maak beheerder
              </button>
            ) : (
              <button
                onClick={handleRolChange}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User size={13} className="text-gray-400" />
                Maak gebruiker
              </button>
            )}
            <div className="my-1 border-t border-gray-100" />
            <button
              onClick={handleDeactivate}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <UserX size={13} className="text-red-400" />
              Deactiveer
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function TeamMemberCard({
  profile,
  isBeheerder,
  currentUserId,
  emailBevestigd,
  onRolChange,
  onDeactivate,
}: TeamMemberCardProps) {
  const showMenu = isBeheerder && profile.id !== currentUserId && profile.actief

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="flex flex-col items-center text-center p-6 relative overflow-hidden">
        {/* Kleur indicator strip */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: profile.kleur }}
        />

        {/* Menu button */}
        {showMenu && (
          <div className="absolute top-2 right-2">
            <MemberMenu
              profile={profile}
              onRolChange={onRolChange}
              onDeactivate={onDeactivate}
            />
          </div>
        )}

        <div className={`mt-2 ${!profile.actief ? 'opacity-60' : ''}`}>
          <Avatar naam={profile.naam} kleur={profile.kleur} size="lg" />
        </div>

        <div className={!profile.actief ? 'opacity-60' : ''}>
          <h3 className="mt-3 text-base font-semibold text-gray-900">
            {profile.naam}
          </h3>

          <Badge
            className={
              profile.rol === 'beheerder'
                ? 'bg-purple-100 text-purple-800 mt-2'
                : 'bg-gray-100 text-gray-700 mt-2'
            }
          >
            {profile.rol === 'beheerder' ? 'Beheerder' : 'Gebruiker'}
          </Badge>

          {/* Status badge */}
          <div className="mt-2 flex justify-center">
            {!profile.actief ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                <UserX size={11} />
                Gedeactiveerd
              </span>
            ) : !emailBevestigd ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                <Mail size={11} />
                Uitgenodigd
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <CheckCircle2 size={11} />
                Actief
              </span>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
