'use client'

// src/components/trip/CreateTripForm.tsx — RHF + Zod v4 trip create/edit form (D-03, TRIP-01)
// Reused pre-filled for edit in 02-05 via optional defaultValues + onSubmit override.
//
// Submit behaviour (create path): POSTs JSON body to /trips/new route handler.
// The route handler calls createTrip (service-role) and redirects into the trip.
//
// Date serialization: use toLocalDateString — never UTC-shifting ISO serializers
// See RESEARCH Pitfall 2.
//
// Analog: src/components/auth/InviteCodeForm.tsx (RHF+Zod pattern, Loader2 pending button)

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { toast } from 'sonner'
import { es } from '@/i18n/es'
import { toLocalDateString } from '@/lib/utils/date-format'
import { parseLocalDate } from '@/lib/utils/date-format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { TripDatePicker } from './TripDatePicker'

// Zod v4 schema (project is on ^4.4.3 — write v4, not v3)
const schema = z
  .object({
    name: z.string().trim().min(1, es.trip.invalidName).max(80, es.trip.invalidName),
    // DateRange (react-day-picker) has `from: Date | undefined` — use z.custom to match
    dateRange: z.custom<DateRange | undefined>().optional(),
    description: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      // end >= start validation (D-04): only checked when both dates are present
      if (data.dateRange?.from && data.dateRange?.to) {
        return data.dateRange.to >= data.dateRange.from
      }
      return true
    },
    {
      message: es.trip.invalidDateRange,
      path: ['dateRange'],
    }
  )

type FormValues = z.infer<typeof schema>

interface TripFormDefaults {
  name?: string
  startDate?: string | null
  endDate?: string | null
  description?: string | null
}

interface CreateTripFormProps {
  /** Pre-fill for edit mode (02-05). Omit for create mode. */
  defaultValues?: TripFormDefaults
  /**
   * Override submit handler for edit mode (02-05).
   * If omitted, form POSTs to /trips/new (create path).
   */
  onSubmit?: (values: {
    name: string
    startDate: string | null
    endDate: string | null
    description: string | null
  }) => Promise<void>
}

export function CreateTripForm({ defaultValues, onSubmit: onSubmitOverride }: CreateTripFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Build initial dateRange from existing start/end date strings (edit mode)
  const initialDateRange: DateRange | undefined =
    defaultValues?.startDate
      ? {
          from: parseLocalDate(defaultValues.startDate),
          to: defaultValues.endDate ? parseLocalDate(defaultValues.endDate) : undefined,
        }
      : undefined

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      dateRange: initialDateRange,
      description: defaultValues?.description ?? '',
    },
    mode: 'onBlur',
  })

  function handleSubmit(values: FormValues) {
    const startDate =
      values.dateRange?.from ? toLocalDateString(values.dateRange.from) : null
    const endDate =
      values.dateRange?.to ? toLocalDateString(values.dateRange.to) : null
    const description =
      values.description?.trim() ? values.description.trim() : null

    startTransition(async () => {
      if (onSubmitOverride) {
        // Edit mode: caller handles the action + navigation
        await onSubmitOverride({ name: values.name, startDate, endDate, description })
        return
      }

      // Create mode: POST to /trips/new route handler which sets the session cookie + redirects
      try {
        const res = await fetch('/trips/new', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: values.name, startDate, endDate, description }),
          redirect: 'follow',
        })

        if (res.ok || res.redirected) {
          // The route handler returns a redirect — follow it by navigating to the final URL
          router.push(res.url)
        } else {
          // Non-redirect error response — surface it instead of a silent dead-end (WR-06)
          toast.error(es.errors.genericNetwork)
        }
      } catch {
        // Network failure (e.g. offline) — fetch rejected (WR-06)
        toast.error(es.errors.genericNetwork)
      }
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-5"
        noValidate
      >
        {/* Nombre (required) */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{es.trip.nameLabel}</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder={es.trip.namePlaceholder}
                  autoComplete="off"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Fechas (optional, clearable range) */}
        <Controller
          control={form.control}
          name="dateRange"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{es.trip.datesLabel}</FormLabel>
              <FormControl>
                <TripDatePicker
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              {fieldState.error && (
                <p className="text-sm text-destructive">{fieldState.error.message}</p>
              )}
            </FormItem>
          )}
        />

        {/* Descripción (optional) */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{es.trip.descriptionLabel}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder=""
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            es.trip.saveCta
          )}
        </Button>
      </form>
    </Form>
  )
}
