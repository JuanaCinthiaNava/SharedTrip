// Itin tab — Phase 1 empty state.
// Phase 4 will replace this with the shared itinerary with realtime updates.

import { Calendar } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { es } from '@/i18n/es'

export default function ItinPage() {
  return (
    <EmptyState
      icon={Calendar}
      heading={es.tabs.itinEmptyHeading}
      body={es.tabs.itinEmptyBody}
    />
  )
}
