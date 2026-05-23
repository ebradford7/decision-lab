import { Decision } from '../types'

/**
 * Brier score: mean squared error between forecast probability and outcome.
 * Lower is better. 0 = perfect. 0.25 = no-skill (always 50%). 1 = worst.
 * Here we treat forecastWasCorrect as the binary outcome (1 or 0).
 */
export function brierScore(resolved: Decision[]): number | null {
  const allEntries = resolved.flatMap(d =>
    (d.resolution?.forecastAccuracies ?? []).map(fa => ({
      probability: fa.probability,
      wasCorrect: fa.wasCorrect,
    }))
  )
  if (allEntries.length === 0) return null

  const scores = allEntries.map(fa => {
    const p = fa.probability / 100
    const o = fa.wasCorrect ? 1 : 0
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
    if (!d.resolution) continue
    for (const fa of d.resolution.forecastAccuracies) {
      const bucket = Math.floor(fa.probability / 10) * 10
      const key = Math.min(bucket, 90)
      bins[key].total++
      if (fa.wasCorrect) bins[key].correct++
    }
  }

  return Object.entries(bins).map(([b, { total, correct }]) => ({
    predicted: Number(b) + 5, // midpoint
    actual: total > 0 ? Math.round((correct / total) * 100) : null,
    count: total,
  }))
}
