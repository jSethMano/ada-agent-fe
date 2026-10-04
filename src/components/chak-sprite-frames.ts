/**
 * Chak, drawn on a 16×16 grid. One character per pixel, `.` is transparent.
 * docs/design/chak-brand.md carries the same matrices; change both together.
 *
 * The fur colours are illustration-only. Bright fur is 2.7:1 on paper, so it
 * must never carry text or a control; that job belongs to --accent-ink.
 */
export const SPRITE_PALETTE: Readonly<Record<string, string>> = {
  K: '#17181a', // outline, eyes (= --ink)
  O: '#e8772e', // fur
  D: '#c25a16', // tabby stripes
  G: '#f2b27a', // inner ear
  N: '#d9826b', // nose
  W: '#fdfdfc', // white fur, eye highlight (= --surface)
}

export type Pose = 'idle' | 'blink' | 'tail-up' | 'ears-back'

const HEAD = [
  '..K..........K..',
  '..KK........KK..',
  '..KGK......KGK..',
  '.KOGOKKKKKKOGOK.',
  '.KOOOODOODOOOOK.',
  '.KOWKOOWWOOKWOK.',
  '.KOKKOWWWWOKKOK.',
  '.KOOOWWNNWWOOOK.',
  '..KWWWKWWKWWWK..',
  '...KKWWWWWWKK...',
]

const HEAD_BLINK = HEAD.map((row, y) =>
  y === 5 ? '.KOOOOOWWOOOOOK.' : y === 6 ? '.KOKKOWWWWOKKOK.' : row,
)

// Ears flattened sideways, eyes squeezed shut: the failure pose.
const HEAD_EARS_BACK = [
  '................',
  '................',
  'KK............KK',
  'KGOKKKKKKKKKKOGK',
  '.KOOOODOODOOOOK.',
  '.KOOOOOWWOOOOOK.',
  '.KOKKOWWWWOKKOK.',
  '.KOOOWWNNWWOOOK.',
  '..KWWWWKKWWWWK..',
  '...KKWWWWWWKK...',
]

const BODY = [
  '...KOOWWWWOOK...',
  '..KOOOWWWWOOOK..',
  '..KOOOWWWWOOOKK.',
  '..KWWKWWWWKWWKOK',
  '..KWWKWWWWKWWKOK',
  '...KKKKKKKKKKKK.',
]

const BODY_TAIL_UP = [
  '...KOOWWWWOOK.K.',
  '..KOOOWWWWOOOKOK',
  '..KOOOWWWWOOOKOK',
  '..KWWKWWWWKWWKK.',
  '..KWWKWWWWKWWK..',
  '...KKKKKKKKKKK..',
]

export const SPRITE_FRAMES: Readonly<Record<Pose, readonly string[]>> = {
  idle: [...HEAD, ...BODY],
  blink: [...HEAD_BLINK, ...BODY],
  'tail-up': [...HEAD, ...BODY_TAIL_UP],
  'ears-back': [...HEAD_EARS_BACK, ...BODY],
}

/** One `d` string per colour, built from horizontal runs, so a frame is about
 *  six paths rather than two hundred rects. */
export function spritePaths(rows: readonly string[]): { fill: string; d: string }[] {
  const byColour = new Map<string, string>()
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const key = row[x]
      let end = x + 1
      while (end < row.length && row[end] === key) end++
      if (key in SPRITE_PALETTE) {
        byColour.set(key, `${byColour.get(key) ?? ''}M${x} ${y}h${end - x}v1h${x - end}z`)
      }
      x = end
    }
  })
  return [...byColour].map(([key, d]) => ({ fill: SPRITE_PALETTE[key], d }))
}
