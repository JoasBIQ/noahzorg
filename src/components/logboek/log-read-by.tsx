'use client'

import { useState } from 'react'
import { Eye } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import type { Profile } from '@/types'

interface LogReadByProps {
  gelezenDoor: string[]
  allProfiles: Profile[]
}

export function LogReadBy({ gelezenDoor, allProfiles }: LogReadByProps) {
  const [expanded, setExpanded] = useState(false)

  const readers = gelezenDoor
    .map((id) => allProfiles.find((p) => p.id === id))
    .filter(Boolean) as Profile[]

  if (readers.length === 0) return null

  return (
    <div className="flex items-center gap-1.5">
      <Eye size={12} className="text-muted shrink-0" />
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-0.5 group"
      >
        {/* Stacked small avatars, max 5 visible */}
        <div className="flex -space-x-1.5">
          {readers.slice(0, 5).map((reader) => (
            <div
              key={reader.id}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white border-2 border-white shrink-0"
              style={{ backgroundColor: reader.kleur }}
              title={reader.naam}
            >
              {reader.naam.charAt(0).toUpperCase()}
            </div>
          ))}
          {readers.length > 5 && (
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-gray-500 bg-gray-100 border-2 border-white shrink-0">
              +{readers.length - 5}
            </div>
          )}
        </div>
        <span className="text-[11px] text-muted ml-1 group-hover:text-gray-700 transition-colors">
          Gelezen door {readers.length}
        </span>
      </button>

      {/* Expanded names list */}
      {expanded && (
        <div className="ml-1 flex items-center gap-1 flex-wrap">
          {readers.map((reader, i) => (
            <span key={reader.id} className="text-[11px] text-muted">
              {reader.naam}
              {i < readers.length - 1 && ','}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
