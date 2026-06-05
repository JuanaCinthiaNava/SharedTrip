'use client'

// src/components/trip/TripDatePicker.tsx — clearable range date picker (D-03, D-04)
// Wraps the shadcn Calendar in mode="range" with an explicit "Sin fechas todavía" clear button.
//
// DO NOT pass `required` to <Calendar> — it makes the range un-clearable (D-03/D-04).
// Dates are optional; the "Sin fechas" button calls onChange(undefined) to clear.
// RESEARCH Pattern 3 (lines 279-305).

import { Calendar } from '@/components/ui/calendar'
import { es } from '@/i18n/es'
import type { DateRange } from 'react-day-picker'

interface TripDatePickerProps {
  value?: DateRange
  onChange: (range: DateRange | undefined) => void
}

export function TripDatePicker({ value, onChange }: TripDatePickerProps) {
  return (
    <div className="flex flex-col items-start gap-2">
      <Calendar
        mode="range"
        // DO NOT pass `required` — `required` makes the range un-clearable.
        // Dates are optional (D-03); a separate "Sin fechas" button calls onChange(undefined).
        selected={value}
        onSelect={onChange}
        numberOfMonths={1}
      />
      <button
        type="button"
        onClick={() => onChange(undefined)}
        className="min-h-11 text-sm text-muted-foreground hover:text-foreground transition-colors px-1"
      >
        {es.trip.noDates}
      </button>
    </div>
  )
}
