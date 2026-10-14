# Eval results as a chart

Design for replacing the "results by run" table in "How he's measured" (`src/components/eval-results.tsx`) with a shadcn area chart, modelled on shadcn's "Area Chart - Interactive". Status: built 2026-10-14, with the defaults in §9. Where the build differs from the first draft of this spec, the spec below has been updated to match.

## 1. What the data actually is

The shadcn example plots about 90 daily points and filters them with a time-range select. The export we chart (`src/data/evals.json`, generated 2026-10-13) is much smaller:

| Answer key | Runs | Dates |
| --- | --- | --- |
| Earlier (`method`, grader 1) | baseline, iteration 2, iteration 3 | Oct 8, 9, 10 |
| Current (`comparisons[0]`, grader 4) | iteration 3 (regraded), iteration 4 (incomplete, 8 runs missing) | Oct 10, 13 |

So there are 4 x positions over 6 days, and two answer keys that may never be joined: the export refuses to mix them, and the chart must not either. Pass rates sit between 88.6% and 100%.

Three consequences shape the design:

1. **No time-range select.** There is nothing to filter. The header's select picks the **metric** instead. The layout stays the one the user pointed at: title and description on the left, a select on the right, the chart below, and a legend.
2. **The x axis is the run order, not a time scale.** Each point is a run, labelled like the table's column header (label, date). Gaps between runs carry no data, so the curve is `linear`, not shadcn's `natural`. With this few points, `natural` overshoots between runs and draws values no run had.
3. **The y axis is the share that failed, from 0.** An area's fill reads as size measured from the baseline, so the axis has to start at 0. Pass rate on 0–100% is flat: 91.7% → 95.5% is about 8px on a 240px chart. Starting at 85% would exaggerate the changes. Failure rate from 0 is honest, and the changes are visible (overall: 8.3% → 4.5% → 4.5% under the earlier key, then 11.4% → 0.8% under the current key).

## 2. Encoding

