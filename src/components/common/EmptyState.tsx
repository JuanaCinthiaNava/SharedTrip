// EmptyState — reusable empty-state primitive.
// Server-Component-compatible: no 'use client' directive.
// CTA is a { label, href } Next Link — keeps server rendering working.

import Link from 'next/link'
import { type LucideIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

interface EmptyStateCta {
  label: string
  href: string
}

interface EmptyStateProps {
  heading: string
  body: string
  icon?: LucideIcon
  cta?: EmptyStateCta
}

export function EmptyState({ heading, body, icon: Icon, cta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <Icon className="w-12 h-12 text-fg-muted mb-4" aria-hidden="true" />
      )}
      <h2 className="text-xl font-bold text-fg leading-[1.3] mb-2">{heading}</h2>
      <p className="text-base text-fg-muted leading-[1.5] max-w-sm">{body}</p>
      {cta && (
        <Link href={cta.href} className={buttonVariants({ variant: 'default' }) + ' mt-6'}>
          {cta.label}
        </Link>
      )}
    </div>
  )
}
