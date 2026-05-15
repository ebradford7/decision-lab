import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { PlusCircle, Trash2, ChevronRight, ChevronLeft, Check, Star, Info } from 'lucide-react'
import { Decision, Forecast, DecisionValue } from '../types'

interface Props {
  onSave: (d: Decision) => void
  onCancel: () => void
}

const STEPS = ['Frame', 'Socratic', 'Values', 'Forecast', 'Commit']

const socraticPrompts = [
  {
    key: 'coreQuestion' as const,
    label: 'Core Question',
    prompt: 'What is the single most important question this decision answers?',
    hint: 'Clarity here prevents answering the wrong question. Try: "Should I X in order to achieve Y?"',
    placeholder: 'e.g. Should I accept this job offer to advance my career in product management, even if it means relocating?',
  },
  {
    key: 'assumptions' as const,
    label: 'Assumptions',
    prompt: 'What key assumptions are you making? What if the most important one is wrong?',
    hint: 'Surface what must be true for your preferred option to be right.',
    placeholder: 'e.g. I\'m assuming the company is financially stable, that the team culture will suit me, and that relocation won\'t harm my relationships...',
  },
  {
    key: 'alternatives' as const,
    label: 'Alternatives',
    prompt: 'What options haven\'t you fully explored? What would a creative third option look like?',
    hint: 'Beware the false binary. Is there a way to get the upside without the downside?',
    placeholder: 'e.g. I could negotiate a remote-first arrangement, or ask for a 3-month trial period before committing to relocation...',
  },
  {
    key: 'baseRates' as const,
    label: 'Base Rates',
    prompt: 'What typically happens in situations like this? What does history suggest?',
    hint: 'Reference class forecasting: how often do people in your situation succeed with each option?',
    placeholder: 'e.g. ~60% of people who relocate for work report it as net positive after 2 years. Startups at this stage have a ~30% chance of series B...',
  },
  {
    key: 'steelMan' as const,
    label: 'Steel-Man',
    prompt: 'What is the strongest case against your current inclination? Make it as compelling as possible.',
    hint: 'If you can\'t articulate a strong opposing argument, you haven\'t thought hard enough.',
    placeholder: 'e.g. The strongest case for staying is that I underestimate how disruptive relocation will be, and that internal promotions at my current firm are more likely than I think...',
  },
  {
    key: 'preMortem' as const,
    label: 'Pre-Mortem',
    prompt: 'It\'s 18 months from now and this decision failed. What happened?',
    hint: 'Imagining failure makes it easier to spot risks you\'re currently glossing over.',
    placeholder: 'e.g. The role wasn\'t what was described in interviews. I struggled to build relationships remotely. The company missed targets and froze headcount...',
  },
  {
    key: 'secondOrder' as const,
    label: 'Second-Order Effects',
    prompt: 'What are the downstream consequences of each option? What happens after that?',
    hint: '"And then what?" Think beyond the immediate effect.',
    placeholder: 'e.g. If I take this role and it goes well, I\'ll be well positioned for VP roles. If I stay and my manager leaves, my growth stalls...',
  },
]

