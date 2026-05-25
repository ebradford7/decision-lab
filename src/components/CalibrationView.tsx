import {
  ResponsiveContainer, CartesianGrid, Tooltip,
  Line, ComposedChart, XAxis, YAxis, Scatter
} from 'recharts'
import { Target, TrendingUp, Info } from 'lucide-react'
import { Decision } from '../types'
import { calibrationGrade } from '../utils/calibration'

interface Props {
  decisions: Decision[]
}

function StatBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

function GroupCard({ title, subtitle, borderColor, children }: {
  title: string; subtitle: string; borderColor: string; children: React.ReactNode
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 border-l-4 ${borderColor} p-5`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">{title}</p>
      <p className="text-xs text-slate-400 mb-4">{subtitle}</p>
      <div className="grid grid-cols-2 gap-3">
        {children}
      </div>
    </div>
  )
}

export default function CalibrationView({ decisions }: Props) {
  const resolved = decisions.filter(d => d.status === 'resolved')

  // Collect all individual forecast accuracy entries across all resolved decisions
  const allForecastEntries = resolved.flatMap(d =>
    (d.resolution?.forecastAccuracies ?? []).map(fa => ({ ...fa, decisionTitle: d.title, decisionId: d.id }))
  )

  // Brier score: average of (p/100 - outcome)^2 across all forecast entries
  const brierScore = allForecastEntries.length > 0
    ? allForecastEntries.reduce((sum, fa) => {
        const p = fa.probability / 100
        const o = fa.wasCorrect ? 1 : 0
        return sum + (p - o) ** 2
      }, 0) / allForecastEntries.length
    : null

  const grade = calibrationGrade(brierScore)

  // Calibration curve: bucket all forecast entries into 10% bins
  const bins: Record<number, { total: number; correct: number }> = {}
  for (let b = 0; b <= 90; b += 10) bins[b] = { total: 0, correct: 0 }
  for (const fa of allForecastEntries) {
    const bucket = Math.min(Math.floor(fa.probability / 10) * 10, 90)
    bins[bucket].total++
    if (fa.wasCorrect) bins[bucket].correct++
  }
  const curveData = Object.entries(bins).map(([b, { total, correct }]) => ({
    predicted: Number(b) + 5,
    actual: total > 0 ? Math.round((correct / total) * 100) : null,
    count: total,
  }))
  const filledCurve = curveData.filter(d => d.actual !== null)

  // Forecast accuracy: % of entries that were correct
  const correctEntries = allForecastEntries.filter(fa => fa.wasCorrect).length
  const forecastAccuracyPct =
    allForecastEntries.length > 0
      ? Math.round((correctEntries / allForecastEntries.length) * 100)
      : null

  // Success rate: % of resolved decisions where successCriteriaResult === 'met'
  const metCount = resolved.filter(d => d.resolution?.successCriteriaResult === 'met').length
  const partialCount = resolved.filter(d => d.resolution?.successCriteriaResult === 'partial').length
  const missedCount = resolved.filter(d => d.resolution?.successCriteriaResult === 'missed').length

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">Calibration</h1>
        <p className="text-sm text-slate-500 mt-0.5">How well do your probability estimates match reality over time?</p>
      </div>

      {/* Framing callout */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
        <p className="text-sm text-indigo-800 font-medium">Good decision quality with a bad result is still good decision-making.</p>
        <p className="text-xs text-indigo-600 mt-1">Focus on improving your reasoning — your Brier score reflects decision quality, not luck.</p>
      </div>

      {/* Stats — two grouped cards */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <GroupCard
          title="Decision Quality"
          subtitle="How well you reasoned — the part you can improve"
          borderColor="border-l-indigo-400"
        >
          <StatBox
            label="Brier Score"
            value={brierScore !== null ? brierScore.toFixed(3) : '—'}
            sub={`Grade: ${grade}`}
            color="bg-indigo-50 border-indigo-100 text-indigo-900"
          />
          <StatBox
            label="Forecast Accuracy"
            value={forecastAccuracyPct !== null ? `${forecastAccuracyPct}%` : '—'}
            sub={allForecastEntries.length > 0 ? `${correctEntries}/${allForecastEntries.length} correct` : undefined}
            color="bg-indigo-50 border-indigo-100 text-indigo-900"
          />
        </GroupCard>

        <GroupCard
          title="Results"
          subtitle="What the world delivered — influenced by luck"
          borderColor="border-l-emerald-400"
        >
          <StatBox
            label="Success Rate"
            value={resolved.length > 0 ? `${Math.round((metCount / resolved.length) * 100)}%` : '—'}
            sub={resolved.length > 0 ? `${metCount}/${resolved.length} met criteria` : undefined}
            color="bg-emerald-50 border-emerald-100 text-emerald-900"
          />
          <StatBox
            label="Decisions Resolved"
            value={String(resolved.length)}
            color="bg-slate-50 border-slate-100 text-slate-900"
          />
        </GroupCard>
      </div>

      {resolved.length < 3 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
          <Target className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Resolve at least 3 decisions to see your calibration chart.</p>
          <p className="text-xs text-slate-400 mt-1">Your Brier score and calibration curve will appear here.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Calibration curve */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Calibration Curve
            </h2>
            <p className="text-xs text-slate-400 mb-4">Predicted probability vs actual hit rate. Perfect calibration hugs the diagonal.</p>

            {filledCurve.length < 2 ? (
              <p className="text-xs text-slate-400 text-center py-8">Not enough data per bin yet — keep resolving decisions.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={curveData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="predicted"
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={v => `${v}%`}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    label={{ value: 'Predicted', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#94a3b8' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={v => `${v}%`}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    label={{ value: 'Actual', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }}
                  />
                  <Tooltip
                    formatter={(val, name) => [`${val}%`, name === 'actual' ? 'Actual rate' : name]}
                    labelFormatter={v => `Predicted: ${v}%`}
                  />
                  {/* Perfect calibration line */}
                  <Line
                    type="linear"
                    dataKey="predicted"
                    dot={false}
                    stroke="#e2e8f0"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    name="Perfect"
                  />
                  {/* Your calibration */}
                  <Scatter
                    dataKey="actual"
                    fill="#4f46e5"
                    name="Your calibration"
                    data={filledCurve}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Success Criteria Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Success Criteria Breakdown</h2>
            <p className="text-xs text-slate-400 mb-4">How your resolved decisions measured up to their success criteria.</p>

            <div className="flex gap-3 mb-5">
              <div className="flex-1 rounded-lg bg-green-50 border border-green-100 p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{metCount}</p>
                <p className="text-xs text-green-600 font-medium mt-0.5">Met</p>
              </div>
              <div className="flex-1 rounded-lg bg-amber-50 border border-amber-100 p-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{partialCount}</p>
                <p className="text-xs text-amber-600 font-medium mt-0.5">Partial</p>
              </div>
              <div className="flex-1 rounded-lg bg-red-50 border border-red-100 p-3 text-center">
                <p className="text-2xl font-bold text-red-700">{missedCount}</p>
                <p className="text-xs text-red-600 font-medium mt-0.5">Missed</p>
              </div>
            </div>

            {/* Stacked bar */}
            {resolved.length > 0 && (
              <div className="h-4 rounded-full overflow-hidden flex">
                {metCount > 0 && (
                  <div
                    className="bg-green-400 h-full"
                    style={{ width: `${(metCount / resolved.length) * 100}%` }}
                    title={`Met: ${metCount}`}
                  />
                )}
                {partialCount > 0 && (
                  <div
                    className="bg-amber-400 h-full"
                    style={{ width: `${(partialCount / resolved.length) * 100}%` }}
                    title={`Partial: ${partialCount}`}
                  />
                )}
                {missedCount > 0 && (
                  <div
                    className="bg-red-400 h-full"
                    style={{ width: `${(missedCount / resolved.length) * 100}%` }}
                    title={`Missed: ${missedCount}`}
                  />
                )}
              </div>
            )}
            <div className="flex gap-4 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Met</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Partial</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Missed</span>
            </div>
          </div>
        </div>
      )}

      {/* Resolved Forecasts table — one row per forecast entry */}
      {allForecastEntries.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Resolved Forecasts</h2>
            <p className="text-xs text-slate-400">One row per individual forecast entry.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Decision</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-3 py-3">Forecast</th>
                  <th className="text-center text-xs font-medium text-slate-500 px-3 py-3">Predicted</th>
                  <th className="text-center text-xs font-medium text-slate-500 px-3 py-3">Outcome</th>
                  <th className="text-center text-xs font-medium text-slate-500 px-3 py-3">Brier</th>
                </tr>
              </thead>
              <tbody>
                {allForecastEntries.map((fa, idx) => {
                  const p = fa.probability / 100
                  const o = fa.wasCorrect ? 1 : 0
                  const bs = ((p - o) ** 2).toFixed(3)
                  return (
                    <tr key={`${fa.decisionId}-${idx}`} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900 truncate max-w-48">{fa.decisionTitle}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-xs text-slate-600 truncate max-w-48">{fa.description}</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-semibold text-indigo-700">{fa.probability}%</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          fa.wasCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {fa.wasCorrect ? '✓ Yes' : '✗ No'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-xs font-mono font-semibold ${
                          Number(bs) < 0.1 ? 'text-green-600'
                          : Number(bs) < 0.25 ? 'text-amber-600'
                          : 'text-red-600'
                        }`}>{bs}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Brier score explainer */}
      <div className="mt-4 flex gap-2 bg-slate-50 border border-slate-200 rounded-xl p-4">
        <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-500 space-y-0.5">
          <p><strong className="text-slate-700">Brier Score</strong> measures forecast accuracy (lower = better) — it's a decision quality metric, not a results metric.</p>
          <p>0.00 = perfect · 0.10 = excellent · 0.25 = no-skill (always predict 50%) · 1.00 = worst possible</p>
          <p>A superforecaster typically achieves Brier scores below 0.15 on geopolitical questions. A good Brier score means you reasoned well — regardless of whether individual outcomes went your way.</p>
        </div>
      </div>
    </div>
  )
}
