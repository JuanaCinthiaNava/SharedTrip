// SharedTrip — Spanish UI dictionary (INFRA-07)
// All user-visible strings live here. Never hardcode Spanish text in JSX components.
// Extended by Plan 04 with tabs, profile, tripSwitcher namespaces.
// Plan 05 added the anon namespace.
// Plan 09 adds the entry namespace (typed invite-code entry, replaces magic-link).

export const es = {
  // Invite-code entry screen (Plan 09 — replaces magic-link welcome screen)
  entry: {
    heading: 'Ingresa tu código de viaje',
    subheading: 'Pídele el código a quien te invitó y escríbelo aquí.',
    codeLabel: 'Código de invitación',
    codePlaceholder: 'EJEM-AB12',
    submitCta: 'Entrar al viaje',
    invalidFormat: 'Revisa el código: formato como EJEM-AB12.',
  },
  auth: {
    welcomeHeading: 'Bienvenido a SharedTrip',
    welcomeSubheading: 'Tu bóveda de viaje — boletos, itinerario y más, siempre a la mano.',
    sendLinkCta: 'Enviar enlace de acceso',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'tu@email.com',
    checkEmailHeading: 'Revisa tu correo',
    checkEmailBody: (email: string) =>
      `Te enviamos un enlace a ${email}. Toca el enlace para entrar — expira en 15 minutos.`,
    backToHome: 'Volver al inicio',
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
    signOutDialogBody: 'Tendrás que volver a ingresar con tu código de invitación.',
    signOutDialogConfirm: 'Sí, cerrar sesión',
    signOutDialogCancel: 'Cancelar',
  },
  // Trip switcher bottom sheet
  tripSwitcher: {
    emptyHeading: 'No tienes viajes todavía',
    emptyBody: 'Pídele un link a quien te invitó o crea uno.',
    createCta: '+ Crear nuevo viaje',
  },
  // Anonymous join + upgrade flow
  anon: {
    pill: 'Sin cuenta',
    bannerHeading: 'Sin email guardado — agrega uno para no perder acceso.',
    bannerCta: 'Agregar email',
    bannerDismiss: 'Cerrar',
    upgradeSheetHeading: 'Guarda tu acceso',
    upgradeSheetBody: 'Agrega tu email para no perder acceso si cierras la app.',
    upgradeEmailLabel: 'Tu correo electrónico',
    upgradeSubmitCta: 'Guardar email',
    upgradeSuccessToast: (email: string) =>
      `Te enviamos un correo de confirmación a ${email}. Toca el enlace para terminar.`,
  },
  errors: {
    invalidLink: 'Este enlace ya expiró o no es válido. Solicita uno nuevo.',
    sendLinkFailed: 'No pudimos enviarte el enlace. Verifica tu correo e intenta de nuevo.',
    invalidJoinToken: 'Este código de invitación no es válido. Pide el código correcto a quien te invitó.',
    sessionExpired: 'Tu sesión expiró. Ingresa de nuevo.',
    genericNetwork: 'Error de conexión. Verifica tu red e intenta de nuevo.',
  },
} as const

export type EsKeys = typeof es
