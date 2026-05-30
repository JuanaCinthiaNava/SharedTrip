// src/app/manifest.ts — PWA manifest (Next.js built-in MetadataRoute.Manifest)
// Sourced verbatim from .planning/phases/01-foundation-auth/01-RESEARCH.md Pattern 7.
// Service worker (Serwist) is NOT wired in Phase 1 — manifest ships only.
// Phase 3 adds Serwist + offline document cache on top of this.

import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SharedTrip',
    short_name: 'SharedTrip',
    description: 'Tu bóveda de viaje compartida — boletos, itinerario y más.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0F1729',
    theme_color: '#0F1729',
    lang: 'es',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
