'use client'

// ProfileNameEditor — RHF form to update the user's display name.
// Pre-fills with initialDisplayName ?? auto-generated name from avatar.ts.
// Calls updateProfile server action on submit.

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { getAvatarData } from '@/lib/utils/avatar'
import { updateProfile } from '@/actions/profile'
import { es } from '@/i18n/es'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const schema = z.object({
  displayName: z
    .string()
    .min(1, es.profile.invalidName)
    .max(60, es.profile.invalidName),
})

type FormValues = z.infer<typeof schema>

interface ProfileNameEditorProps {
  initialDisplayName: string | null
  userId: string
  avatarSeed: string | null
}

export function ProfileNameEditor({
  initialDisplayName,
  userId,
  avatarSeed,
}: ProfileNameEditorProps) {
  const [isPending, startTransition] = useTransition()

  const autoName = getAvatarData(userId, avatarSeed).displayName
  const defaultName = initialDisplayName ?? autoName

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: defaultName },
  })

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const { error } = await updateProfile({ displayName: values.displayName })
      if (error) {
        toast.error(error)
      } else {
        toast.success(es.profile.savedToast)
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{es.profile.displayNameLabel}</FormLabel>
              <FormControl>
                <Input
                  placeholder={es.profile.displayNamePlaceholder}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? '...' : es.profile.saveCta}
        </Button>
      </form>
    </Form>
  )
}
