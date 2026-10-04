import { cn } from '@/lib/utils'
import { SPRITE_FRAMES, spritePaths, type Pose } from './chak-sprite-frames'

const PATHS = Object.fromEntries(
  Object.entries(SPRITE_FRAMES).map(([pose, rows]) => [pose, spritePaths(rows)]),
) as Record<Pose, ReturnType<typeof spritePaths>>

/** Four equal beats, idle twice so he mostly sits still. The timing lives in
 *  `.chak-think` in index.css and assumes exactly four frames. */
const THINKING: readonly Pose[] = ['idle', 'tail-up', 'idle', 'blink']

/** Multiples of 16 only. Anything else puts a fractional number of device
 *  pixels under each sprite pixel at 1x and the grid goes uneven. */
type SpriteSize = 16 | 32 | 48 | 64 | 128

interface ChakSpriteProps {
  pose?: Pose
  size?: SpriteSize
  /** Loops the thinking frames. Reduced motion gets the static idle frame. */
  thinking?: boolean
  /** For responsive sizing. Keep to multiples of 16 (size-4, size-8, size-16, size-32). */
  className?: string
}

/**
 * The mascot. Always decorative: his name is printed as text wherever he
 * appears, so the sprite never needs to be announced.
 */
export function ChakSprite({ pose = 'idle', size = 32, thinking = false, className }: ChakSpriteProps) {
  const frames = thinking ? THINKING : [pose]

  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={cn('shrink-0', thinking && 'chak-think', className)}
    >
      {frames.map((frame, index) => (
        <g key={index}>
          {PATHS[frame].map((path) => (
            <path key={path.fill} d={path.d} fill={path.fill} />
          ))}
        </g>
      ))}
    </svg>
  )
}
