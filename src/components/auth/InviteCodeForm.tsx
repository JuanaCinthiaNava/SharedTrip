'use client'

// src/components/auth/InviteCodeForm.tsx
// RHF + Zod invite-code entry form on the welcome screen (Plan 09).
// On submit: normalizes the code (trim + uppercase) and navigates to /join/{code},
// which performs the anonymous sign-in + membership insert server-side.
// Does NOT call joinTripByCode directly — the route handler must set the session cookie.
// All strings via es.entry.* and es.errors.* — zero hardcoded Spanish text.

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

import { es } from '@/i18n/es'
import { CODE_RE } from '@/lib/utils/invite-code'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

// Zod schema — validates the hybrid code format case-insensitively after trim.
// CODE_RE: /^[A-Za-z0-9]{2,8}-[A-Za-z0-9]{3,6}$/ — accepts TEST-AB12, marr-4f9k, etc.
// Inline validation message shown under the field without a network round-trip.
const schema = z.object({
  code: z
    .string()
    .trim()
    .regex(CODE_RE, { message: es.entry.invalidFormat }),
})

type FormValues = z.infer<typeof schema>

export function InviteCodeForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '' },
    // Validate on blur + submit (NOT keystroke) per UI-SPEC interaction contract
    mode: 'onBlur',
  })

  const onSubmit = (values: FormValues) => {
    // Normalize: trim + uppercase. The RPC also normalizes, but we send a clean value.
    const normalized = values.code.trim().toUpperCase()
    startTransition(() => {
      router.push('/join/' + encodeURIComponent(normalized))
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{es.entry.codeLabel}</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                  placeholder={es.entry.codePlaceholder}
                  aria-label={es.entry.codeLabel}
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            es.entry.submitCta
          )}
        </Button>
      </form>
    </Form>
  )
}
