# Mobile — design

Status: **implemented** · 2026-10-04 · D1 sticky composer, D2 Capabilities + Source, D3 48px sprite. Results in §7.
Scope: make the Chak page work properly on phones (≤ 639px) and touch tablets, without changing the desktop layout or any design-system lock.

---

## 1. Audit (measured, not eyeballed)

Production build, Chrome DevTools Protocol, touch emulation, `deviceScaleFactor: 2`. Seeded with one conversation that has a single-tool turn, a two-tool turn with a long ticket description, a 5-pass overran turn, and an offline error.

| Check | 360 × 740 | 390 × 844 | 768 × 1024 |
|---|---|---|---|
| Horizontal overflow | none | none | none |
| Composer visible on load | **no** (top at 981px) | **no** (top at 981px) | yes |
| Console starts at | 483px | 483px | 444px |
| Tap targets under 24px (WCAG 2.5.8 AA) | **11** | **11** | **12** |
| Tap targets under 44px (Apple HIG) | 18 of 27 | 18 of 27 | 21 of 29 |
| Textarea font size | **15px → iOS zooms on focus** | 15px | 15px |
| History: delete button on touch | **opacity 0, hover-only** | same | same |
| History popover fits | yes (328px) | yes (352px) | yes |

Targets under 24px: masthead links (20px tall), every capability "Try it" link (19px), footer repo links (20px).

### What the screenshots show

1. **The composer drifts away.** Below `lg` the console has no height cap, so the thread doesn't scroll internally. The whole page grows, and after a few turns the composer is a long scroll below the question you're reading.
2. **New answers aren't brought into view.** `ChakConsole`'s effect calls `thread.scrollTo(...)`, but below `lg` the thread isn't a scroll container, so that call does nothing on phones.
3. **The transcript is cramped.** The 2.75rem speaker gutter, the trace's `border-l` + `pl-3`, and the trace row's 1.75rem ordinal column leave about 200px for content at 360. Previews like `title: VPN keeps disconnecting` wrap onto three lines.
4. **Expanded JSON is cut off.** `args` and `result` scroll sideways inside a box about 190px wide, so long strings show only their first few words.
5. **The hero fills the first screen.** Sprite (64) + three-line headline (40px) + four-line lede push the console to 483px.
6. **The keyboard hint is wrong on touch.** "Enter to send · Shift + Enter for a new line": phones have no Shift.
7. **Navigation hides the most useful link.** On phones the masthead shows Architecture + Source. Capabilities, the best jump for a first-time visitor, is hidden.

Already right: no overflow anywhere, `min-h-[100dvh]`, autofocus only at ≥1024px (so no surprise keyboard), the popover fits, and the architecture diagram and capability list stack cleanly.

---

## 2. Principles

- **Phones scroll the page, not panels.** No nested scroll containers below `lg`; scroll-chaining inside a page is the most common mobile chat annoyance.
- **The composer is always within reach while the console is on screen.** This is the mobile version of the existing rule, "a stranger can ask without scrolling".
- **Touch fixes are scoped to touch.** Hit-area and hover fixes use Tailwind's `pointer-coarse:` variant, so a desktop mouse user sees no change.
- **Locks hold.** No new colours, no new keyframes, 2px radius, the same three type registers. Smooth scrolling respects `prefers-reduced-motion`, like the existing code.

---

## 3. Changes

### P0: broken on phones today

| # | Change | How |
|---|---|---|
| 1 | **Stop the iOS zoom on focus** | Textarea `text-base sm:text-[15px]` (16px below 640px). Also add `enterKeyHint="send"`, so the phone keyboard's return key says Send, matching what Enter does. |
| 2 | **Sticky composer below `lg`** | The composer becomes `sticky bottom-0 z-10` inside the console's flex column, with `bg-surface` and a top rule. Add `pb-[max(0.75rem,env(safe-area-inset-bottom))]` and `viewport-fit=cover` in the viewport meta, so it clears the iPhone home indicator. At `lg`+ nothing changes; the console is already a fixed-height panel there. |
| 3 | **Bring new answers into view on phones** | In the console effect: if the thread is its own scroller (`scrollHeight > clientHeight`), keep today's behavior. Otherwise call `scrollIntoView({ block: 'nearest' })` on the newest `article`. Articles get `scroll-mb-28`, so the end of the answer lands just above the sticky composer. |
| 4 | **Delete in History works on touch** | `pointer-coarse:opacity-100` on the trash button; the hover reveal stays for mouse users. |

```
390 × 844, after #2 and #3          (today: composer is off-screen)
┌──────────────────────────┐
│ [cat] chak  Capabilities  Source │  masthead, sticky (unchanged)
├──────────────────────────┤
│ you                      │
│ Check ticket 42, and if… │
│ chak                     │
│ ┃ router loop  3 iter…   │
│ ┃ 01 lookup_ticket       │  trace, then the answer,
│ ┃ 02 create_ticket       │  scrolled so the answer's last
│ Ticket 42 is still in    │  line sits above the composer
│ progress, so I opened…   │
├──────────────────────────┤
│ [Ask about a ticket… ] [Send] │  sticky composer + safe area
└──────────────────────────┘
```

### P1: works, but cramped

