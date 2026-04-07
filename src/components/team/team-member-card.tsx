'use client'

import { motion } from 'framer-motion'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { Profile } from '@/types'

interface TeamMemberCardProps {
  profile: Profile
}

export function TeamMemberCard({ profile }: TeamMemberCardProps) {
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

        <div className="mt-2">
          <Avatar naam={profile.naam} kleur={profile.kleur} size="lg" />
        </div>

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
      </Card>
    </motion.div>
  )
}
