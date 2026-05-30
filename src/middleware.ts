// src/middleware.ts — Root Next.js middleware
// Delegates session refresh to updateSession() in @/lib/supabase/middleware.
// Runs on every request that matches the config.matcher (excludes static assets).
// The updateSession call refreshes the Supabase JWT cookie so sessions stay alive across requests.

import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // Match all routes EXCEPT:
    //   - _next/static (Next.js static assets)
    //   - _next/image (Next.js image optimization)
    //   - favicon.ico
    //   - image file extensions (svg, png, jpg, jpeg, gif, webp)
    // This prevents middleware from running on static files (perf + avoids cookie-on-favicon edge cases).
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