| Channel | Encodes |
| --- | --- |
| x | run, in export order: `runs` then `comparisons[*].runs`, de-duplicated by `startedAt` (a regrade keeps the run's `startedAt`) |
| y | `(graded − passed) / graded` for the selected metric, fixed domain `[0, ceil(max / 5) × 5]` over every chartable metric (20% today), ticks every 5% |
| series | one per answer key. The newest key is the emphasis series: `ink` stroke, solid, fill `ink` at 8%. Older keys are context: `ink-3` stroke, dashed `4 3`, fill `ink-3` at 6% |
| point | 4px dot on every run, with a 2px `surface` ring. A run with `missing` gets a hollow dot (`surface` fill, series stroke) |
| reference | a vertical `rule-strong` hairline wherever two series share a run, labelled "answer key changed" in 12px `ink-3`, to the left of the line so it fits at 320px |
| direct label | each series' last value ("4.5%", "0.8%") in 12px `ink-2`: to the right of the newest key's last point, above and to the left of an older key's, where the newer line starts. Never a value on every point |

The y domain is fixed so switching metrics never rescales the axis. A rescaled axis would make 0.2% look as big as 15.8%.

**Colour stays inside the locks.** There is no chart hue: marmalade has five jobs and data isn't one of them, crimson means the Worker acted or something broke, and green is reserved for "File ticket". Series are told apart by tone, dash, legend, and direct label. `validate_palette.js` on `#17181a,#696c73` passes the separation check (ΔE 32.2 under every CVD type) and contrast. It fails the lightness-band and chroma checks, which only flag that both colours are grey. That is intended here, because the page has no chart hue. A coloured series would be a lock change, and only the user can make one.

**Metrics offered in the select:** every metric in the newest key's `method.metrics` that has at least two graded runs in some series and at least one failure anywhere. Today that drops `tool_args`, `triage`, and `retrieval`. A sentence under the chart names the dropped ones from the data: "Tool arguments and results, triage, and retrieval never failed a graded check, so they're only in the table." It must not be typed. Default selection: `overall`.

## 3. Anatomy

```
results by run                                              (kicker, unchanged)
┌───────────────────────────────────────────────────────────────────────┐
│ What failed, run by run                         [ Overall          ⌄ ] │
│ Share of graded results that failed. Lower is better.                  │
│ A pass: Runs of a case in which no check failed.                       │
├───────────────────────────────────────────────────────────────────────┤
│ 20%                                                                    │
│ 15%                                  ┆ answer key changed               │
│ 10%                                  ●╲ 11.4%                           │
│  5%  ●╌╌╌╌╌╌╌╌╌╌╌╌●╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌●  ╲                                │
│      ░░░░░░░░░░░░░░░░░░░░░░░░░░░ 4.5% ▓▓╲▓▓▓▓                            │
│  0%  ─────────────────────────────────────────○ 0.8%                    │
│      baseline      iteration 2      iteration 3      iteration 4        │
│      Oct 8         Oct 9            Oct 10           Oct 13             │
│                                                      incomplete         │
├───────────────────────────────────────────────────────────────────────┤
│        ╌╌ earlier answer key        ── current answer key              │
└───────────────────────────────────────────────────────────────────────┘
Each line is graded with one answer key, and the two are never joined. …   (note)
Incomplete: in iteration 4, the free daily Workers AI allowance ran out …  (MissingNote, unchanged)
Tool arguments and results, triage, and retrieval never failed …          (generated)
▸ All metrics, as numbers                                                  (disclosure, closed)
New in iteration 4: the help-article cases                                 (NewCasesList, unchanged)
```

- **Frame:** a plain `div`, built like `ReplayConsole`: `rounded-2xl border border-rule bg-surface`, a header strip with `border-b border-rule px-4 py-2.5 sm:px-6`, and the legend in a footer strip. Not shadcn's `Card`. The chart registry pulls `card.tsx` in as a dependency; delete it if nothing uses it.
- **Header:** the title is an `h4`, 14px `font-medium text-ink`. The description is 12.5px `text-ink-3`, and its second line is `pass · ` plus the selected metric's `definition`, taken from the export. Below `sm` the select drops under the title (`flex-col sm:flex-row`), as in the shadcn example.
- **Chart:** `ChartContainer` at `aspect-auto h-[240px] w-full`. Horizontal grid lines only, in `rule`. No axis lines or tick lines. The y axis is 32px wide with 12px `ink-3` ticks.
- **X ticks:** two lines, the label in 12px `ink-2` and the date in 12px `ink-3`, plus "incomplete" for a run with `missing`, mirroring the table header. Below `sm`, "iteration N" shortens to "iter N". At 320px the plot is about 220px wide, so each run gets 55px, and "iteration 3" is about 60px.
- **Tooltip** (one per x, listing every series at that run):
  ```
  iteration 3 · Oct 10 · 2cd2468
  ╌╌ earlier key     6 of 132 failed    4.5%
  ── current key    15 of 132 failed   11.4%
  ```
  It adds "N ungraded" when `ungraded > 0`, and "incomplete · N runs missing" when the run has `missing`. Cursor: a 1px `rule-strong` hairline.
- **Legend:** a custom `ChartLegendContent` that draws a short line sample (solid or dashed). shadcn's default square swatch cannot show a dash. Text is 12px `ink-2`.
- **Note:** one paragraph that merges the two existing ones ("Every column is graded with the same answer key…" and "The 50 cases both runs share, graded with today's answer key…"), reworded for lines instead of columns. The "Iteration 1 is left out" sentence stays.
- **Table:** both `ResultsTable`s, unchanged, each with its meta line, inside one closed disclosure built on `components/ui/accordion.tsx`. It already uses the `.disclosure` motion and makes the closed panel `inert`. The second kicker ("since the help articles") goes, and `NewCasesList` follows the disclosure.

## 4. Interfaces

Data shaping is in `src/lib/evals.ts`, next to `percent()`. It is pure and has no Recharts types:

```ts
export const ANSWER_KEYS: Array<{ id; title; runs: EvalRun[]; method: EvalMethod }>  // oldest first; also drives the tables
export interface ChartSeries { id; label; emphasis: boolean; color: string; dash?: string }
export interface ChartPoint { failed; graded; ungraded; rate; missing?: EvalMissing }
export interface ChartRow { startedAt; label; short; date; commit; missing?; points: Record<string, ChartPoint | undefined> }

export const CHART_SERIES: ChartSeries[]
export const CHART_METRICS          // the select's options
export const CHART_LEFT_OUT         // { neverFailed, oneRun }: the metrics left to the tables, by reason
export const CHART_MAX: number      // y domain top
export function chartRows(metricId: string): ChartRow[]
export function chartSummary(metricId: string): string   // the sr-only sentence
export function failedPercent(point: ChartPoint): string
export function runDate(run): string                       // moved from eval-results.tsx
export function sentenceCase(text: string): string         // replaces eval-results' sentenceStart
```

The components:

- `src/components/eval-chart.tsx`: the frame, header, select, legend, and summary. It is a default export, lazy-loaded from `eval-results.tsx`.
- `src/components/eval-chart-plot.tsx`: the Recharts plot, the custom dot, tick, and tooltip. Each `<Area>` takes `dataKey={(row) => row.points[id]?.rate ?? null}`, so a series is drawn only across its own runs.
- `src/components/series-swatch.tsx`: the line sample that the legend and the tooltip share.

## 5. Locks: what the shadcn pieces break, and the fix

| Source | Breaks | Fix |
| --- | --- | --- |
| Recharts `<Area>` (animates the area being drawn on mount and on data change) | three motions | `isAnimationActive={false}` on every `<Area>`. This is JS animation, so the global `prefers-reduced-motion` rule in `index.css` cannot stop it |
| Recharts `<Tooltip>` (slides into position) | three motions | `isAnimationActive={false}` on `ChartTooltip` |
| `chart.tsx` tooltip value uses `font-mono` | Geist only | remove `font-mono`; tabular figures already come from `index.css` |
| `chart.tsx` tooltip uses `shadow-xl` | one shadow | `border border-rule bg-surface rounded-lg`, no shadow |
| `select.tsx` content uses `shadow-md` and `animate-in` / `fade` / `zoom` / `slide-in` | one shadow, three motions | strip them: a `border-rule` border, no animation. `popover.tsx` keeps these as a grandfathered checklist exception; a new primitive doesn't get one |
| shadcn example's blue `--chart-1/2` and gradient fills | tokens only, one accent | `ChartConfig` colours are `var(--ink)` and `var(--ink-3)`, with flat fills. If `shadcn add` writes `--chart-*` into `index.css`, revert it |
| lucide icons in `select.tsx` | consistency | Phosphor `CaretDownIcon` and `CheckIcon`, as `eval-results.tsx` uses |
| `chart.tsx` sets `outline-hidden` on the Recharts surface | one global focus outline | removed: with the accessibility layer the surface takes focus, and the arrow keys step the tooltip |
| `select.tsx` item focus uses `bg-accent` (marmalade on wash) | accent has five jobs | `focus:bg-muted focus:text-foreground` |

## 6. Phones

- The chart is in the `minmax(0,3fr)` grid column, and `ResponsiveContainer` sizes to it, so it can't widen the page. Check at 320px.
- The select trigger is `pointer-coarse:h-11` and its items are `pointer-coarse:min-h-11`. Text is 13px: a Radix trigger is a button, so iOS doesn't zoom on it.
- Touch: tapping or dragging across the plot moves the tooltip, and a vertical swipe over the chart must still scroll the page. Check this in a phone viewport. The chart never scrolls on its own.

## 7. Accessibility

- `<figure aria-labelledby={title} aria-describedby={summary}>`. The summary is `chartSummary(metricId)` in an `sr-only` paragraph, for example: "Overall, share that failed. Earlier answer key: 8.3% at baseline, 4.5% at iteration 2, 4.5% at iteration 3. Current answer key: 11.4% at iteration 3, 0.8% at iteration 4, incomplete with 8 runs missing." It is generated, never typed.
- Recharts 3's `accessibilityLayer` (on by default) makes the plot focusable, and the arrow keys step the tooltip across runs. The global focus ring applies; don't restyle it.
- The full numbers stay reachable in the table disclosure, which also keeps every metric's definition and denominator.

## 8. Performance

`shadcn add chart` installs `recharts@3.8.0`, which pulls in Redux Toolkit, immer, and parts of d3. The first build lazy-loaded only the plot, and Radix Select still added 8.4 kB gzip to the entry chunk. So the whole chart is lazy-loaded (frame, select, and plot) behind a Suspense fallback: the empty frame at the measured height, 440px below `sm` and 383px from `sm` up.

Measured with `npm run build`:

| Chunk | Before | After |
| --- | --- | --- |
| entry `index-*.js` | 496.75 kB (151.41 kB gzip) | 501.56 kB (153.34 kB gzip) |
| `eval-chart-*.js` (lazy) | none | 358.76 kB (107.17 kB gzip) |

The entry chunk grows by the chart's data shaping, which `LeftOutNote` also needs on the main page. The entry was already within 3 kB of Vite's 500 kB warning, and now trips it by 1.5 kB.

## 9. Decisions (defaults in brackets)

1. **What the y axis measures:** [share that failed, from 0, as an area]. The alternative is pass rate as a line (shadcn's line chart in the same frame), which can honestly start at 85%. An area can't.
2. **The table:** [kept, closed, in a disclosure under the chart], or removed. Removing it loses the per-metric definitions and denominators, and the chart's table view.
3. **The select:** [shadcn `Select`, re-tokenized per §5], or a styled native `<select>` (no new primitive, and the OS picker on phones).
4. **Colour:** [ink and ink-3, no new colour]. A chart hue is a lock change.
5. **The time-range select in the reference:** [dropped, replaced by the metric select]. There are 4 runs over 6 days.

## 10. Done when

- `npm run build` and `npm run lint` pass. The chak-design checklist greps show no new `font-mono`, `animate-`, or accent hits, and no shadow outside the composer.
- Every `<Area>` and `ChartTooltip` sets `isAnimationActive={false}`. The per-file count check in the chak-design review checklist enforces this, because a one-line grep misses multi-line JSX. Loading the page and switching metrics redraw instantly.
- At iteration 3 the tooltip lists both keys. Iteration 4's dot is hollow, its tick says "incomplete", and `MissingNote` still renders.
- The dropped-metrics sentence names exactly the metrics `chartMetrics()` leaves out.
- At 320px there is no horizontal overflow and the ticks don't collide. At `lg`, the chart sits in the left column beside "limits".
- After implementing, update the "Eval results on the page" and Layout sections of `CLAUDE.md`, add the `isAnimationActive` grep to `.claude/skills/chak-design/references/review-checklist.md`, and add `chart.tsx` / `select.tsx` to the list of re-tokenized shadcn primitives.
