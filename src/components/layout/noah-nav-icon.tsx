import Image from 'next/image'

export function NoahNavIcon({ className }: { className?: string; strokeWidth?: number }) {
  // Extract size from className if present (h-5 w-5 = 20px)
  const size = className?.includes('h-5') ? 20 : className?.includes('h-6') ? 24 : 20
  return (
    <Image
      src="/icons/icon-192x192.png"
      alt="Noah"
      width={size}
      height={size}
      className="flex-shrink-0 rounded-sm"
    />
  )
}