function StepIndicator({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div className="flex items-center gap-0">
      {labels.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
              i < current
                ? 'bg-indigo-600 text-white'
                : i === current
                ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                : 'bg-slate-100 text-slate-400'
            }`}>
              {i < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-xs mt-1 font-medium hidden sm:block ${
              i === current ? 'text-indigo-700' : i < current ? 'text-slate-500' : 'text-slate-300'
            }`}>{label}</span>
          </div>
          {i < total - 1 && (
            <div className={`w-8 md:w-16 h-0.5 mx-1 mb-4 transition-colors ${
              i < current ? 'bg-indigo-600' : 'bg-slate-100'
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}

function Tip({ text }: { text: string }) {
  return (
    <div className="flex gap-2 bg-indigo-50 border border-indigo-100 rounded-lg p-3 mt-2">
      <Info className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-indigo-700">{text}</p>
    </div>
  )
}

export default function DecisionWizard({ onSave, onCancel }: Props) {
  const [step, setStep] = useState(0)

  // Step 1
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [successCriteria, setSuccessCriteria] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  // Step 2
  const [socratic, setSocratic] = useState({
    coreQuestion: '', assumptions: '', alternatives: '',
    baseRates: '', steelMan: '', preMortem: '', secondOrder: '',
  })

  // Step 3
  const [values, setValues] = useState<DecisionValue[]>([])
  const [newValueLabel, setNewValueLabel] = useState('')
  const [newValueWeight, setNewValueWeight] = useState<'high' | 'medium' | 'low'>('high')

  // Step 4
  const [options, setOptions] = useState<string[]>(['', ''])
  const [forecasts, setForecasts] = useState<Forecast[]>([
    { id: uuid(), description: '', probability: 50 },
  ])

  // Step 5
  const [chosenOption, setChosenOption] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [processQualityScore, setProcessQualityScore] = useState(0)
  const [processQualityNotes, setProcessQualityNotes] = useState('')

  const canAdvance = () => {
    if (step === 0) return title.trim().length > 0
    if (step === 4) return chosenOption.trim().length > 0 && processQualityScore > 0
    return true
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
      setTagInput('')
    }
  }

  const addValue = () => {
    if (!newValueLabel.trim()) return
    setValues([...values, { id: uuid(), label: newValueLabel.trim(), weight: newValueWeight, notes: '' }])
    setNewValueLabel('')
  }

  const addForecast = () => {
    setForecasts([...forecasts, { id: uuid(), description: '', probability: 50 }])
  }

  const updateForecast = (id: string, patch: Partial<Forecast>) => {
    setForecasts(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
  }

  const totalProb = forecasts.reduce((s, f) => s + f.probability, 0)

  const handleSubmit = () => {
    const decision: Decision = {
      id: uuid(),
      title: title.trim(),
      createdAt: new Date().toISOString(),
      status: 'active',
      tags,
      description,
      deadline: deadline || undefined,
      successCriteria,
      socratic,
      values,
      options: options.filter(o => o.trim()),
      forecasts: forecasts.filter(f => f.description.trim()),
      chosenOption,
      reasoning,
      processQualityScore,
      processQualityNotes,
      updates: [],
    }
    onSave(decision)
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-8">
        <button onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <h1 className="text-xl font-bold text-slate-900">New Decision</h1>
        <p className="text-sm text-slate-500 mt-1">Work through this carefully — decision quality starts with the process.</p>
      </div>

      <div className="mb-8 flex justify-center">
        <StepIndicator current={step} total={STEPS.length} labels={STEPS} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[420px] flex flex-col">

        {/* ── Step 0: Frame ── */}
        {step === 0 && (
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Frame the Decision</h2>
              <p className="text-sm text-slate-500 mt-0.5">What are you deciding? Good framing is half the work.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Decision title <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Accept the Senior PM offer at Acme Corp"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Context / background</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="What's the situation? What has led you here?"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Expected resolution date</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tags</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTag()}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="career, finance…"
                  />
                  <button onClick={addTag} className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
                    <PlusCircle className="w-4 h-4" />
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {tags.map(t => (
                      <span key={t} className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                        {t}
                        <button onClick={() => setTags(tags.filter(x => x !== t))} className="hover:text-red-500">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Success criteria</label>
              <textarea
                value={successCriteria}
                onChange={e => setSuccessCriteria(e.target.value)}
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="How will you know, concretely, whether this decision worked out well?"
              />
              <Tip text="Pre-define success before the outcome is known. This prevents post-hoc rationalisation." />
            </div>
          </div>
        )}

        {/* ── Step 1: Socratic ── */}
        {step === 1 && (
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Socratic Exploration</h2>
              <p className="text-sm text-slate-500 mt-0.5">These questions are designed to surface blind spots. Answer honestly — this is for you.</p>
            </div>
            {socraticPrompts.map(({ key, label, prompt, hint, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-slate-700 mb-0.5 uppercase tracking-wider">{label}</label>
                <p className="text-sm text-slate-600 mb-1.5 italic">"{prompt}"</p>
                <textarea
                  value={socratic[key]}
                  onChange={e => setSocratic(prev => ({ ...prev, [key]: e.target.value }))}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder={placeholder}
                />
                <Tip text={hint} />
              </div>
            ))}
          </div>
        )}

        {/* ── Step 2: Values ── */}
        {step === 2 && (
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Values & Criteria</h2>
              <p className="text-sm text-slate-500 mt-0.5">What matters most to you? Explicit values prevent you from optimising for the wrong thing.</p>
            </div>
            <Tip text="Examples: financial security, autonomy, impact, family time, learning, stability. Be specific to you, not what sounds impressive." />

            {/* Add value */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newValueLabel}
                onChange={e => setNewValueLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addValue()}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Add a value or criterion…"
              />
              <select
                value={newValueWeight}
                onChange={e => setNewValueWeight(e.target.value as 'high' | 'medium' | 'low')}
                className="border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <button
                onClick={addValue}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Add
              </button>
            </div>

            {/* Values list */}
            {values.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Add the values at stake in this decision.</p>
            ) : (
              <div className="space-y-2">
                {values.map(v => (
                  <div key={v.id} className="flex items-start gap-3 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-900">{v.label}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          v.weight === 'high' ? 'bg-red-100 text-red-700'
                          : v.weight === 'medium' ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                        }`}>{v.weight}</span>
                      </div>
                      <input
                        type="text"
                        value={v.notes}
                        onChange={e => setValues(prev => prev.map(x => x.id === v.id ? { ...x, notes: e.target.value } : x))}
                        className="mt-1.5 w-full text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="Why does this value matter here? Any tensions?"
                      />
                    </div>
                    <button
                      onClick={() => setValues(prev => prev.filter(x => x.id !== v.id))}
                      className="text-slate-300 hover:text-red-400 mt-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Forecast ── */}
        {step === 3 && (
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Options & Probability Forecasts</h2>
              <p className="text-sm text-slate-500 mt-0.5">Superforecasters commit to explicit probabilities. This makes your uncertainty visible and trackable.</p>
            </div>

            {/* Options */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">Your Options</label>
              <div className="space-y-2">
                {options.map((o, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={o}
                      onChange={e => setOptions(prev => prev.map((x, j) => j === i ? e.target.value : x))}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder={`Option ${i + 1}…`}
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => setOptions(prev => prev.filter((_, j) => j !== i))}
                        className="text-slate-300 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setOptions(prev => [...prev, ''])}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Add option
                </button>
              </div>
            </div>

            {/* Forecasts */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Outcome Forecasts</label>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  Math.abs(totalProb - 100) < 1
                    ? 'bg-green-50 text-green-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  Total: {totalProb}% {Math.abs(totalProb - 100) < 1 ? '✓' : '(aim for 100%)'}
                </span>
              </div>
              <Tip text="Name each outcome you care about (e.g. 'Role is a strong fit', 'Company hits Series B') and assign your honest probability. These are your tracked forecasts." />
              <div className="space-y-2 mt-3">
                {forecasts.map(f => (
                  <div key={f.id} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <input
                      type="text"
                      value={f.description}
                      onChange={e => updateForecast(f.id, { description: e.target.value })}
                      className="flex-1 border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Outcome description…"
                    />
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={f.probability}
                        onChange={e => updateForecast(f.id, { probability: Number(e.target.value) })}
                        className="w-20 accent-indigo-600"
                      />
                      <span className="text-sm font-semibold text-indigo-700 w-10 text-right">{f.probability}%</span>
                    </div>
                    {forecasts.length > 1 && (
                      <button
                        onClick={() => setForecasts(prev => prev.filter(x => x.id !== f.id))}
                        className="text-slate-300 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addForecast}
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-2"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Add forecast
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Commit ── */}
        {step === 4 && (
          <div className="flex-1 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Commit & Self-Assess</h2>
              <p className="text-sm text-slate-500 mt-0.5">Make the call. Then honestly rate your process — before the outcome is known.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Your chosen option <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={chosenOption}
                onChange={e => setChosenOption(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="State your decision clearly and concisely"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Primary reasoning</label>
              <textarea
                value={reasoning}
                onChange={e => setReasoning(e.target.value)}
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="What tipped you toward this option? What is the crux of your reasoning?"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">
                Process quality score <span className="text-red-400">*</span>
                <span className="font-normal text-slate-400 ml-1">— how well did you reason through this?</span>
              </label>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <button
                      key={i}
                      onClick={() => setProcessQualityScore(i)}
                      className="focus:outline-none"
                    >
                      <Star className={`w-7 h-7 transition-colors ${
                        i <= processQualityScore ? 'fill-amber-400 text-amber-400' : 'text-slate-200 hover:text-amber-200'
                      }`} />
                    </button>
                  ))}
                </div>
                <span className="text-sm text-slate-500">
                  {processQualityScore === 0 ? 'Select a rating' :
                   processQualityScore === 1 ? 'Gut feel, minimal analysis' :
                   processQualityScore === 2 ? 'Some thought, gaps remain' :
                   processQualityScore === 3 ? 'Solid reasoning' :
                   processQualityScore === 4 ? 'Thorough, well-considered' :
                   'Rigorous — considered alternatives, base rates, values'}
                </span>
              </div>
              <Tip text="Rate your reasoning process, not how confident you feel about the outcome. A 5-star process can still yield a bad outcome — and that's okay." />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Process quality notes</label>
              <textarea
                value={processQualityNotes}
                onChange={e => setProcessQualityNotes(e.target.value)}
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="What would have made your decision process stronger? Any shortcuts you took?"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-100">
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : onCancel()}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance()}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              {step === 1 ? 'Capture Values' : step === 2 ? 'Set Forecasts' : step === 3 ? 'Commit' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canAdvance()}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              Save Decision
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
