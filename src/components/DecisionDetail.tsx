import { useState } from 'react'
import {
  ChevronLeft, Clock, CheckCircle2, Tag, Calendar, Star,
  ChevronDown, ChevronUp, PlusCircle, BookOpen, Target,
  AlertTriangle, TrendingUp, Lightbulb, Users, ArrowRight, RotateCcw
} from 'lucide-react'
import { Decision } from '../types'
import UpdateModal from './UpdateModal'
import ResolveModal from './ResolveModal'
import { useDecisions } from '../hooks/useDecisions'

interface Props {
  decision: Decision
  onBack: () => void
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

function QualityMatrix({ processScore, outcomeScore }: { processScore: number; outcomeScore: number }) {
  const quadrants = [
    { x: 'high', y: 'high', label: 'Sound & Lucky', color: 'bg-green-100 text-green-800 border-green-200', active: processScore >= 3 && outcomeScore >= 3 },
    { x: 'low', y: 'high', label: 'Unsound but Lucky', color: 'bg-amber-100 text-amber-800 border-amber-200', active: processScore < 3 && outcomeScore >= 3 },
    { x: 'high', y: 'low', label: 'Sound but Unlucky', color: 'bg-blue-100 text-blue-800 border-blue-200', active: processScore >= 3 && outcomeScore < 3 },
    { x: 'low', y: 'low', label: 'Unsound & Unlucky', color: 'bg-red-100 text-red-800 border-red-200', active: processScore < 3 && outcomeScore < 3 },
  ]

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Decision Quality Matrix</p>
      <div className="relative">
        {/* Y axis label */}
        <div className="flex">
          <div className="flex flex-col items-center justify-center w-8 mr-2">
            <span className="text-xs text-slate-400 [writing-mode:vertical-rl] rotate-180">Outcome Quality →</span>
          </div>
          {/* Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-2">
              {/* Row 1: Good outcome */}
              <div className={`rounded-lg border p-3 text-center text-xs font-semibold transition-all ${
                quadrants[1].active ? quadrants[1].color + ' ring-2 ring-offset-1 ring-amber-400 scale-105' : 'bg-slate-50 text-slate-400 border-slate-100'
              }`}>
                {quadrants[1].active && <span className="text-base">✓ </span>}
                Unsound but Lucky
                <p className="font-normal text-xs mt-0.5 opacity-70">bad process · good outcome</p>
              </div>
              <div className={`rounded-lg border p-3 text-center text-xs font-semibold transition-all ${
                quadrants[0].active ? quadrants[0].color + ' ring-2 ring-offset-1 ring-green-400 scale-105' : 'bg-slate-50 text-slate-400 border-slate-100'
              }`}>
                {quadrants[0].active && <span className="text-base">✓ </span>}
                Sound & Lucky
                <p className="font-normal text-xs mt-0.5 opacity-70">good process · good outcome</p>
              </div>
              {/* Row 2: Bad outcome */}
              <div className={`rounded-lg border p-3 text-center text-xs font-semibold transition-all ${
                quadrants[3].active ? quadrants[3].color + ' ring-2 ring-offset-1 ring-red-400 scale-105' : 'bg-slate-50 text-slate-400 border-slate-100'
              }`}>
                {quadrants[3].active && <span className="text-base">✓ </span>}
                Unsound & Unlucky
                <p className="font-normal text-xs mt-0.5 opacity-70">bad process · bad outcome</p>
              </div>
              <div className={`rounded-lg border p-3 text-center text-xs font-semibold transition-all ${
                quadrants[2].active ? quadrants[2].color + ' ring-2 ring-offset-1 ring-blue-400 scale-105' : 'bg-slate-50 text-slate-400 border-slate-100'
              }`}>
                {quadrants[2].active && <span className="text-base">✓ </span>}
                Sound but Unlucky
                <p className="font-normal text-xs mt-0.5 opacity-70">good process · bad outcome</p>
              </div>
            </div>
            {/* X axis label */}
            <div className="flex justify-between text-xs text-slate-400 mt-1.5 px-2">
              <span>← Low process quality</span>
              <span>High process quality →</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DecisionDetail({ decision, onBack }: Props) {
  const { addUpdate, resolveDecision } = useDecisions()
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
              {decision.deadline && (
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Resolution by {new Date(decision.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
              {decision.updates.length > 0 && (
                <span>{decision.updates.length} update{decision.updates.length !== 1 ? 's' : ''}</span>
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
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Process Quality at Decision Time</p>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`w-4 h-4 ${i <= decision.processQualityScore ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                  ))}
                </div>
                <span className="text-xs text-slate-500">{decision.processQualityScore}/5</span>
                {decision.processQualityNotes && (
                  <span className="text-xs text-slate-400">— {decision.processQualityNotes}</span>
                )}
              </div>
            </div>
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
            <div className="pt-3 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Actual Outcome</p>
                <p className="text-sm text-slate-700">{decision.resolution.actualOutcome}</p>
                <p className="text-xs text-slate-400 mt-1.5">
                  Resolved {new Date(decision.resolution.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-medium text-slate-500 mb-1.5">Outcome Quality</p>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className={`w-4 h-4 ${i <= decision.resolution!.outcomeScore ? 'fill-green-400 text-green-400' : 'text-slate-200'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{decision.resolution.outcomeScore}/5</p>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-medium text-slate-500 mb-1.5">Process Quality (Retrospective)</p>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className={`w-4 h-4 ${i <= decision.resolution!.processQualityReview ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{decision.resolution.processQualityReview}/5</p>
                </div>
              </div>

              {decision.forecasts.length > 0 && (
                <div className={`rounded-lg border p-3 text-sm font-medium flex items-center gap-2 ${
                  decision.resolution.forecastWasCorrect
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {decision.resolution.forecastWasCorrect ? '✓ Primary forecast came true' : '✗ Primary forecast did not come true'}
                </div>
              )}

              <QualityMatrix
                processScore={decision.resolution.processQualityReview}
                outcomeScore={decision.resolution.outcomeScore}
              />

              {decision.resolution.lessonsLearned && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Lessons Learned</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{decision.resolution.lessonsLearned}</p>
                </div>
              )}
            </div>
          </Section>
        )}
      </div>

      {showUpdate && (
        <UpdateModal
          decision={decision}
          onSave={entry => addUpdate(decision.id, entry)}
          onClose={() => setShowUpdate(false)}
        />
      )}
      {showResolve && (
        <ResolveModal
          decision={decision}
          onSave={resolution => resolveDecision(decision.id, resolution)}
          onClose={() => setShowResolve(false)}
        />
      )}
    </div>
  )
}
