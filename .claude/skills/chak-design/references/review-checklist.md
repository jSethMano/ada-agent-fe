# UI review checklist

Run from the repo root. Each grep finds candidates, not verdicts: read every hit in a changed file. Restrict a grep to the diff by putting `$(git diff --name-only -- src)` in place of `src`.

## Greps

```bash
cd ~/Documents/Github/ada-agent-fe

# Hard edges. Every bordered box has a radius; rounded-full is the send button only,
# and rounded-none only the field inside the composer box.
grep -rnE 'rounded-(full|none)|border-l-2' src

# Hard-coded colours. Tokens only; the sprite frames are the exception.
grep -rnE '#[0-9a-fA-F]{3,8}\b' src --include='*.tsx' --include='*.ts' | grep -v chak-sprite-frames

# Geist Pixel was dropped. Nothing should ask for it.
grep -rn 'font-pixel\|Geist Pixel' src

# Below the 12px floor (raw code, font-mono, may be 11.5px).
grep -rnoE 'text-\[(9|10|10\.5|11|11\.5)px\]' src

# Monospace outside raw code. Only the trace's JSON <pre> and inline code in answers.
grep -rn 'font-mono' src --include='*.tsx'

# New motion. The only keyframe is chak-think in index.css.
grep -rnE '@keyframes|animate-|transition-(all|transform|opacity)' src

# Accent outside its five jobs (links, Send, active-iteration marker, focus rings, section titles via <Highlight>).
grep -rnoE '(text|bg|border|ring|decoration)-(accent-ink|primary)\b' src

# Fonts are self-hosted through Fontsource.
grep -rn 'fonts.googleapis\|fonts.gstatic' index.html src

# Overflow risk at 320px. Re-check the page width after each new one.
grep -rn 'whitespace-nowrap' $(git diff --name-only -- src)

# Cat-speak in copy.
grep -rniE '\b(meow|purr|paw(s|some)?|hiss|nyan|feline|claw)' src --include='*.tsx' --include='*.ts' | grep -v chak-sprite
```

Hits that already existed on 2026-10-07, before this checklist:

- `animate-in` / `slide-in-*` in the shadcn `popover.tsx`
- `transition-all` in `button.tsx` (press feedback, one of the three motions)
- `transition-transform` on the trace caret in `trace.tsx`, and `transition-opacity` on the History delete in `conversation-menu.tsx`
- accent on the active conversation in `conversation-menu.tsx`
- "besides meowing when he's hungry" in the `capabilities.tsx` intro: a line about Chak in the chrome, not Chak speaking

Flag new hits. Leave these alone unless the user asks.

## By eye

- [ ] Every new piece of text is in Geist; `font-mono` only for raw code (JSON, inline code in answers). Whether a person or the machine produced it.
- [ ] Trace rows, tool names, JSON, paths, and timings are literal. No character in the record.
- [ ] Danger ink only where something failed or the Worker acted, and every flag has a word, not just a colour.
- [ ] Any new button is outline or ghost unless it's Send, or one of the approval card's semantic three (green `success` files, soft `destructive` declines). Nothing new is accent-filled, and green means a confirming action, never decoration.
- [ ] Touch targets are 44px under `pointer-coarse:` without changing the desktop look.
- [ ] Inputs are `text-base` below `sm`.
- [ ] The sprite is at a multiple of 16px, `aria-hidden`, with "Chak" printed beside it.
- [ ] Copy states the real cause, and the Worker's text is verbatim.
- [ ] No new `useMemo` or `useCallback` without a reason that needs one, and no new dependency.

## In the browser

`npm run dev`. With the Worker on 8787 for live turns, or with turns seeded in `localStorage` (see the `chat-console` skill).

- [ ] **320px wide:** `document.documentElement.scrollWidth <= window.innerWidth` in the console. The page measured 8px too wide here once.
- [ ] **`lg`, empty and in a conversation:** the greeting and composer sit centred before the first message; after it, the thread scrolls inside the hero and the composer is docked. Header, turns, composer, and prompts share one column edge.
- [ ] **Reduced motion** (DevTools → Rendering → Emulate `prefers-reduced-motion`): the sprite holds its idle frame, and disclosures open instantly.
- [ ] **Keyboard only:** every control is reachable, the focus outline shows, and collapsed trace payloads are skipped.
