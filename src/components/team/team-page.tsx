'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, UserPlus, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TeamMemberCard } from './team-member-card'
import { USER_COLORS } from '@/lib/constants'
import type { Profile } from '@/types'

interface TeamPageProps {
  profiles: Profile[]
  currentProfile: Profile
  isBeheerder: boolean
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const ROL_OPTIONS = [
  { value: 'gebruiker', label: 'Gebruiker' },
  { value: 'beheerder', label: 'Beheerder' },
]

const KLEUR_OPTIONS = USER_COLORS.map((kleur, index) => ({
  value: kleur,
  label: ['Blauw', 'Groen', 'Geel', 'Roze', 'Paars', 'Oranje'][index],
}))

export function TeamPage({ profiles, currentProfile, isBeheerder }: TeamPageProps) {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [email, setEmail] = useState('')
  const [naam, setNaam] = useState('')
  const [rol, setRol] = useState('gebruiker')
  const [kleur, setKleur] = useState<string>(USER_COLORS[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const resetForm = () => {
    setEmail('')
    setNaam('')
    setRol('gebruiker')
    setKleur(USER_COLORS[0])
    setError(null)
    setSuccess(null)
  }

  const handleInvite = async () => {
    if (!email.trim() || !naam.trim()) {
      setError('Vul alle verplichte velden in.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), naam: naam.trim(), rol, kleur }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Er ging iets mis bij het uitnodigen.')
      }

      setSuccess(`Uitnodiging verstuurd naar ${email}`)
      setTimeout(() => {
        setShowInviteModal(false)
        resetForm()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Header
        title="Rondom Noah"
        action={
          isBeheerder ? (
            <Button size="sm" onClick={() => setShowInviteModal(true)}>
              <span className="flex items-center gap-1.5">
                <UserPlus size={16} />
                Uitnodigen
              </span>
            </Button>
          ) : undefined
        }
      />

      <div className="px-4 py-6 sm:px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-4 lg:grid-cols-3"
        >
          {profiles.map((profile) => (
            <TeamMemberCard key={profile.id} profile={profile} />
          ))}
        </motion.div>
      </div>

      {/* Invite modal */}
      <Modal
        open={showInviteModal}
        onClose={() => {
          setShowInviteModal(false)
          resetForm()
        }}
        title="Teamlid uitnodigen"
      >
        <div className="space-y-4">
          <Input
            label="E-mailadres"
            type="email"
            placeholder="naam@voorbeeld.nl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Naam"
            placeholder="Volledige naam"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
          />

          <Select
            label="Rol"
            options={ROL_OPTIONS}
            value={rol}
            onChange={(e) => setRol(e.target.value)}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Kleur
            </label>
            <div className="flex gap-2">
              {USER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setKleur(color)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    kleur === color
                      ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-accent">{error}</p>
          )}

          {success && (
            <p className="text-sm text-green-600">{success}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowInviteModal(false)
                resetForm()
              }}
            >
              Annuleren
            </Button>
            <Button
              onClick={handleInvite}
              disabled={isSubmitting}
            >
              <span className="flex items-center gap-1.5">
                <Mail size={16} />
                {isSubmitting ? 'Versturen...' : 'Uitnodiging versturen'}
              </span>
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
