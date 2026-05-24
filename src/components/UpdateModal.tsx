import { useState } from 'react'
import { X, PlusCircle, Calendar } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { Decision, UpdateEntry } from '../types'

interface Props {
  decision: Decision
  onSave: (entry: UpdateEntry) => void
  onExtendDeadline: (newDeadline: string) => void
  onClose: () => void
}

export default function UpdateModal({ decision, onSave, onExtendDeadline, onClose }: Props) {
  const [notes, setNotes] = useState('')
  const [updatedProbs, setUpdatedProbs] = useState<{ description: string; probability: number }[]>(
    decision.forecasts.map(f => ({ description: f.description, probability: f.probability }))
  )
  const [reviseProbabilities, setReviseProbabilities] = useState(false)
  const [extendDeadline, setExtendDeadline] = useState(false)
  const [newDeadline, setNewDeadline] = useState(decision.deadline ?? '')

  const deadlineChanged = extendDeadline && newDeadline && newDeadline !== decision.deadline
  const canSave = notes.trim().length > 0 || deadlineChanged

  const handleSave = () => {
    if (!canSave) return
    if (notes.trim()) {
      const entry: UpdateEntry = {
        id: uuid(),
        date: new Date().toISOString(),
        notes: notes.trim(),
        updatedForecasts: reviseProbabilities ? updatedProbs : undefined,
      }
      onSave(entry)
    }
    if (deadlineChanged) {
      onExtendDeadline(newDeadline)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900">Add Update</h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{decision.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">What has changed or what have you learned?</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              autoFocus
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="New information, changed circumstances, early signals about how this is unfolding…"
            />
          </div>

          {/* Revise probabilities */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={reviseProbabilities}
                onChange={e => setReviseProbabilities(e.target.checked)}
                className="rounded accent-indigo-600"
              />
              <span className="text-sm text-slate-700 font-medium">Revise probability forecasts</span>
            </label>
            <p className="text-xs text-slate-400 mt-0.5 ml-6">Update your estimates based on new information (Bayesian updating).</p>
          </div>

          {reviseProbabilities && decision.forecasts.length > 0 && (
            <div className="space-y-2 bg-slate-50 rounded-xl p-4 border border-slate-100">
              {updatedProbs.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 flex-1 truncate">{f.description}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={f.probability}
                    onChange={e => setUpdatedProbs(prev => prev.map((x, j) => j === i ? { ...x, probability: Number(e.target.value) } : x))}
                    className="w-24 accent-indigo-600"
                  />
                  <span className="text-sm font-semibold text-indigo-700 w-10 text-right">{f.probability}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Extend deadline */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={extendDeadline}
                onChange={e => setExtendDeadline(e.target.checked)}
                className="rounded accent-indigo-600"
              />
              <span className="text-sm text-slate-700 font-medium">
                {decision.deadline ? 'Adjust resolution date' : 'Set a resolution date'}
              </span>
            </label>
            <p className="text-xs text-slate-400 mt-0.5 ml-6">
              {decision.deadline
                ? `Currently set to ${new Date(decision.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}.`
                : 'When do you expect to know the outcome?'}
            </p>
          </div>

          {extendDeadline && (
            <div className="ml-6 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="date"
                value={newDeadline}
                onChange={e => setNewDeadline(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-5 pb-5">
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Save Update
          </button>
        </div>
      </div>
    </div>
  )
}
