import { useState } from 'react'
import { X, CheckCircle2, Info } from 'lucide-react'
import { Decision, Resolution } from '../types'

interface Props {
  decision: Decision
  onSave: (r: Resolution) => void
  onClose: () => void
}

export default function ResolveModal({ decision, onSave, onClose }: Props) {
  const [actualOutcome, setActualOutcome] = useState('')
  const [successCriteriaResult, setSuccessCriteriaResult] = useState<'met' | 'partial' | 'missed' | null>(
    decision.successCriteria ? null : 'partial'
  )
  const [forecastAnswers, setForecastAnswers] = useState<(boolean | null)[]>(
    decision.forecasts.map(() => null)
  )
  const [lessonsLearned, setLessonsLearned] = useState('')

  const allForecastsAnswered =
    decision.forecasts.length === 0 || forecastAnswers.every(a => a !== null)

  const canSave =
    actualOutcome.trim() !== '' &&
    successCriteriaResult !== null &&
    allForecastsAnswered

  const handleSave = () => {
    if (!canSave) return
    const resolution: Resolution = {
      date: new Date().toISOString(),
      actualOutcome: actualOutcome.trim(),
      successCriteriaResult: successCriteriaResult!,
      forecastAccuracies: decision.forecasts.map((f, i) => ({
        description: f.description,
        probability: f.probability,
        wasCorrect: forecastAnswers[i] as boolean,
      })),
      lessonsLearned: lessonsLearned.trim(),
    }
    onSave(resolution)
    onClose()
  }

  const setForecastAnswer = (index: number, value: boolean) => {
    setForecastAnswers(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Resolve Decision
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{decision.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Key principle callout */}
          <div className="flex gap-2 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
            <Info className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-700">
              <strong>Remember:</strong> A good decision can have a bad outcome, and a bad decision can have a good outcome.
              Evaluate these <em>separately and honestly</em>.
            </p>
          </div>

          {/* What actually happened */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              What actually happened? <span className="text-red-400">*</span>
            </label>
            <textarea
              value={actualOutcome}
              onChange={e => setActualOutcome(e.target.value)}
              rows={3}
              autoFocus
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Describe the actual outcome as objectively as possible…"
            />
          </div>

          {/* Success criteria */}
          {decision.successCriteria && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Did you meet your success criteria? <span className="text-red-400">*</span>
              </label>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 mb-3 text-xs text-slate-600">
                <span className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Success criteria: </span>
                {decision.successCriteria}
              </div>
              <div className="flex gap-2">
                {([
                  { value: 'met', label: 'Met', active: 'bg-green-50 border-green-400 text-green-700', inactive: 'border-slate-200 text-slate-500 hover:border-slate-300' },
                  { value: 'partial', label: 'Partially Met', active: 'bg-amber-50 border-amber-400 text-amber-700', inactive: 'border-slate-200 text-slate-500 hover:border-slate-300' },
                  { value: 'missed', label: 'Missed', active: 'bg-red-50 border-red-400 text-red-700', inactive: 'border-slate-200 text-slate-500 hover:border-slate-300' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSuccessCriteriaResult(opt.value)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      successCriteriaResult === opt.value ? opt.active : opt.inactive
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Forecast accuracy */}
          {decision.forecasts.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">
                How did your forecasts play out? <span className="text-red-400">*</span>
              </label>
              <div className="space-y-3">
                {decision.forecasts.map((f, i) => (
                  <div key={f.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-xs text-slate-700 flex-1">{f.description}</p>
                      <span className="text-xs font-bold text-indigo-700 flex-shrink-0">{f.probability}%</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setForecastAnswer(i, true)}
                        className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                          forecastAnswers[i] === true
                            ? 'bg-green-50 border-green-400 text-green-700'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setForecastAnswer(i, false)}
                        className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                          forecastAnswers[i] === false
                            ? 'bg-red-50 border-red-400 text-red-700'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lessons learned */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Lessons learned</label>
            <textarea
              value={lessonsLearned}
              onChange={e => setLessonsLearned(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="What would you do differently? What surprised you? What confirmed your model?"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-5 pb-5">
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark Resolved
          </button>
        </div>
      </div>
    </div>
  )
}
