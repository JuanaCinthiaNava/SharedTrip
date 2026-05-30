// Sourced from .planning/phases/01-foundation-auth/01-RESEARCH.md Pattern 10
// Deterministic avatar name + emoji + color generator from user ID.
// Do NOT change the hash algorithm or lists without updating avatar.test.ts snapshots.

const ADJECTIVES = [
  'Curioso', 'Veloz', 'Sabio', 'Valiente', 'Alegre',
  'Tranquilo', 'Brillante', 'Audaz', 'Amable', 'Astuto',
  'Sereno', 'Vivaz', 'Fiel', 'Noble', 'Ágil',
  'Gracioso', 'Atrevido', 'Gentil', 'Listo', 'Osado',
  'Pacífico', 'Radiante', 'Singular', 'Tenaz', 'Único',
  'Versátil', 'Wabi', 'Xusto', 'Yolo', 'Zen',
] as const

const ANIMALS = [
  'Tucán', 'Iguana', 'Tortuga', 'Guacamaya', 'Jaguar',
  'Colibrí', 'Mapache', 'Axolote', 'Cocodrilo', 'Tiburón',
  'Cangrejo', 'Pulpo', 'Delfín', 'Manatí', 'Pelícano',
  'Caimán', 'Serpiente', 'Armadillo', 'Tlacuache', 'Tecolote',
  'Quetzal', 'Flamenco', 'Nutria', 'Tejón', 'Coyote',
  'Lobo', 'Búho', 'Zorro', 'Puma', 'Venado',
] as const

const ANIMAL_EMOJIS: Record<typeof ANIMALS[number], string> = {
  Tucán: '🦜', Iguana: '🦎', Tortuga: '🐢', Guacamaya: '🦜', Jaguar: '🐆',
  Colibrí: '🐦', Mapache: '🦝', Axolote: '🦑', Cocodrilo: '🐊', Tiburón: '🦈',
  Cangrejo: '🦀', Pulpo: '🐙', Delfín: '🐬', Manatí: '🦭', Pelícano: '🦅',
  Caimán: '🐊', Serpiente: '🐍', Armadillo: '🦔', Tlacuache: '🐀', Tecolote: '🦉',
  Quetzal: '🦜', Flamenco: '🦩', Nutria: '🦦', Tejón: '🦡', Coyote: '🐺',
  Lobo: '🐺', Búho: '🦉', Zorro: '🦊', Puma: '🐆', Venado: '🦌',
}

const AVATAR_COLORS = ['#FF6B6B', '#3DCCC7', '#FFB627'] as const  // coral, teal, mango

function hashUserId(userId: string): number {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash |= 0  // convert to 32-bit int
  }
  return Math.abs(hash)
}

export function getAvatarData(userId: string, avatarSeed?: string | null) {
  const seed = avatarSeed ?? userId
  const hash = hashUserId(seed)
  const adjective = ADJECTIVES[hash % ADJECTIVES.length]
  const animal = ANIMALS[(hash >> 4) % ANIMALS.length]
  const color = AVATAR_COLORS[(hash >> 8) % AVATAR_COLORS.length]
  const emoji = ANIMAL_EMOJIS[animal]
  return { displayName: `${adjective} ${animal}`, emoji, color }
}
