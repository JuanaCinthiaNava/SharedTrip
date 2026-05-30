// SharedTrip — Spanish UI dictionary (INFRA-07)
// All user-visible strings live here. Never hardcode Spanish text in JSX components.
// Extended by Plan 04 with tabs, profile, tripSwitcher namespaces.
// Plan 05 will add the anon namespace.

export const es = {
  auth: {
    welcomeHeading: 'Bienvenido a SharedTrip',
    welcomeSubheading: 'Tu bóveda de viaje — boletos, itinerario y más, siempre a la mano.',
    sendLinkCta: 'Enviar enlace de acceso',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'tu@email.com',
    checkEmailHeading: 'Revisa tu correo',
    checkEmailBody: (email: string) =>
      `Te enviamos un enlace a ${email}. Toca el enlace para entrar — expira en 15 minutos.`,
  },
  // Trip shell tabs — labels and empty states
  tabs: {
    docs: 'Docs',
    itin: 'Itin',
    gente: 'Gente',
    perfil: 'Perfil',
    docsEmptyHeading: 'Bóveda de documentos',
    docsEmptyBody: 'Aquí irán los boletos, reservaciones e identificaciones del grupo. Disponible en la siguiente fase.',
    itinEmptyHeading: 'Itinerario del viaje',
    itinEmptyBody: 'El itinerario compartido llega pronto.',
    genteEmptyHeading: 'Miembros del viaje',
    genteEmptyBody: 'La lista del grupo aparecerá aquí. Disponible en la siguiente fase.',
  },
  // Profile tab — display name editor + sign out
  profile: {
    displayNameLabel: 'Tu nombre en el viaje',
    displayNamePlaceholder: 'Nombre visible para el grupo',
    saveCta: 'Guardar cambios',
    savedToast: 'Nombre guardado',
    invalidName: 'El nombre debe tener entre 1 y 60 caracteres.',
    signOutCta: 'Cerrar sesión',
    signOutDialogHeading: '¿Cerrar sesión?',
    signOutDialogBody: 'Tendrás que volver a ingresar con tu correo.',
    signOutDialogConfirm: 'Sí, cerrar sesión',
    signOutDialogCancel: 'Cancelar',
  },
  // Trip switcher bottom sheet
  tripSwitcher: {
    emptyHeading: 'No tienes viajes todavía',
    emptyBody: 'Pídele un link a quien te invitó o crea uno.',
    createCta: '+ Crear nuevo viaje',
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
