import { useState } from 'react'
import {
  ChevronLeft, Clock, CheckCircle2, Tag, Calendar,
  ChevronDown, ChevronUp, PlusCircle, BookOpen, Target,
  TrendingUp, Lightbulb, Users, RotateCcw
} from 'lucide-react'
import { Decision, UpdateEntry, Resolution } from '../types'
import UpdateModal from './UpdateModal'
import ResolveModal from './ResolveModal'

interface Props {
  decision: Decision
  onBack: () => void
  onAddUpdate: (id: string, entry: UpdateEntry) => void
  onUpdateDecision: (id: string, patch: Partial<Decision>) => void
  onResolve: (id: string, resolution: Resolution) => void
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatDate(dateStr: string): string | null {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-sm text-slate-900">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-50">{children}</div>}
    </div>
  )
}

function SocraticRow({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null
  return (
    <div className="py-3 border-b border-slate-50 last:border-0">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-slate-700 whitespace-pre-wrap">{value}</p>
    </div>
  )
}


export default function DecisionDetail({ decision, onBack, onAddUpdate, onUpdateDecision, onResolve }: Props) {
  const [showUpdate, setShowUpdate] = useState(false)
  const [showResolve, setShowResolve] = useState(false)

  const latestForecasts = (() => {
    const lastUpdate = [...decision.updates].reverse().find(u => u.updatedForecasts)
    return lastUpdate?.updatedForecasts ?? decision.forecasts.map(f => ({ description: f.description, probability: f.probability }))
  })()

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" /> All Decisions
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                decision.status === 'active'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-green-50 text-green-700'
              }`}>
                {decision.status === 'active'
                  ? <><Clock className="w-3 h-3" /> Active</>
                  : <><CheckCircle2 className="w-3 h-3" /> Resolved</>
                }
              </span>
              {decision.tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  <Tag className="w-2.5 h-2.5" />{t}
                </span>
              ))}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">{decision.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Created {new Date(decision.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {decision.deadline && formatDate(decision.deadline) && (
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Revisit by {formatDate(decision.deadline)}
                </span>
              )}
              {decision.updates.length > 0 && (
                <span>{decision.updates.length} update{decision.updates.length !== 1 ? 's' : ''}</span>
              )}
              {decision.durationSeconds != null && decision.durationSeconds > 0 && (
                <span className="flex items-center gap-1" title="Time spent on this decision">
                  <Clock className="w-3 h-3" />
                  {formatDuration(decision.durationSeconds)}
                </span>
              )}
            </div>
          </div>

          {decision.status === 'active' && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setShowUpdate(true)}
                className="flex items-center gap-1.5 text-sm font-medium border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 px-3 py-2 rounded-lg transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Update
              </button>
              <button
                onClick={() => setShowResolve(true)}
                className="flex items-center gap-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Resolve
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Decision summary */}
        <Section title="Decision" icon={BookOpen}>
          <div className="pt-3 space-y-3">
            {decision.description && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Context</p>
                <p className="text-sm text-slate-700">{decision.description}</p>
              </div>
            )}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Chosen Option</p>
              <p className="font-semibold text-slate-900">{decision.chosenOption}</p>
              {decision.reasoning && (
                <p className="text-sm text-slate-600 mt-1.5">{decision.reasoning}</p>
              )}
            </div>
            {decision.successCriteria && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Success Criteria</p>
                <p className="text-sm text-slate-700">{decision.successCriteria}</p>
              </div>
            )}
          </div>
        </Section>

        {/* Forecasts */}
        <Section title="Probability Forecasts" icon={TrendingUp}>
          <div className="pt-3 space-y-2">
            {latestForecasts.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate">{f.description}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-32 bg-slate-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${f.probability}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-indigo-700 w-10 text-right">{f.probability}%</span>
                </div>
              </div>
            ))}
            {decision.updates.some(u => u.updatedForecasts) && (
              <p className="text-xs text-slate-400 mt-1">Showing most recent estimates. See update log for history.</p>
            )}
          </div>
        </Section>

        {/* Socratic exploration */}
        <Section title="Socratic Exploration" icon={Lightbulb} defaultOpen={false}>
          <div className="pt-3">
            <SocraticRow label="Core Question" value={decision.socratic.coreQuestion} />
            <SocraticRow label="Key Assumptions" value={decision.socratic.assumptions} />
            <SocraticRow label="Alternatives Considered" value={decision.socratic.alternatives} />
            <SocraticRow label="Base Rates" value={decision.socratic.baseRates} />
            <SocraticRow label="Steel-Man (Opposing View)" value={decision.socratic.steelMan} />
            <SocraticRow label="Pre-Mortem" value={decision.socratic.preMortem} />
            <SocraticRow label="Second-Order Effects" value={decision.socratic.secondOrder} />
          </div>
        </Section>

        {/* Values */}
        {decision.values.length > 0 && (
          <Section title="Values & Criteria" icon={Users} defaultOpen={false}>
            <div className="pt-3 space-y-2">
              {decision.values.map(v => (
                <div key={v.id} className="flex items-start gap-3 bg-slate-50 rounded-lg p-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{v.label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        v.weight === 'high' ? 'bg-red-100 text-red-700'
                        : v.weight === 'medium' ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                      }`}>{v.weight}</span>
                    </div>
                    {v.notes && <p className="text-xs text-slate-500 mt-0.5">{v.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Update log */}
        {decision.updates.length > 0 && (
          <Section title={`Update Log (${decision.updates.length})`} icon={RotateCcw}>
            <div className="pt-3 space-y-4">
              {[...decision.updates].reverse().map(u => (
                <div key={u.id} className="border-l-2 border-slate-200 pl-4">
                  <p className="text-xs text-slate-400 mb-1">
                    {new Date(u.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{u.notes}</p>
                  {u.updatedForecasts && (
                    <div className="mt-2 bg-slate-50 rounded-lg p-2 border border-slate-100 space-y-1">
                      <p className="text-xs font-medium text-slate-500">Updated forecasts:</p>
                      {u.updatedForecasts.map((f, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-600 truncate">{f.description}</span>
                          <span className="text-xs font-bold text-indigo-700 flex-shrink-0">{f.probability}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Resolution */}
        {decision.resolution && (
          <Section title="Resolution" icon={CheckCircle2}>
            <div className="pt-3 space-y-5">

              {/* ── OUTCOME sub-section ── */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Results — what the world delivered</p>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">What Happened</p>
                    <p className="text-sm text-slate-700">{decision.resolution.actualOutcome}</p>
                    <p className="text-xs text-slate-400 mt-1.5">
                      Resolved {formatDate(decision.resolution.date)}
                    </p>
                  </div>

                  {/* Forecast accuracies */}
                  {decision.resolution.forecastAccuracies.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Predictions vs Reality</p>
                      <div className="space-y-2">
                        {decision.resolution.forecastAccuracies.map((fa, i) => (
                          <div key={i} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-slate-100">
                            <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                              fa.wasCorrect ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {fa.wasCorrect ? '✓' : '✗'}
                            </span>
                            <p className="text-xs text-slate-700 flex-1">{fa.description}</p>
                            <span className="text-xs font-bold text-indigo-700 flex-shrink-0">{fa.probability}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── PROCESS sub-section ── */}
              {(decision.resolution.successCriteriaResult || decision.resolution.lessonsLearned) && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 mb-2">Judgment Quality — did your reasoning hold up</p>
                  <div className="space-y-3">
                    {/* Success criteria result */}
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Decision Intent</p>
                      {decision.resolution.successCriteriaResult === 'met' && (
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700">
                          ✓ Achieved what you set out to do
                        </span>
                      )}
                      {decision.resolution.successCriteriaResult === 'partial' && (
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                          ◑ Partially achieved your intent
                        </span>
                      )}
                      {decision.resolution.successCriteriaResult === 'missed' && (
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700">
                          ✗ Did not achieve your intent
                        </span>
                      )}
                    </div>

                    {decision.resolution.lessonsLearned && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Lessons Learned</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{decision.resolution.lessonsLearned}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </Section>
        )}
      </div>

      {showUpdate && (
        <UpdateModal
          decision={decision}
          onSave={entry => onAddUpdate(decision.id, entry)}
          onExtendDeadline={newDeadline => onUpdateDecision(decision.id, { deadline: newDeadline })}
          onClose={() => setShowUpdate(false)}
        />
      )}
      {showResolve && (
        <ResolveModal
          decision={decision}
          onSave={resolution => onResolve(decision.id, resolution)}
          onClose={() => setShowResolve(false)}
        />
      )}
    </div>
  )
}