| # | Change | How |
|---|---|---|
| 5 | **Stack the speaker label on phones** | `Row`: `grid-cols-1` below `sm` with the `you` / `chak` label on its own line above the content; today's gutter returns at `sm`. Gives back about 56px (roughly 25% of the content width at 360). |
| 6 | **Tighter trace indents on phones** | Trace `pl-3` → `pl-2` and row ordinal column `1.75rem` → `1.5rem` below `sm`. |
| 7 | **Wrap JSON on phones** | Payload `<pre>`: `whitespace-pre-wrap [overflow-wrap:anywhere] sm:whitespace-pre`. Same characters, same indentation; long strings wrap instead of hiding. The record isn't changed, only its line breaks. |
| 8 | **Compress the hero on phones** | Sprite 64 → **48** (still a multiple of 16), `mb-6` → `mb-4`, h1 40px → 34px, section `pt-10` → `pt-6`. The console moves up by about 80px. `sm` and up are unchanged. |
| 9 | **44px touch targets** | Add hit area without changing the look: `pointer-coarse:py-3 pointer-coarse:-my-3` on masthead links, "Try it" links, and footer links. History / New and Send go to `pointer-coarse:h-11`, with the textarea's min height matched so the row stays aligned. |
| 10 | **Mobile navigation** | Below `sm`: **Capabilities + Source**. Architecture and Status join at `sm`, as Status does today. The wordmark and all four links don't fit at 360. |
| 11 | **Hide the keyboard hint on touch** | `pointer-coarse:hidden` on "Enter to send · Shift + Enter…". The Send label on the keyboard (#1) replaces it. |

### P2: polish

| # | Change | How |
|---|---|---|
| 12 | Minimum machine-register size 11px | The 33 labels at 10.5px go to 11px everywhere. A one-step change that is barely visible on desktop and noticeably easier to read on a phone. |
| 13 | Shorter capability rows on phones | `py-5` → `py-4` below `sm`. The 11 rows are about 1,700px tall at 360; this saves about 180px without hiding anything. |
| 14 | Architecture connector on phones | A 16px vertical rule between the router box and the sub-agent list, which are currently butted together below `sm`. |

### Not doing

- **A fixed-height chat panel on phones** (the desktop pattern): it nests a scroll container inside the page. See D1.
- **A hamburger menu:** two links fit, and a menu would add a component plus focus trapping for no gain.
- **Hiding capabilities behind "show more":** the list is the answer to "what can it do"; a shorter list would be less honest.

---

## 4. Acceptance criteria

All checked with the same CDP audit, extended to **320 × 568** (iPhone SE) as well as 360, 390, and 768:

- [ ] No horizontal overflow at any width.
- [ ] The composer is visible on load at 360 × 740 and 390 × 844.
- [ ] No tap target under 24px; on a coarse pointer, every primary control is at least 44px tall.
- [ ] The textarea's computed font size is 16px or more below 640px.
- [ ] The History delete button is visible with touch emulation.
- [ ] After a turn resolves on a phone, the answer's last line is on screen above the composer.
- [ ] At 1280 × 860 with a fine pointer, the page matches today's screenshot; desktop is unchanged.
- [ ] `npm run build` and `npm run lint` pass with no new warnings.

---

## 5. Risks

| Risk | Mitigation |
|---|---|
| iOS Safari and sticky elements near the on-screen keyboard: the composer can end up behind the keyboard on some iOS versions. | Must be checked on a real iPhone; emulation can't reproduce it. Fallback: drop `sticky` while the composer has focus (`pointer-coarse:focus-within:static`), so Safari scrolls it into view the normal way. |
| `scrollIntoView` while the visitor is already scrolling up through older turns would yank them back down. | Only scroll when the visitor is at or near the bottom (within 120px) when the turn started, the same rule chat apps use. |
| `pointer-coarse` is false on touch laptops with a trackpad. | Acceptable: those users have a precise pointer, and the visual sizes already pass 24px after #9 applies on phones. |

---

## 6. Decisions

| # | Decision | Recommendation | Alternative |
|---|---|---|---|
| D1 | How the composer stays reachable | **Sticky composer, page scroll** | A fixed-height chat panel like desktop (nested scrolling on a phone) |
| D2 | Phone navigation | **Capabilities + Source** | Architecture + Source (today) |
| D3 | Hero sprite on phones | **48px** | Keep 64px (costs ~16px of fold), or hide it (the masthead and empty state already show him) |

---

## 7. Result

The same CDP audit, run on the production bundle with touch emulation:

| Criterion | 320 × 568 | 360 × 740 | 390 × 844 | 768 × 1024 |
|---|---|---|---|---|
| Horizontal overflow | none | none | none | none |
| Composer visible on load | yes | yes | yes | yes |
| Page scrolled on load | 0 | 0 | 0 | 0 |
| Targets under 24px | 0 | 0 | 0 | 0 |
| Targets under 44px (coarse pointer) | 0 | 0 | 0 | 0 |
| Textarea font | 16px | 16px | 16px | 15px (sm+, by design) |
| JSON wraps instead of clipping | yes | yes | yes | yes |
| Text under 11px | 0 | 0 | 0 | 0 |
| History delete on touch | visible, 42 × 58 | same | same | same |
| New reply ends above the composer | yes | yes | yes | yes |
| "Try it" fills, focuses, and shows the composer | yes | yes | yes | yes |

Mid-transcript at 390 × 844, the composer stays pinned to the viewport bottom. At 1280 × 6000 with a fine pointer, desktop matches the pre-change capture except the intended 10.5 → 11px labels.

**Not verifiable in emulation:** the sticky composer with the real iOS keyboard. The `pointer-coarse:focus-within:static` fallback is already in place, so the composer drops into the normal flow while it has focus and Safari scrolls it into view itself.
