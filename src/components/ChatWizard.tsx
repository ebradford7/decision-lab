import { useState, useEffect, useRef, useCallback } from 'react'
import { v4 as uuid } from 'uuid'
import { ChevronLeft, Send, CheckCircle2, Mic, MicOff } from 'lucide-react'
import { Decision, DecisionValue, Forecast } from '../types'
import { sendMessage, extractJson } from '../lib/claude'

// ── Web Speech API types ──────────────────────────────────────────────────────
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: Event) => void) | null
  onend: (() => void) | null
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

interface Props {
  onSave: (d: Decision) => void
  onCancel: () => void
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  displayContent: string
}

interface ExtractedData {
  title?: string
  description?: string
  deadline?: string
  successCriteria?: string
  tags?: string[]
  options?: string[]
  values?: { label: string; weight: 'high' | 'medium' | 'low'; notes: string }[]
  forecasts?: { description: string; probability: number }[]
  chosenOption?: string
  reasoning?: string
  processQualityScore?: number
  socratic?: {
    coreQuestion?: string
    assumptions?: string
    alternatives?: string
    baseRates?: string
    steelMan?: string
    preMortem?: string
    secondOrder?: string
  }
  isComplete?: boolean
}

// ── Decision Card sub-components ──────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-slate-300 italic">{label}</p>
}

function WeightBadge({ weight }: { weight: 'high' | 'medium' | 'low' }) {
  const cls =
    weight === 'high'
      ? 'bg-red-100 text-red-700'
      : weight === 'medium'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-slate-100 text-slate-500'
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cls}`}>{weight}</span>
  )
}

function ProbabilityBar({ probability }: { probability: number }) {
  const color =
    probability >= 70
      ? 'bg-green-500'
      : probability >= 40
      ? 'bg-amber-400'
      : 'bg-red-400'
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${probability}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-slate-600 w-8 text-right">{probability}%</span>
    </div>
  )
}

const FORECAST_COLORS = [
  { bar: 'bg-indigo-500', legend: 'bg-indigo-400', text: 'text-indigo-700' },
  { bar: 'bg-violet-500', legend: 'bg-violet-400', text: 'text-violet-700' },
  { bar: 'bg-sky-500', legend: 'bg-sky-400', text: 'text-sky-700' },
  { bar: 'bg-emerald-500', legend: 'bg-emerald-400', text: 'text-emerald-700' },
  { bar: 'bg-amber-500', legend: 'bg-amber-400', text: 'text-amber-700' },
]

function StackedForecastBar({ forecasts }: { forecasts: { description: string; probability: number }[] }) {
  // For exactly 2 forecasts, auto-complement: second bar = 100 - first probability
  const displayForecasts = forecasts.length === 2
    ? [
        forecasts[0],
        { ...forecasts[1], probability: Math.max(0, 100 - forecasts[0].probability) },
      ]
    : forecasts

  return (
    <div>
      {/* Stacked bar */}
      <div className="h-8 rounded-full overflow-hidden flex transition-all duration-500">
        {displayForecasts.map((f, i) => {
          const color = FORECAST_COLORS[i % FORECAST_COLORS.length]
          return (
            <div
              key={i}
              className={`h-full ${color.bar} transition-all duration-500`}
              style={{ width: `${f.probability}%` }}
              title={`${f.description}: ${f.probability}%`}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-2.5 space-y-1.5">
        {displayForecasts.map((f, i) => {
          const color = FORECAST_COLORS[i % FORECAST_COLORS.length]
          return (
            <div key={i} className="flex items-start gap-2">
              <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 mt-0.5 ${color.legend}`} />
              <span className="text-xs text-slate-600 flex-1 leading-snug">{f.description}</span>
              <span className={`text-xs font-semibold flex-shrink-0 ${color.text}`}>{f.probability}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Render **bold** markdown inline
function renderText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  )
}

const DRAFT_KEY = 'decision-lab-draft'

const OPENING_MESSAGE: Message = {
  id: 'opening',
  role: 'assistant',
  content: 'What decision are you facing right now?\n\nGive me a brief title and some context — what\'s the situation, and why is this decision on your mind?',
  displayContent: 'What decision are you facing right now?\n\nGive me a brief title and some context — what\'s the situation, and why is this decision on your mind?',
}

interface DraftData {
  messages: Message[]
  extracted: ExtractedData
  accumulatedSeconds: number
}

