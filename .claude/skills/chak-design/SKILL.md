---
name: chak-design
description: Keep UI work inside this page's locked design system. One light theme; three type registers (Geist Pixel for authored prose, Geist for interface, Geist Mono for the machine record); one accent with four jobs; a 2px radius everywhere; a budget of three motions; the phone rules (the page scrolls, 44px touch targets, 16px inputs, an 11px floor, no overflow at 320px); and Chak's character rules (sprite sizes, no cat-speak). Includes a review checklist with greps. Use before adding or restyling any component, copy, or CSS, and when reviewing a UI diff.
argument-hint: "[component or diff to build or review]"
---

# Chak design

This page is a "Page Theme Lock" build: one deliberate design, with locks that keep it from sliding back into a generic chatbot playground. Build inside the locks. If a change can't fit them, say so instead of bending one.

The work: $ARGUMENTS

Tokens and the reasoning behind them are in `src/index.css`. The full rules are in `CLAUDE.md` (Design system, Mobile, Chak the character), `docs/design/mobile.md`, and `docs/design/chak-brand.md`.

## 1. Pick the register

Every piece of text is in exactly one register. The font says who is speaking.

| Text | Register | Class | Notes |
| --- | --- | --- | --- |
| Headlines, Chak's answers, the builder's note, small lowercase section kickers outside the trace | Authored prose | `font-pixel` | One weight (400). Never pair it with `font-medium`, which does nothing. Emphasis is `font-semibold` (synthesized bold) |
| Nav, buttons, labels, form fields, the visitor's own messages | Interface | default (Geist sans) | |
| Instance path, tool names, JSON, ordinals, timings, trace labels, triage facts | Machine record | `font-mono` | Tabular figures come from `index.css`. Size `text-[11px]` to `text-[13px]`, never under 11px |

Character lives in the chrome, never in the record. Trace rows, JSON, tool names, paths, and timings stay literal, and the trace header says `router loop`.

## 2. Colour

Use tokens only: `paper`, `surface`, `ink`, `ink-2`, `ink-3`, `rule`, `rule-strong`, `accent-ink`, `accent-wash`, `danger`, `danger-wash`. Never put a hex value in a component. The sprite frames are the one exception.

- **Marmalade (`accent-ink`, #A84A0C) has four jobs:** links, the Send button, the active-iteration marker (the pass count when more than one pass ran), and focus rings. Anything else that wants emphasis uses ink and weight. The approval card's "File ticket" is an outline button with an ink border, not an accent button.
- **Crimson (`danger`, #A3123A) means something went wrong or the Worker acted:** failures, `blocked`, `held`, `replaced`, a flagged answer, a security incident. It is never decoration. A flag always carries a word ("flagged", "security incident") as well as the colour.
- **Bright fur orange (#E8772E) is 2.7:1** and lives only in the sprite. It never carries text or a control.

## 3. Shape, theme, and motion

- **Every radius is 2px.** All shadcn radius tokens alias `--radius`, so `rounded-lg` is 2px too. Nothing is a pill: no `rounded-full`.
- **One light theme.** `@custom-variant dark` in `index.css` makes `dark:` class-driven, and `.dark` is never set. Don't remove the variant, don't add a theme toggle, and don't expect a `dark:` utility to do anything.
- **Three motions, no more:** the trace disclosure (`.disclosure`, `grid-template-rows` 0fr→1fr), the in-flight `.chak-think` sprite loop (the page's only `@keyframes`), and button press feedback (`translate-y-px`). Hover colour changes are fine. Anything that moves, grows, or fades in over time has to be one of the three. No animation library. The enlarge toggle is instant on purpose. `prefers-reduced-motion` collapses everything through the global rule in `index.css`.

## 4. Layout

- At `lg` and up, the console is a fixed-height panel with its own scrolling thread. The enlarge toggle switches it between the hero's 7fr column and the full row, and every class it switches is `lg:`.
- Answer and question prose is capped at `max-w-[68ch]`, so it stays readable in the enlarged console.
- Below `lg`, the page scrolls, never a panel. Don't add nested scroll containers on phones.

## 5. Phones

| Rule | How |
| --- | --- |
| The composer stays reachable | `sticky bottom-0` with a safe-area pad. It drops `sticky` while focused (`pointer-coarse:`), as the fallback for the iOS keyboard |
| Touch targets are 44px | `pointer-coarse:min-h-11` / `h-11`. When the visible size must not change, add padding and a matching negative margin |
| Touch-only behavior uses `pointer-coarse:` | So desktop is untouched: the always-visible History delete, the hidden "Shift + Enter" hint |
| Inputs are 16px below `sm` | `text-base sm:text-[15px]`. Otherwise iOS Safari zooms on focus. Textareas get `enterKeyHint="send"` |
| Machine text floor is 11px | Never 10.5px |
| Nothing widens the page | Grids are `grid-cols-1` (`minmax(0,1fr)`) below `lg`, so wide content overflows its own box. Long ids get break opportunities (`breakableId()` in `trace.tsx`). Re-check 320px after adding any `whitespace-nowrap` |
| Phone navigation | Capabilities and Source. Architecture and Status join at `sm` |

## 6. Chak, the character

- Chak is an orange-and-white office cat, and his pronoun is **he**. The character is a tone, and it stays professional.
- **No cat-speak anywhere:** no cat sounds, puns, or roleplay in UI copy or answers. The Worker's system prompt forbids them in answers too.
- **Copy states the real cause.** Error copy says what failed and what to do. The Worker's own error text is shown verbatim underneath, never rewritten.
- **The sprite** (`src/components/chak-sprite.tsx`, frames in `chak-sprite-frames.ts`) is a 16×16 grid rendered only at multiples of 16px, which is why `size` is a literal union. Responsive sizing also stays on multiples of 16 (`size-4`, `size-8`, `size-16`). It is always `aria-hidden`, because his name is always printed beside him. If the frames change, regenerate `public/favicon.svg` from the idle frame.

## 7. Accessibility

- Focus: one global `:focus-visible` outline in accent. Don't override it per component.
- Collapsed content is `inert`, so it leaves the focus order and the accessibility tree.
- In-flight state is `role="status"` with an `sr-only` sentence.
- An icon-only control gets an accessible name. Decorative icons are `aria-hidden`.
- Text tokens pass AA on paper: `ink` 16:1, `ink-2` 6.5:1, `ink-3` 4.9:1, accent 5.3:1, danger 7.2:1. Don't put text on a surface that isn't paper or surface without measuring it.

## Review

Before calling UI work done, run [references/review-checklist.md](references/review-checklist.md) over the diff, then look at the page at 320px and at `lg`, enlarged and not.

## Keeping this skill in sync

This restates the Design system, Mobile, and Chak sections of `CLAUDE.md`, and the tokens in `src/index.css`. If a lock changes, and only the user can change one, update `CLAUDE.md`, this file, and the checklist together.
