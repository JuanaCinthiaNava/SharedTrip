'use client'

// UserAvatar — colored circle with deterministic animal emoji + auto-generated name.
// Background color is the ONE permitted exception to "no hex in components":
// color is always from the curated AVATAR_COLORS triple (#FF6B6B | #3DCCC7 | #FFB627),
// never an arbitrary hex. It must be applied as inline style (not Tailwind class)
// because the value is dynamic and Tailwind cannot generate dynamic bg classes safely.

import { getAvatarData } from '@/lib/utils/avatar'

interface UserAvatarProps {
  userId: string
  avatarSeed?: string | null
  displayName?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASSES = {
  sm: 'w-6 h-6 text-base',
  md: 'w-8 h-8 text-lg',
  lg: 'w-16 h-16 text-3xl',
}

export function UserAvatar({
  userId,
  avatarSeed,
  displayName,
  size = 'md',
}: UserAvatarProps) {
  const { emoji, color, displayName: autoName } = getAvatarData(userId, avatarSeed)
  const label = displayName ?? autoName

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full ${SIZE_CLASSES[size]}`}
      style={{ backgroundColor: color }}
      aria-label={label}
      role="img"
    >
      {emoji}
    </div>
  )
}