function loadDraft(): DraftData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveDraft(messages: Message[], extracted: ExtractedData, accumulatedSeconds: number) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ messages, extracted, accumulatedSeconds }))
  } catch {}
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ChatWizard({ onSave, onCancel }: Props) {
  const draft = loadDraft()
  const [messages, setMessages] = useState<Message[]>(draft?.messages ?? [OPENING_MESSAGE])
  const [extracted, setExtracted] = useState<ExtractedData>(draft?.extracted ?? {})
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Stopwatch — track session start and previously accumulated time
  const sessionStartRef = useRef<number>(Date.now())
  const accumulatedSecondsRef = useRef<number>(draft?.accumulatedSeconds ?? 0)

  // ── Voice input ──────────────────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false)
  const [voiceSupported] = useState(() =>
    typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  )
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.continuous = false      // stop automatically after the user pauses
    rec.interimResults = false  // only fire on confirmed final transcripts
    rec.lang = 'en-US'
    recognitionRef.current = rec

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from({ length: e.results.length })
        .map((_, i) => e.results[i][0].transcript)
        .join(' ')
        .trim()
      if (transcript) {
        setInput(prev => {
          const base = prev.trim()
          return base ? `${base} ${transcript}` : transcript
        })
      }
    }

    rec.onerror = () => setIsListening(false)
    rec.onend = () => setIsListening(false)

    rec.start()
    setIsListening(true)
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const toggleVoice = useCallback(() => {
    if (isListening) stopListening()
    else startListening()
  }, [isListening, startListening, stopListening])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingText, scrollToBottom])

  // Persist draft to localStorage whenever conversation changes, accumulating elapsed time
  useEffect(() => {
    if (messages.length > 0) {
      const sessionElapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000)
      accumulatedSecondsRef.current = (draft?.accumulatedSeconds ?? 0) + sessionElapsed
      saveDraft(messages, extracted, accumulatedSecondsRef.current)
    }
  }, [messages, extracted])

  // Build the API messages array from component state
  const buildApiMessages = useCallback(
    (msgs: Message[]): { role: 'user' | 'assistant'; content: string }[] => {
      return msgs.map(m => ({ role: m.role, content: m.content }))
    },
    []
  )

  // Strip JSON block from text for clean display (handles partial blocks during streaming)
  const stripJsonForDisplay = (text: string): string => {
    // Remove complete ```json ... ``` blocks
    let result = text.replace(/```json[\s\S]*?```/g, '').trim()
    // Remove any partial ```json block that hasn't closed yet
    const partialIdx = result.indexOf('```')
    if (partialIdx !== -1) {
      result = result.slice(0, partialIdx).trim()
    }
    return result
  }

  // Send a message to Claude and handle streaming
  const callClaude = useCallback(
    async (userContent: string, currentMessages: Message[]) => {
      setIsLoading(true)
      setStreamingText('')

      const userMsg: Message = {
        id: uuid(),
        role: 'user',
        content: userContent,
        displayContent: userContent,
      }

      const updatedMessages = [...currentMessages, userMsg]
      setMessages(updatedMessages)

      let finalMsg: Message | null = null
      let finalJson: ExtractedData | null = null

      try {
        const apiMessages = buildApiMessages(updatedMessages)
        const fullText = await sendMessage(apiMessages, chunk => {
          setStreamingText(prev => prev + chunk)
        })

        const { displayText, json } = extractJson(fullText)
        finalMsg = {
          id: uuid(),
          role: 'assistant',
          content: fullText,
          displayContent: displayText,
        }
        if (json) finalJson = json as ExtractedData
      } catch (err) {
        console.error('Claude API error:', err)
        finalMsg = {
          id: uuid(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          displayContent: 'Sorry, I encountered an error. Please try again.',
        }
      } finally {
        // Batch all state updates together so the streaming bubble and
        // the final message never overlap in the same render
        if (finalMsg) setMessages(prev => [...prev, finalMsg!])
        if (finalJson) setExtracted(finalJson)
        setStreamingText('')
        setIsLoading(false)
      }
    },
    [buildApiMessages]
  )


  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    if (isListening) stopListening()
    setInput('')
    callClaude(trimmed, messages)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSave = () => {
    const decision: Decision = {
      id: uuid(),
      createdAt: new Date().toISOString(),
      status: 'active',
      updates: [],
      title: extracted.title ?? '',
      description: extracted.description ?? '',
      deadline: extracted.deadline || undefined,
      successCriteria: extracted.successCriteria ?? '',
      tags: extracted.tags ?? [],
      options: extracted.options ?? [],
      values: (extracted.values ?? []).map(v => ({
        id: uuid(),
        label: v.label,
        weight: v.weight,
        notes: v.notes,
      })) as DecisionValue[],
      forecasts: (extracted.forecasts ?? []).map(f => ({
        id: uuid(),
        description: f.description,
        probability: f.probability,
      })) as Forecast[],
      chosenOption: extracted.chosenOption ?? '',
      reasoning: extracted.reasoning ?? '',
      processQualityScore: extracted.processQualityScore ?? 0,
      processQualityNotes: '',
      socratic: {
        coreQuestion: extracted.socratic?.coreQuestion ?? '',
        assumptions: extracted.socratic?.assumptions ?? '',
        alternatives: extracted.socratic?.alternatives ?? '',
        baseRates: extracted.socratic?.baseRates ?? '',
        steelMan: extracted.socratic?.steelMan ?? '',
        preMortem: extracted.socratic?.preMortem ?? '',
        secondOrder: extracted.socratic?.secondOrder ?? '',
      },
    }
    const sessionElapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000)
    const totalSeconds = accumulatedSecondsRef.current + sessionElapsed
    clearDraft()
    onSave({ ...decision, durationSeconds: totalSeconds })
  }

  const hasTitle = Boolean(extracted.title?.trim())
  const filteredOptions = (extracted.options ?? []).filter(o => o.trim())
  const filteredValues = (extracted.values ?? []).filter(v => v.label?.trim())
  const filteredForecasts = (extracted.forecasts ?? []).filter(f => f.description?.trim())
  const hasOptions = filteredOptions.length > 0
  const hasValues = filteredValues.length > 0
  const hasForecasts = filteredForecasts.length > 0
  const hasCommitment = Boolean(extracted.chosenOption?.trim())

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
        <button
          onClick={() => { clearDraft(); onCancel() }}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <div className="w-px h-4 bg-slate-200" />
        <h1 className="text-sm font-semibold text-slate-900">New Decision</h1>
        {hasTitle && (
          <>
            <div className="w-px h-4 bg-slate-200" />
            <span className="text-sm text-slate-500 truncate max-w-xs">{extracted.title}</span>
          </>
        )}
      </div>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">

        {/* ── Left panel: Chat ────────────────────────────────────────────── */}
        <div className="flex flex-col md:w-[55%] border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50 h-[50vh] md:h-full">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {renderText(msg.displayContent)}
                </div>
              </div>
            ))}

            {/* Streaming bubble */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed bg-white border border-slate-200 text-slate-800 shadow-sm">
                  {streamingText ? (
                    <span className="whitespace-pre-wrap">{renderText(stripJsonForDisplay(streamingText))}</span>
                  ) : (
                    <span className="flex gap-1 items-center py-0.5">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-slate-200 bg-white px-4 py-3">
            <div className="flex gap-2 items-end">
              <div className="relative flex-1">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  rows={1}
                  placeholder={isListening ? 'Listening… speak now' : 'Type your message… (Enter to send, Shift+Enter for newline)'}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400 max-h-32 overflow-y-auto transition-colors ${
                    isListening
                      ? 'border-red-300 bg-red-50 focus:ring-red-400'
                      : 'border-slate-200'
                  }`}
                  style={{ minHeight: '42px' }}
                />
                {isListening && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-0.5 items-center">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="w-0.5 rounded-full bg-red-400 animate-pulse"
                        style={{ height: '12px', animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </span>
                )}
              </div>

              {voiceSupported && (
                <button
                  onClick={toggleVoice}
                  disabled={isLoading}
                  title={isListening ? 'Stop recording' : 'Speak your message'}
                  className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${
                    isListening
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'border border-slate-200 hover:border-indigo-300 text-slate-400 hover:text-indigo-600'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}

              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-xl transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Right panel: Decision Card ──────────────────────────────────── */}
        <div className="md:w-[45%] overflow-y-auto bg-white px-5 py-5 space-y-5 h-[50vh] md:h-full">

          {/* Decision header */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Decision</p>
            {hasTitle ? (
              <>
                <h2 className="text-base font-bold text-slate-900 leading-snug">{extracted.title}</h2>
                {extracted.description && (
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{extracted.description}</p>
                )}
                {extracted.deadline && (
                  <p className="text-xs text-slate-400 mt-2">Deadline: {extracted.deadline}</p>
                )}
                {extracted.successCriteria && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <p className="text-xs font-medium text-slate-500 mb-0.5">Success criteria</p>
                    <p className="text-xs text-slate-600">{extracted.successCriteria}</p>
                  </div>
                )}
                {(extracted.tags?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {extracted.tags!.map(tag => (
                      <span key={tag} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <EmptyState label="Waiting for the decision topic…" />
            )}
          </div>

          {/* Options */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Options</p>
            {hasOptions ? (
              <div className="flex flex-wrap gap-2">
                {filteredOptions.map((opt, i) => (
                  <span
                    key={i}
                    className="text-sm bg-white border border-slate-200 text-slate-700 px-3 py-1 rounded-full shadow-sm"
                  >
                    {opt}
                  </span>
                ))}
              </div>
            ) : (
              <EmptyState label="Options will appear as you discuss them…" />
            )}
          </div>

          {/* Values */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Values</p>
            {hasValues ? (
              <div className="space-y-2">
                {filteredValues.map((v, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <WeightBadge weight={v.weight} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-slate-800">{v.label}</span>
                      {v.notes && (
                        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{v.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState label="Your values and priorities will show here…" />
            )}
          </div>

          {/* Forecasts */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Forecasts</p>
            {hasForecasts ? (
              <StackedForecastBar forecasts={filteredForecasts} />
            ) : (
              <EmptyState label="Probability forecasts will appear here…" />
            )}
          </div>

          {/* Commitment */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Commitment</p>
            {hasCommitment ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-slate-900">{extracted.chosenOption}</span>
                </div>
                {extracted.reasoning && (
                  <p className="text-sm text-slate-500 leading-relaxed pl-6">{extracted.reasoning}</p>
                )}
              </div>
            ) : (
              <EmptyState label="Your final decision and reasoning will appear here…" />
            )}
          </div>

          {/* Save button */}
          {extracted.isComplete && (
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-3 rounded-2xl transition-colors shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save Decision
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
