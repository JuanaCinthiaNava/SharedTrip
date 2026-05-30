// src/app/auth/check-email/page.tsx — Post-magic-link confirmation screen
// Server Component: reads searchParams to display email + error state.
// In Next.js 16, searchParams is async (Promise-based).
// Zero hardcoded Spanish — all strings via es.auth.* and es.errors.*.

import Link from 'next/link'
import { es } from '@/i18n/es'

interface CheckEmailPageProps {
  searchParams: Promise<{ email?: string; error?: string }>
}

export default async function CheckEmailPage({ searchParams }: CheckEmailPageProps) {
  const params = await searchParams
  const email = params.email
  const hasError = params.error === 'invalid_link'

  return (
    <main className="mx-auto max-w-md px-4 min-h-dvh flex flex-col py-12">
      <div className="flex flex-col flex-1 justify-center items-center text-center">
        {hasError ? (
          // Error state: invalid or expired link
          <div className="w-full rounded-lg bg-destructive/10 border border-destructive/20 p-4 mb-6">
            <p className="text-destructive text-sm leading-[1.5]">
              {es.errors.invalidLink}
            </p>
          </div>
        ) : null}

        <h1 className="text-[28px] font-bold leading-[1.2] text-fg mb-4">
          {es.auth.checkEmailHeading}
        </h1>

        <p className="text-base text-fg-muted leading-[1.5] mb-8">
          {es.auth.checkEmailBody(email ?? 'tu correo')}
        </p>

        <Link
          href="/"
          className="text-accent underline-offset-4 hover:underline text-sm"
        >
          {es.auth.backToHome}
        </Link>
      </div>
    </main>
  )
}
