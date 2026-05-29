// SharedTrip wordmark component (CONTEXT.md D-08)
// Renders the literal brand name "SharedTrip" in coral, Inter italic 700.
// This is a fixed brand string — not translated via es.ts (D-08 explicitly defines it).
// No hex colors — uses text-primary token only.

type WordmarkSize = 'sm' | 'md' | 'lg'

const sizeClasses: Record<WordmarkSize, string> = {
  sm: 'text-sm',   // 14px
  md: 'text-base', // 16px
  lg: 'text-[28px]', // 28px — Display size (UI-SPEC Typography)
}

interface WordmarkProps {
  size?: WordmarkSize
}

export function Wordmark({ size = 'lg' }: WordmarkProps) {
  return (
    <span
      className={`font-bold italic text-primary tracking-tight ${sizeClasses[size]}`}
    >
      SharedTrip
    </span>
  )
}
