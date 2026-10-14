import { useId, useState } from 'react'
import { EvalChartPlot } from '@/components/eval-chart-plot'
import { SeriesSwatch } from '@/components/series-swatch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CHART_METRICS, CHART_SERIES, chartSummary } from '@/lib/evals'

const DEFAULT_METRIC = CHART_METRICS.find((metric) => metric.id === 'overall') ?? CHART_METRICS[0]

/** The eval results as a chart: the share that failed, by run, one line per
 *  answer key (docs/design/eval-chart.md). The tables stay below it. Loaded
 *  on its own chunk by EvalResults, with Recharts and Radix Select. */
export default function EvalChart() {
  const [metricId, setMetricId] = useState(DEFAULT_METRIC?.id)
  const id = useId()
  const metric = CHART_METRICS.find((item) => item.id === metricId)
  if (!metric) return null

  return (
    <figure
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-summary`}
      className="mt-5 flex min-w-0 flex-col overflow-hidden rounded-2xl border border-rule bg-surface"
    >
      <header className="flex flex-col gap-3 border-b border-rule px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="min-w-0">
          <h4 id={`${id}-title`} className="text-[14px] font-medium text-ink">
            What failed, run by run
          </h4>
          <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">
            Share of graded results that failed. Lower is better.
          </p>
          <p className="mt-1 max-w-[52ch] text-[12.5px] leading-snug text-ink-3">
            <span className="text-ink-2">pass</span> · {metric.definition}
          </p>
        </div>
        <Select value={metric.id} onValueChange={setMetricId}>
          <SelectTrigger aria-label="Metric" className="w-full shrink-0 text-[13px] sm:w-[280px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="end">
            {CHART_METRICS.map((item) => (
              <SelectItem key={item.id} value={item.id} className="text-[13px]">
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      <div className="px-2 pt-4 sm:px-4">
        <EvalChartPlot metricId={metric.id} />
      </div>

      <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 border-t border-rule px-4 py-2.5 text-[12px] text-ink-2">
        {CHART_SERIES.map((series) => (
          <li key={series.id} className="flex items-center gap-2">
            <SeriesSwatch series={series} />
            {series.label}
          </li>
        ))}
      </ul>

      <p id={`${id}-summary`} className="sr-only">
        {chartSummary(metric.id)}
      </p>
    </figure>
  )
}
