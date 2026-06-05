// src/app/trips/nueva/page.tsx — Create trip screen (Plan 02-02)
// Renders CreateTripForm. The form's submit POSTs to /trips/new (route handler),
// which calls createTrip (service-role) and redirects into the new trip.
// All strings via es.trip.* — zero hardcoded Spanish text.

import { Wordmark } from '@/components/common/Wordmark'
import { CreateTripForm } from '@/components/trip/CreateTripForm'
import { es } from '@/i18n/es'

export default function NewTripPage() {
  return (
    <main className="mx-auto max-w-md px-4 min-h-dvh flex flex-col py-12">
      {/* Header */}
      <div className="flex flex-col items-center pt-4 pb-8">
        <Wordmark size="sm" />
      </div>

      {/* Heading */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold leading-[1.2] text-fg">
          {es.trip.createCta}
        </h1>
      </div>

      {/* Create form */}
      <CreateTripForm />
    </main>
  )
}
