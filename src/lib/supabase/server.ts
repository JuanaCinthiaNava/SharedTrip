// src/lib/supabase/server.ts — Server Components, Server Actions, Route Handlers
// createServerClient factory using cookies() from next/headers.
// Uses getAll() + setAll() pattern for cookie management.
// In Next.js 16, cookies() returns a Promise — must be awaited.
// Plans 04/05 import this for server-side Supabase calls.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export const createClient = async () => {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
