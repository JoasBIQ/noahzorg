import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  borderColor?: string
}

export function Card({ children, className, borderColor }: CardProps) {
  return (
    <div
      className={cn('bg-white rounded-xl shadow-sm p-4', className)}
      style={
        borderColor
          ? { borderLeft: `4px solid ${borderColor}` }
          : undefined
      }
    >
      {children}
    </div>
  )
}
