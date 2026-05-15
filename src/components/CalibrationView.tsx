import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Line, ComposedChart, Area
} from 'recharts'
import { Target, TrendingUp, CheckCircle2, Star, Info } from 'lucide-react'
import { Decision } from '../types'
import { brierScore, calibrationGrade, calibrationCurveData } from '../utils/calibration'

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

export default function CalibrationView({ decisions }: Props) {
  const resolved = decisions.filter(d => d.status === 'resolved')
  const withForecasts = resolved.filter(d => d.resolution && d.forecasts.length > 0)
  const score = brierScore(resolved)
  const grade = calibrationGrade(score)
  const curveData = calibrationCurveData(resolved)
  const filledCurve = curveData.filter(d => d.actual !== null)

  const avgOutcome = resolved.length
    ? (resolved.reduce((s, d) => s + (d.resolution?.outcomeScore ?? 0), 0) / resolved.length).toFixed(1)
    : '—'
  const avgProcess = resolved.length
    ? (resolved.reduce((s, d) => s + (d.resolution?.processQualityReview ?? 0), 0) / resolved.length).toFixed(1)
    : '—'

  const correctForecasts = withForecasts.filter(d => d.resolution!.forecastWasCorrect).length

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Calibration</h1>
        <p className="text-sm text-slate-500 mt-0.5">How well do your probability estimates match reality over time?</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatBox
          label="Brier Score"
          value={score !== null ? score.toFixed(3) : '—'}
          sub={`Grade: ${grade}`}
          color="bg-indigo-50 border-indigo-100 text-indigo-900"
        />
        <StatBox
          label="Forecast Accuracy"
          value={withForecasts.length > 0 ? `${Math.round((correctForecasts / withForecasts.length) * 100)}%` : '—'}
          sub={`${correctForecasts}/${withForecasts.length} correct`}
          color="bg-green-50 border-green-100 text-green-900"
        />
        <StatBox
          label="Avg Outcome"
          value={avgOutcome}
          sub="out of 5"
          color="bg-emerald-50 border-emerald-100 text-emerald-900"
        />
        <StatBox
          label="Avg Process"
          value={avgProcess}
          sub="retrospective"
          color="bg-amber-50 border-amber-100 text-amber-900"
        />
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

          {/* Process vs Outcome scatter */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Process vs Outcome Quality
            </h2>
            <p className="text-xs text-slate-400 mb-4">Each dot is a resolved decision. Good decisions cluster top-right — but top-left and bottom-right reveal luck vs skill.</p>
            <ResponsiveContainer width="100%" height={240}>
              <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  dataKey="process"
                  domain={[0.5, 5.5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  label={{ value: 'Process Quality', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#94a3b8' }}
                />
                <YAxis
                  type="number"
                  dataKey="outcome"
                  domain={[0.5, 5.5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  label={{ value: 'Outcome', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg p-2 text-xs shadow-sm">
                        <p className="font-medium text-slate-900 mb-1 max-w-40 truncate">{d.title}</p>
                        <p className="text-slate-500">Process: {d.process}/5</p>
                        <p className="text-slate-500">Outcome: {d.outcome}/5</p>
                      </div>
                    )
                  }}
                />
                <ReferenceLine x={3} stroke="#e2e8f0" strokeDasharray="4 2" />
                <ReferenceLine y={3} stroke="#e2e8f0" strokeDasharray="4 2" />
                <Scatter
                  data={resolved
                    .filter(d => d.resolution)
                    .map(d => ({
                      process: d.resolution!.processQualityReview,
                      outcome: d.resolution!.outcomeScore,
                      title: d.title,
                    }))}
                  fill="#4f46e5"
                  fillOpacity={0.7}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Decision table */}
      {withForecasts.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Resolved Forecasts</h2>
            <p className="text-xs text-slate-400">Your forecast accuracy per decision.</p>
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
                {withForecasts.map(d => {
                  const p = d.forecasts[0].probability / 100
                  const o = d.resolution!.forecastWasCorrect ? 1 : 0
                  const bs = ((p - o) ** 2).toFixed(3)
                  return (
                    <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900 truncate max-w-48">{d.title}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(d.resolution!.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-xs text-slate-600 truncate max-w-36">{d.forecasts[0].description}</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-semibold text-indigo-700">{d.forecasts[0].probability}%</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          d.resolution!.forecastWasCorrect
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {d.resolution!.forecastWasCorrect ? '✓ Yes' : '✗ No'}
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
          <p><strong className="text-slate-700">Brier Score</strong> measures forecast accuracy (lower = better).</p>
          <p>0.00 = perfect · 0.10 = excellent · 0.25 = no-skill (always predict 50%) · 1.00 = worst possible</p>
          <p>A superforecaster typically achieves Brier scores below 0.15 on geopolitical questions.</p>
        </div>
      </div>
    </div>
  )
}
