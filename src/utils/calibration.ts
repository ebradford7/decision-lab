import { Decision } from '../types'

/**
 * Brier score: mean squared error between forecast probability and outcome.
 * Lower is better. 0 = perfect. 0.25 = no-skill (always 50%). 1 = worst.
 * Here we treat forecastWasCorrect as the binary outcome (1 or 0).
 */
export function brierScore(resolved: Decision[]): number | null {
  const withForecasts = resolved.filter(d => d.resolution && d.forecasts.length > 0)
  if (withForecasts.length === 0) return null

  const scores = withForecasts.map(d => {
    const p = d.forecasts[0].probability / 100
    const o = d.resolution!.forecastWasCorrect ? 1 : 0
    return (p - o) ** 2
  })

  return scores.reduce((a, b) => a + b, 0) / scores.length
}

export function calibrationGrade(score: number | null): string {
  if (score === null) return '—'
  if (score < 0.1) return 'Excellent'
  if (score < 0.2) return 'Good'
  if (score < 0.25) return 'Fair'
  return 'Needs work'
}

/**
 * Build calibration curve data: bucket forecasts into 10% bins,
 * compute actual hit rate per bin.
 */
export function calibrationCurveData(resolved: Decision[]) {
  const bins: Record<number, { total: number; correct: number }> = {}
  for (let b = 0; b <= 90; b += 10) bins[b] = { total: 0, correct: 0 }

  for (const d of resolved) {
    if (!d.resolution || d.forecasts.length === 0) continue
    const p = d.forecasts[0].probability
    const bucket = Math.floor(p / 10) * 10
    const key = Math.min(bucket, 90)
    bins[key].total++
    if (d.resolution.forecastWasCorrect) bins[key].correct++
  }

  return Object.entries(bins).map(([b, { total, correct }]) => ({
    predicted: Number(b) + 5, // midpoint
    actual: total > 0 ? Math.round((correct / total) * 100) : null,
    count: total,
  }))
}
