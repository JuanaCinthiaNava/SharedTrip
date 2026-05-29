// SharedTrip — Spanish UI dictionary (INFRA-07)
// All user-visible strings live here. Never hardcode Spanish text in JSX components.
// Plans 03/04/05 will extend this with anon, tabs, profile, tripSwitcher namespaces.

export const es = {
  auth: {
    welcomeHeading: 'Bienvenido a SharedTrip',
    welcomeSubheading: 'Tu bóveda de viaje — boletos, itinerario y más, siempre a la mano.',
    sendLinkCta: 'Enviar enlace de acceso',           // Plan 03 will use
    emailLabel: 'Correo electrónico',                  // Plan 03 will use
    emailPlaceholder: 'tu@email.com',                  // Plan 03 will use
    checkEmailHeading: 'Revisa tu correo',             // Plan 03 will use
    checkEmailBody: (email: string) =>
      `Te enviamos un enlace a ${email}. Toca el enlace para entrar — expira en 15 minutos.`,
  },
  errors: {
    invalidLink: 'Este enlace ya expiró o no es válido. Solicita uno nuevo.',
    sendLinkFailed: 'No pudimos enviarte el enlace. Verifica tu correo e intenta de nuevo.',
    invalidJoinToken: 'Este link de invitación no es válido. Pide uno nuevo a quien te invitó.',
    sessionExpired: 'Tu sesión expiró. Ingresa de nuevo.',
    genericNetwork: 'Error de conexión. Verifica tu red e intenta de nuevo.',
  },
} as const

export type EsKeys = typeof es
