// Gente tab — Phase 1 empty state.
// Phase 2 will replace this with the trip member list.

import { Users } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { es } from '@/i18n/es'

export default function GentePage() {
  return (
    <EmptyState
      icon={Users}
      heading={es.tabs.genteEmptyHeading}
      body={es.tabs.genteEmptyBody}
    />
  )
}
