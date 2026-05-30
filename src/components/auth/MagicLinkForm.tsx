'use client'

// src/components/auth/MagicLinkForm.tsx
// RHF + Zod email validation form. Calls the sendMagicLink server action on submit.
// On success: navigates to /auth/check-email?email=...
// On error: shows a Sonner toast with the Spanish error message.
// All strings via es.* — zero hardcoded Spanish text.

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { sendMagicLink } from '@/actions/auth'
import { es } from '@/i18n/es'
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

// Zod schema for email validation — uses es.errors string for the error message
const schema = z.object({
  email: z.string().email({ message: es.errors.sendLinkFailed }),
})

type FormValues = z.infer<typeof schema>

export function MagicLinkForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
    // Validate on blur + submit (NOT keystroke) per UI-SPEC interaction contract
    mode: 'onBlur',
  })

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const { error } = await sendMagicLink(values.email)

      if (error) {
        // Show Spanish error toast — duration 6s per UI-SPEC error toast duration
        toast.error(es.errors.sendLinkFailed, { duration: 6000 })
        return
      }

      // Success: navigate to check-email confirmation screen
      router.push(`/auth/check-email?email=${encodeURIComponent(values.email)}`)
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{es.auth.emailLabel}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder={es.auth.emailPlaceholder}
                  aria-label={es.auth.emailLabel}
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
            es.auth.sendLinkCta
          )}
        </Button>
      </form>
    </Form>
  )
}
