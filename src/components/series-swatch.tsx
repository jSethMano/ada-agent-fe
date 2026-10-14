import type { ChartSeries } from '@/lib/evals'

/** A short sample of a series' line, so the legend and the tooltip name a key
 *  by its tone and dash, never by colour alone. */
export function SeriesSwatch({ series }: { series: ChartSeries }) {
  return (
    <svg aria-hidden width="16" height="4" viewBox="0 0 16 4" className="shrink-0">
      <line x1="0" y1="2" x2="16" y2="2" stroke={series.color} strokeWidth="2" strokeDasharray={series.dash} />
    </svg>
  )
}
