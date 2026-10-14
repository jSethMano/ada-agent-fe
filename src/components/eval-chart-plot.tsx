import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type XAxisTickContentProps,
} from 'recharts'
import { SeriesSwatch } from '@/components/series-swatch'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { CHART_MAX, CHART_SERIES, chartRows, failedPercent, type ChartRow, type ChartSeries } from '@/lib/evals'

/*
 * The plot inside EvalChart. Nothing in it animates (isAnimationActive={false}
 * on every Area and on the tooltip): metric changes redraw at once.
 */

const CONFIG: ChartConfig = Object.fromEntries(
  CHART_SERIES.map((series) => [series.id, { label: series.label, color: series.color }]),
)

const TICKS = Array.from({ length: CHART_MAX / 5 + 1 }, (_, index) => index * 5)

/** Text inside the chart takes its colour inline: ChartContainer's own tick
 *  rule would otherwise win over a class. */
const INK_2 = { fill: 'var(--ink-2)' }
const INK_3 = { fill: 'var(--ink-3)' }

interface DotShape {
  cx?: number
  cy?: number
  index: number
  payload?: unknown
}

/** A run on one line. Hollow when the run is incomplete. The line's last run
 *  carries its value, so each key ends on a number. */
function RunDot({
  cx,
  cy,
  index,
  payload,
  series,
  last,
  active = false,
}: DotShape & { series: ChartSeries; last: number; active?: boolean }) {
  const point = (payload as ChartRow | undefined)?.points[series.id]
  if (!point || cx == null || cy == null) return <g key={`${series.id}-${index}`} />
  const hollow = Boolean(point.missing)
  return (
    <g key={`${series.id}-${index}`}>
      <circle
        cx={cx}
        cy={cy}
        r={active ? 5 : 4}
        fill={hollow ? 'var(--surface)' : series.color}
        stroke={hollow ? series.color : 'var(--surface)'}
        strokeWidth={2}
      />
      {index === last && !active && (
        // The newest key ends at the right edge, so its value sits to the
        // right; an older key ends where the next begins, so its value sits
        // above and to the left, clear of the newer line.
        <text
          x={series.emphasis ? cx + 9 : cx - 8}
          y={series.emphasis ? cy + 4 : cy - 9}
          textAnchor={series.emphasis ? 'start' : 'end'}
          fontSize={12}
          style={INK_2}
        >
          {failedPercent(point)}
        </text>
      )}
    </g>
  )
}

/** The run's label and date, as the table's column header has them. "iter 3"
 *  below sm, where "iteration 3" is wider than its share of a 320px axis. */
function RunTick({ x, y, payload, rows }: XAxisTickContentProps & { rows: ChartRow[] }) {
  const row = rows.find((item) => item.startedAt === payload.value)
  if (!row) return null
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" dy={12} fontSize={12} style={INK_2} className="sm:hidden">
        {row.short}
      </text>
      <text textAnchor="middle" dy={12} fontSize={12} style={INK_2} className="hidden sm:inline">
        {row.label}
      </text>
      <text textAnchor="middle" dy={27} fontSize={12} style={INK_3}>
        {row.date}
      </text>
      {row.missing && (
        <text textAnchor="middle" dy={42} fontSize={12} style={INK_3}>
          incomplete
        </text>
      )}
    </g>
  )
}

/** Every key's result at one run, read off the row rather than Recharts'
 *  payload, so a key with no run here is simply absent. */
function RunTooltip({ active, payload }: TooltipContentProps<number, string>) {
  const row = payload?.[0]?.payload as ChartRow | undefined
  if (!active || !row) return null
  return (
    <div className="grid gap-2 rounded-lg border border-rule bg-surface px-3 py-2 text-[12px] leading-snug">
      <p className="font-medium text-ink">
        {row.label} · {row.date} · {row.commit}
      </p>
      {CHART_SERIES.map((series) => {
        const point = row.points[series.id]
        if (!point) return null
        return (
          <div key={series.id}>
            <p className="flex items-center gap-2 text-ink-3">
              <SeriesSwatch series={series} />
              {series.label}
            </p>
            <p className="pl-6 text-ink-2">
              {point.failed} of {point.graded} failed · <span className="font-medium text-ink">{failedPercent(point)}</span>
            </p>
            {point.ungraded > 0 && <p className="pl-6 text-ink-3">{point.ungraded} ungraded</p>}
            {point.missing && <p className="pl-6 text-ink-3">incomplete · {point.missing.runs} runs missing</p>}
          </div>
        )
      })}
    </div>
  )
}

export function EvalChartPlot({ metricId }: { metricId: string }) {
  const rows = chartRows(metricId)
  // Where two keys graded the same run, the answer key changed.
  const shared = rows.filter((row) => Object.values(row.points).filter(Boolean).length > 1)
  const last = Object.fromEntries(
    CHART_SERIES.map((series) => [series.id, rows.map((row) => Boolean(row.points[series.id])).lastIndexOf(true)]),
  )

  return (
    <ChartContainer config={CONFIG} className="aspect-auto h-[240px] w-full">
      <AreaChart data={rows} margin={{ top: 20, right: 8, bottom: 0, left: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} stroke="var(--rule)" />
        <YAxis
          domain={[0, CHART_MAX]}
          ticks={TICKS}
          tickFormatter={(value: number) => `${value}%`}
          width={36}
          axisLine={false}
          tickLine={false}
        />
        <XAxis
          dataKey="startedAt"
          interval={0}
          axisLine={false}
          tickLine={false}
          height={58}
          padding={{ left: 28, right: 44 }}
          tick={(props: XAxisTickContentProps) => <RunTick {...props} rows={rows} />}
        />
        {shared.map((row) => (
          <ReferenceLine
            key={row.startedAt}
            x={row.startedAt}
            stroke="var(--rule-strong)"
            label={{ value: 'answer key changed', position: 'insideTopRight', fontSize: 12, fill: 'var(--ink-3)' }}
          />
        ))}
        <ChartTooltip
          isAnimationActive={false}
          cursor={{ stroke: 'var(--rule-strong)', strokeWidth: 1 }}
          content={(props) => <RunTooltip {...(props as TooltipContentProps<number, string>)} />}
        />
        {CHART_SERIES.map((series) => (
          <Area
            key={series.id}
            name={series.id}
            dataKey={(row: ChartRow) => row.points[series.id]?.rate ?? null}
            type="linear"
            stroke={series.color}
            strokeWidth={2}
            strokeDasharray={series.dash}
            fill={series.color}
            fillOpacity={series.emphasis ? 0.08 : 0.06}
            dot={(props) => <RunDot {...props} series={series} last={last[series.id]} />}
            activeDot={(props) => <RunDot {...props} series={series} last={last[series.id]} active />}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  )
}
