import { PlusCircle, Clock, CheckCircle2, TrendingUp, ArrowRight, Calendar, Target } from 'lucide-react'

function fmtDate(dateStr: string): string | null {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}
import { Decision } from '../types'
import { brierScore, calibrationGrade } from '../utils/calibration'

interface Props {
  decisions: Decision[]
  onNew: () => void
  onView: (id: string) => void
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
    </div>
  )
}


function DecisionCard({ d, onView }: { d: Decision; onView: () => void }) {
  const topForecast = d.forecasts[0]

  return (
    <button
      onClick={onView}
      className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              d.status === 'active'
                ? 'bg-blue-50 text-blue-700'
                : d.resolution && d.resolution.successCriteriaResult === 'met'
                ? 'bg-green-50 text-green-700'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {d.status === 'active' ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
              {d.status === 'active' ? 'Active' : 'Resolved'}
            </span>
            {d.tags.slice(0, 2).map(t => (
              <span key={t} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                {t}
              </span>
            ))}
          </div>
          <p className="font-semibold text-slate-900 truncate">{d.title}</p>
          {d.description && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{d.description}</p>
          )}
          {topForecast && (
            <div className="mt-2">
              <span className="text-xs text-slate-400">
                Top forecast: <span className="font-medium text-slate-600">{topForecast.probability}%</span> — {topForecast.description}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Calendar className="w-3 h-3" />
              {fmtDate(d.createdAt)}
            </span>
            {d.deadline && fmtDate(d.deadline) && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Target className="w-3 h-3" />
                Revisit by {fmtDate(d.deadline)}
              </span>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
        </div>
      </div>
    </button>
  )
}

export default function Dashboard({ decisions, onNew, onView }: Props) {
  const active = decisions.filter(d => d.status === 'active')
  const resolved = decisions.filter(d => d.status === 'resolved')
  const score = brierScore(resolved)
  const grade = calibrationGrade(score)
  const metCount = resolved.filter(d => d.resolution?.successCriteriaResult === 'met').length
  const successRate = resolved.length ? `${Math.round((metCount / resolved.length) * 100)}%` : '—'

  const upcoming = active
    .filter(d => d.deadline && fmtDate(d.deadline) !== null)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 3)

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Your decision quality at a glance</p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          New Decision
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active"
          value={active.length}
          sub="in progress"
          icon={Clock}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Resolved"
          value={resolved.length}
          sub="with outcomes"
          icon={CheckCircle2}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          label="Brier Score"
          value={score === null ? '—' : score.toFixed(2)}
          sub={score !== null ? grade : 'need resolved decisions'}
          icon={TrendingUp}
          color="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Success Rate"
          value={successRate}
          sub={resolved.length ? `${metCount}/${resolved.length} criteria met` : 'no resolved decisions'}
          icon={Target}
          color="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Active decisions */}
        <div className="md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            Active Decisions
          </h2>
          {active.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center">
              <p className="text-sm text-slate-400">No active decisions yet.</p>
              <button
                onClick={onNew}
                className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Make your first decision →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map(d => (
                <DecisionCard key={d.id} d={d} onView={() => onView(d.id)} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar widgets */}
        <div className="space-y-4">
          {/* Upcoming deadlines */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Upcoming Deadlines
            </h3>
            {upcoming.length === 0 ? (
              <p className="text-xs text-slate-400">No deadlines set.</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map(d => (
                  <button
                    key={d.id}
                    onClick={() => onView(d.id)}
                    className="w-full text-left group"
                  >
                    <p className="text-xs font-medium text-slate-800 group-hover:text-indigo-600 truncate">{d.title}</p>
                    <p className="text-xs text-slate-400">
                      {fmtDate(d.deadline!)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recent resolutions */}
          {resolved.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                Recent Resolutions
              </h3>
              <div className="space-y-2">
                {resolved.slice(0, 3).map(d => (
                  <button
                    key={d.id}
                    onClick={() => onView(d.id)}
                    className="w-full text-left group"
                  >
                    <p className="text-xs font-medium text-slate-800 group-hover:text-indigo-600 truncate">{d.title}</p>
                    {d.resolution && (
                      <div className="flex gap-2 mt-0.5">
                        <span className={`text-xs font-medium ${
                          d.resolution.successCriteriaResult === 'met' ? 'text-green-600'
                          : d.resolution.successCriteriaResult === 'partial' ? 'text-amber-600'
                          : 'text-red-600'
                        }`}>
                          {d.resolution.successCriteriaResult === 'met' ? '✓ Met'
                          : d.resolution.successCriteriaResult === 'partial' ? '◑ Partial'
                          : '✗ Missed'}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
