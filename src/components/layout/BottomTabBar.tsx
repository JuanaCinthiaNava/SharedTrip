'use client'

// BottomTabBar — fixed 4-tab navigation for the trip shell.
// Active state: coral underline (border-b-2) + coral icon + coral label text.
// Inactive state: fg-muted icon + label text.
// Uses env(safe-area-inset-bottom) for iPhone home indicator clearance.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, Calendar, Users, User } from 'lucide-react'
import { es } from '@/i18n/es'

interface BottomTabBarProps {
  tripId: string
}

const TABS = [
  { key: 'docs', label: es.tabs.docs, icon: FileText, path: 'docs' },
  { key: 'itin', label: es.tabs.itin, icon: Calendar, path: 'itin' },
  { key: 'gente', label: es.tabs.gente, icon: Users, path: 'gente' },
  { key: 'perfil', label: es.tabs.perfil, icon: User, path: 'perfil' },
] as const

export function BottomTabBar({ tripId }: BottomTabBarProps) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 h-14 bg-surface border-t border-border pb-[env(safe-area-inset-bottom)]"
      aria-label={es.tabs.docs}
    >
      <div className="flex items-stretch h-full">
        {TABS.map(({ key, label, icon: Icon, path }) => {
          const href = `/t/${tripId}/${path}`
          const isActive = pathname.startsWith(`/t/${tripId}/${path}`)

          return (
            <Link
              key={key}
              href={href}
              className={`
                flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px]
                ${isActive
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-fg-muted'
                }
              `}
            >
              <Icon size={24} aria-hidden="true" />
              <span className="text-[14px] font-normal leading-[1.4]">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
