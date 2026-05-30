// src/lib/supabase/client.ts — browser components ('use client')
// createBrowserClient factory for use in 'use client' components.
// This file itself has NO 'use client' directive — it is environment-agnostic (lib pattern).
// Plans 04/05 import this for client-side Supabase calls.

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
