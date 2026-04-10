'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface NamePromptProps {
  profileId: string
  onComplete: (naam: string) => void
}

export function NamePrompt({ profileId, onComplete }: NamePromptProps) {
  const [naam, setNaam] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmed = naam.trim()
    if (trimmed.length < 2) {
      setError('Naam moet minimaal 2 karakters zijn.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ naam: trimmed })
        .eq('id', profileId)

      if (updateError) throw updateError

      onComplete(trimmed)
    } catch {
      setError('Er ging iets mis. Probeer het opnieuw.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FAFAF8]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm mx-4"
      >
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4A7C59] mb-4 overflow-hidden">
            <Image src="/icons/icon-192x192.png" alt="Rondom Noah" width={56} height={56} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welkom bij Rondom Noah
          </h1>
          <p className="text-sm text-[#6B7280] mt-2">
            Hoe wil je dat anderen je zien?
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Weergavenaam"
            value={naam}
            onChange={(e) => {
              setNaam(e.target.value)
              if (error) setError('')
            }}
            placeholder="Je voornaam of roepnaam"
            autoFocus
          />

          {error && (
            <p className="text-sm text-[#C4704F]">{error}</p>
          )}

          <Button
            type="submit"
            disabled={saving || naam.trim().length < 2}
            className="w-full"
          >
            {saving ? 'Opslaan...' : 'Doorgaan'}
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
