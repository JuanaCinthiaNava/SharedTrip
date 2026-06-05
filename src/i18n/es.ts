// SharedTrip — Spanish UI dictionary (INFRA-07)
// All user-visible strings live here. Never hardcode Spanish text in JSX components.
// Extended by Plan 04 with tabs, profile, tripSwitcher namespaces.
// Plan 05 added the anon namespace.
// Plan 09 adds the entry namespace (typed invite-code entry, replaces magic-link).
// Phase 02 Plan 01 adds trip, members, invite namespaces (D-06 / TRIP-02 / UI-05).

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
  // Trip create/edit/delete — D-06, TRIP-02 (Phase 02 Plan 01)
  trip: {
    createCta: 'Crear viaje',
    joinCta: 'Ya me invitaron',
    nameLabel: 'Nombre del viaje',
    namePlaceholder: 'Cancún 2026',
    datesLabel: 'Fechas (opcional)',
    noDates: 'Sin fechas todavía',
    descriptionLabel: 'Descripción (opcional)',
    saveCta: 'Guardar',
    editCta: 'Editar viaje',
    deleteCta: 'Eliminar viaje',
    deleteDialogHeading: '¿Eliminar este viaje?',
    deleteDialogBody: 'Esto borra el viaje y todo su contenido para todos. No se puede deshacer.',
    deleteConfirmLabel: (name: string) => `Escribe "${name}" para confirmar`,
    invalidName: 'El nombre debe tener entre 1 y 80 caracteres.',
    invalidDateRange: 'La fecha de fin debe ser igual o posterior a la de inicio.',
  },
  // Member list + remove/leave actions (Phase 02 Plan 01)
  members: {
    heading: 'Miembros del viaje',
    badgeCreator: 'Creador',
    badgeYou: 'Tú',
    removeCta: 'Quitar',
    removeDialogHeading: (name: string) => `¿Quitar a ${name} del viaje?`,
    removeDialogConfirm: 'Sí, quitar',
    leaveCta: 'Salir del viaje',
    leaveDialogHeading: (trip: string) => `¿Salir de ${trip}?`,
    leaveDialogConfirm: 'Sí, salir',
    cancel: 'Cancelar',
  },
  // Invite card — code display + share action (D-07/D-08/D-09, Phase 02 Plan 01)
  invite: {
    cardHeading: 'Invita a tu grupo',
    cardBody: 'Comparte este código o el enlace para que se unan.',
    copyCta: 'Copiar invitación',
    copiedToast: 'Copiado',
    shareMessage: (name: string, code: string, origin: string) =>
      `Únete a mi viaje "${name}" en SharedTrip 🌴  ${origin}/join/${code}  (o escribe el código ${code})`,
  },
} as const

export type EsKeys = typeof es
