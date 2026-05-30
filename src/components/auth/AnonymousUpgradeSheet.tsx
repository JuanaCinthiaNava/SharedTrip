'use client'

// AnonymousUpgradeSheet — email-only upgrade form for anonymous users.
// Calls supabase.auth.updateUser({ email }) CLIENT-SIDE (browser factory) per RESEARCH Pattern 4.
// The SDK sends a confirmation email; user remains anonymous until they click the link.
// Known Supabase gotcha (issue #29350): updateUser may auto-verify and flip is_anonymous to false
// immediately without requiring the link click — both behaviors are handled (toast shown either way).
// All strings via es.anon.* — zero hardcoded Spanish.

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

// Zod schema: email must be a valid email address
const upgradeSchema = z.object({
  email: z.string().email({ message: es.errors.sendLinkFailed }),
})

type UpgradeFormValues = z.infer<typeof upgradeSchema>

interface AnonymousUpgradeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AnonymousUpgradeSheet({ open, onOpenChange }: AnonymousUpgradeSheetProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<UpgradeFormValues>({
    resolver: zodResolver(upgradeSchema),
    defaultValues: { email: '' },
    mode: 'onBlur',
  })

  const onSubmit = (values: UpgradeFormValues) => {
    startTransition(async () => {
      // updateUser is called CLIENT-SIDE per RESEARCH Pattern 4 —
      // the SDK needs browser cookie context to update the session JWT.
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ email: values.email })

      if (error) {
        toast.error(es.errors.genericNetwork, { duration: 6000 })
        return
      }

      // Success — show confirmation toast and close the sheet
      // Note: Supabase may auto-verify (issue #29350) — toast is correct either way
      toast.success(es.anon.upgradeSuccessToast(values.email), { duration: 6000 })
      onOpenChange(false)
      form.reset()
    })
  }

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => onOpenChange(nextOpen)}>
      <SheetContent side="bottom" showCloseButton className="pb-safe px-4 pb-6">
        <SheetHeader className="px-0 pb-4">
          <SheetTitle className="text-[20px] font-bold text-fg">
            {es.anon.upgradeSheetHeading}
          </SheetTitle>
          <SheetDescription className="text-base text-fg-muted">
            {es.anon.upgradeSheetBody}
          </SheetDescription>
        </SheetHeader>

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
                  <FormLabel>{es.anon.upgradeEmailLabel}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder={es.auth.emailPlaceholder}
                      aria-label={es.anon.upgradeEmailLabel}
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
                es.anon.upgradeSubmitCta
              )}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
