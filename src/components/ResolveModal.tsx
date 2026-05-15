import { useState } from 'react'
import { X, CheckCircle2, Star, Info } from 'lucide-react'
import { Decision, Resolution } from '../types'

interface Props {
  decision: Decision
  onSave: (r: Resolution) => void
  onClose: () => void
}

function StarRating({ value, onChange, color }: { value: number; onChange: (n: number) => void; color: string }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} onClick={() => onChange(i)} className="focus:outline-none">
          <Star className={`w-6 h-6 transition-colors ${
            i <= value ? `fill-${color}-400 text-${color}-400` : `text-slate-200 hover:text-${color}-200`
          }`} />
        </button>
      ))}
    </div>
  )
}

const OUTCOME_LABELS: Record<number, string> = {
  1: 'Very poor — significantly worse than expected',
  2: 'Below expectations',
  3: 'Roughly as expected',
  4: 'Better than expected',
  5: 'Excellent — exceeded expectations',
}

const PROCESS_LABELS: Record<number, string> = {
  1: 'Wish I had thought harder',
  2: 'Missed important considerations',
  3: 'Reasonable process in hindsight',
  4: 'Good — would mostly repeat it',
  5: 'Near-ideal process given available info',
}

export default function ResolveModal({ decision, onSave, onClose }: Props) {
  const [actualOutcome, setActualOutcome] = useState('')
  const [outcomeScore, setOutcomeScore] = useState(0)
  const [processQualityReview, setProcessQualityReview] = useState(decision.processQualityScore)
  const [forecastWasCorrect, setForecastWasCorrect] = useState<boolean | null>(null)
  const [lessonsLearned, setLessonsLearned] = useState('')

  const canSave = actualOutcome.trim() && outcomeScore > 0 && processQualityReview > 0 && forecastWasCorrect !== null

  const handleSave = () => {
    if (!canSave) return
    onSave({
      date: new Date().toISOString(),
      actualOutcome: actualOutcome.trim(),
      outcomeScore,
      processQualityReview,
      forecastWasCorrect: forecastWasCorrect!,
      lessonsLearned: lessonsLearned.trim(),
    })
    onClose()
  }

  // Quadrant logic
  const quadrant = () => {
    if (!outcomeScore || !processQualityReview) return null
    const goodProcess = processQualityReview >= 3
    const goodOutcome = outcomeScore >= 3
    if (goodProcess && goodOutcome) return { label: 'Sound & Lucky', color: 'text-green-700 bg-green-50 border-green-200', desc: 'Good process, good outcome. The ideal.' }
    if (goodProcess && !goodOutcome) return { label: 'Sound but Unlucky', color: 'text-blue-700 bg-blue-50 border-blue-200', desc: 'Good process, bad outcome. This happens — don\'t update too hard against your process.' }
    if (!goodProcess && goodOutcome) return { label: 'Unsound but Lucky', color: 'text-amber-700 bg-amber-50 border-amber-200', desc: 'Bad process, good outcome. Don\'t mistake luck for skill.' }
    return { label: 'Unsound & Unlucky', color: 'text-red-700 bg-red-50 border-red-200', desc: 'Bad process, bad outcome. Most important to learn from.' }
  }
  const q = quadrant()

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
              Score these <em>separately and honestly</em>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">What actually happened?</label>
            <textarea
              value={actualOutcome}
              onChange={e => setActualOutcome(e.target.value)}
              rows={3}
              autoFocus
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Describe the actual outcome as objectively as possible…"
            />
          </div>

          {/* Outcome quality */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Outcome quality <span className="text-red-400">*</span>
              <span className="text-slate-400 font-normal ml-1">— how did things actually turn out?</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <button key={i} onClick={() => setOutcomeScore(i)} className="focus:outline-none">
                    <Star className={`w-6 h-6 transition-colors ${
                      i <= outcomeScore ? 'fill-green-400 text-green-400' : 'text-slate-200 hover:text-green-200'
                    }`} />
                  </button>
                ))}
              </div>
              {outcomeScore > 0 && <span className="text-xs text-slate-500">{OUTCOME_LABELS[outcomeScore]}</span>}
            </div>
          </div>

          {/* Process quality review */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Process quality <em>in retrospect</em> <span className="text-red-400">*</span>
              <span className="text-slate-400 font-normal ml-1">— now that you know the outcome</span>
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Your original score was <strong>{decision.processQualityScore}/5</strong>. Revise if needed — but be careful of hindsight bias.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <button key={i} onClick={() => setProcessQualityReview(i)} className="focus:outline-none">
                    <Star className={`w-6 h-6 transition-colors ${
                      i <= processQualityReview ? 'fill-amber-400 text-amber-400' : 'text-slate-200 hover:text-amber-200'
                    }`} />
                  </button>
                ))}
              </div>
              {processQualityReview > 0 && <span className="text-xs text-slate-500">{PROCESS_LABELS[processQualityReview]}</span>}
            </div>
          </div>

          {/* Forecast accuracy */}
          {decision.forecasts.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Did the outcome match your primary forecast? <span className="text-red-400">*</span>
              </label>
              <div className="text-xs text-slate-500 mb-2 bg-slate-50 rounded-lg p-2 border border-slate-100">
                Primary forecast: <strong>{decision.forecasts[0].probability}%</strong> — {decision.forecasts[0].description}
              </div>
              <div className="flex gap-3">
                {[true, false].map(val => (
                  <button
                    key={String(val)}
                    onClick={() => setForecastWasCorrect(val)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      forecastWasCorrect === val
                        ? val
                          ? 'bg-green-50 border-green-300 text-green-700'
                          : 'bg-red-50 border-red-300 text-red-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {val ? 'Yes, it came true' : 'No, it did not'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quadrant display */}
          {q && (
            <div className={`rounded-xl border p-4 ${q.color}`}>
              <p className="font-semibold text-sm">{q.label}</p>
              <p className="text-xs mt-0.5">{q.desc}</p>
            </div>
          )}

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
