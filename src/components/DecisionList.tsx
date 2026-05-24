import { useState } from 'react'
import { Search, Clock, CheckCircle2, ArrowRight, Trash2, Calendar, Target } from 'lucide-react'
import { Decision } from '../types'

function fmtDate(dateStr: string): string | null {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

interface Props {
  decisions: Decision[]
  onView: (id: string) => void
  onDelete: (id: string) => void
}

type Filter = 'all' | 'active' | 'resolved'
type Sort = 'newest' | 'oldest' | 'success'

export default function DecisionList({ decisions, onView, onDelete }: Props) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('newest')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = decisions
    .filter(d => filter === 'all' || d.status === filter)
    .filter(d =>
      !query ||
      d.title.toLowerCase().includes(query.toLowerCase()) ||
      d.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
    )
    .sort((a, b) => {
      if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      const rank = { met: 0, partial: 1, missed: 2, undefined: 3 }
      return (rank[a.resolution?.successCriteriaResult ?? 'undefined'] ?? 3) - (rank[b.resolution?.successCriteriaResult ?? 'undefined'] ?? 3)
    })

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      onDelete(id)
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">All Decisions</h1>
        <p className="text-sm text-slate-500 mt-0.5">{decisions.length} total — {decisions.filter(d => d.status === 'active').length} active</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title or tag…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'resolved'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs font-medium rounded-lg capitalize transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value as Sort)}
          className="text-xs border border-slate-200 rounded-lg bg-white px-3 py-2 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="success">By success criteria</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
          <p className="text-sm text-slate-400">
            {query ? 'No decisions match your search.' : 'No decisions here yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(d => (
            <div
              key={d.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3 p-4">
                <button onClick={() => onView(d.id)} className="flex-1 flex items-center gap-4 text-left min-w-0">
                  {/* Status icon */}
                  {d.status === 'active'
                    ? <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    : <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  }

                  {/* Title + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 truncate">{d.title}</p>
                      {d.tags.slice(0, 2).map(t => (
                        <span key={t} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded hidden sm:inline">
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
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
                      {d.updates.length > 0 && (
                        <span className="text-xs text-slate-400">
                          {d.updates.length} update{d.updates.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Resolution result */}
                  {d.resolution && (
                    <div className="hidden lg:flex items-center gap-3 text-xs text-slate-500 flex-shrink-0">
                      <span className={`font-medium ${
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

                  <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </button>

                <button
                  onClick={() => handleDelete(d.id)}
                  className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                    confirmDelete === d.id
                      ? 'bg-red-100 text-red-600'
                      : 'text-slate-300 hover:text-red-400 hover:bg-red-50'
                  }`}
                  title={confirmDelete === d.id ? 'Click again to confirm delete' : 'Delete'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
