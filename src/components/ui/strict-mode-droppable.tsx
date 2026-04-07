'use client'

import { useEffect, useState } from 'react'
import { Droppable, type DroppableProps } from '@hello-pangea/dnd'

/**
 * Workaround for @hello-pangea/dnd + React 18 strict mode.
 * Strict mode renders components twice, which breaks Droppable registration.
 * This delays rendering by one animation frame so the droppable registers correctly.
 */
export function StrictModeDroppable({ children, ...props }: DroppableProps) {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true))
    return () => {
      cancelAnimationFrame(animation)
      setEnabled(false)
    }
  }, [])

  if (!enabled) {
    return null
  }

  return <Droppable {...props}>{children}</Droppable>
}
