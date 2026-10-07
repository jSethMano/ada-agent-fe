# UI review checklist

Run from the repo root. Each grep finds candidates, not verdicts: read every hit in a changed file. Restrict a grep to the diff by putting `$(git diff --name-only -- src)` in place of `src`.

## Greps

```bash
cd ~/Documents/Github/ada-agent-fe

# Pills. Every radius is 2px.
grep -rnE 'rounded-(full|none)' src

# Hard-coded colours. Tokens only; the sprite frames are the exception.
grep -rnE '#[0-9a-fA-F]{3,8}\b' src --include='*.tsx' --include='*.ts' | grep -v chak-sprite-frames

# Geist Pixel has one weight. font-medium on it does nothing.
grep -rnE 'font-pixel[^"]*font-medium|font-medium[^"]*font-pixel' src

# Below the 11px floor for machine text.
grep -rnoE 'text-\[(9|10|10\.5)px\]' src

# New motion. The only keyframe is chak-think in index.css.
grep -rnE '@keyframes|animate-|transition-(all|transform|opacity)' src

# Accent outside its four jobs (links, Send, active-iteration marker, focus rings).
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

- [ ] Every new piece of text is in one register (pixel prose, sans interface, mono record), and the register matches who is speaking.
- [ ] Trace rows, tool names, JSON, paths, and timings are literal. No character in the record.
- [ ] Danger ink only where something failed or the Worker acted, and every flag has a word, not just a colour.
- [ ] Any new button is outline or ghost unless it's Send. Nothing new is accent-filled.
- [ ] Touch targets are 44px under `pointer-coarse:` without changing the desktop look.
- [ ] Inputs are `text-base` below `sm`.
- [ ] The sprite is at a multiple of 16px, `aria-hidden`, with "Chak" printed beside it.
- [ ] Copy states the real cause, and the Worker's text is verbatim.
- [ ] No new `useMemo` or `useCallback` without a reason that needs one, and no new dependency.

## In the browser

`npm run dev`. With the Worker on 8787 for live turns, or with turns seeded in `localStorage` (see the `chat-console` skill).

- [ ] **320px wide:** `document.documentElement.scrollWidth <= window.innerWidth` in the console. The page measured 8px too wide here once.
- [ ] **`lg`, normal and enlarged:** click the sprite to toggle. The hero copy steps aside, and prose stays under 68ch.
- [ ] **Reduced motion** (DevTools → Rendering → Emulate `prefers-reduced-motion`): the sprite holds its idle frame, and disclosures open instantly.
- [ ] **Keyboard only:** every control is reachable, the focus outline shows, and collapsed trace payloads are skipped.
