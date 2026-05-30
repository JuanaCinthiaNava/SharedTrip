'use client'

// SignOutSection — AlertDialog confirmation before calling the signOut server action.
// Destructive confirm button calls signOut() from src/actions/auth.ts.
// All copy from es.profile; no hardcoded Spanish.

import { signOut } from '@/actions/auth'
import { es } from '@/i18n/es'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export function SignOutSection() {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="destructive" className="w-full" />
        }
      >
        {es.profile.signOutCta}
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{es.profile.signOutDialogHeading}</AlertDialogTitle>
          <AlertDialogDescription>
            {es.profile.signOutDialogBody}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{es.profile.signOutDialogCancel}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => signOut()}
          >
            {es.profile.signOutDialogConfirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
