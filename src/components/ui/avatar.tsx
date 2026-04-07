import { cn, getInitials } from '@/lib/utils'

type AvatarSize = 'sm' | 'md' | 'lg'

interface AvatarProps {
  naam: string
  kleur: string
  size?: AvatarSize
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function Avatar({ naam, kleur, size = 'md' }: AvatarProps) {
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold text-white shrink-0',
        sizeStyles[size]
      )}
      style={{ backgroundColor: kleur }}
    >
      {getInitials(naam)}
    </div>
  )
}
