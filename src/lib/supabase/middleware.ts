// src/lib/supabase/middleware.ts — used ONLY by src/middleware.ts
// Encapsulates cookie-translation logic for the middleware context.
// CRITICAL: calls getUser() NOT getSession() — getUser() revalidates the JWT server-side.
// getSession() does NOT revalidate and must never be used server-side (Anti-Pattern).

import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Write to request so subsequent middleware can read updated cookies
            request.cookies.set(name, value)
            // Write to response so the browser receives the refreshed cookie
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // ANTI-PATTERN WARNING: do NOT replace getUser() with getSession() here.
  // getUser() makes a server-to-Supabase round-trip to revalidate the JWT.
  // getSession() only reads the local cookie without revalidation — insecure.
  await supabase.auth.getUser()

  return response
}
