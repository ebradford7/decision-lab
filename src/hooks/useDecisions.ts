import { useState, useEffect, useCallback } from 'react'
import { Decision, UpdateEntry, Resolution } from '../types'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── Supabase row shape ───────────────────────────────────────────────────────
interface DecisionRow {
  id: string
  user_id: string
  data: Decision
  created_at: string
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useDecisions() {
  const { user } = useAuth()
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [loading, setLoading] = useState(true)

  // Load all decisions for this user from Supabase
  useEffect(() => {
    if (!user) {
      setDecisions([])
      setLoading(false)
      return
    }

    setLoading(true)
    supabase
      .from('decisions')
      .select('data')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setDecisions((data as DecisionRow[]).map(row => row.data))
        }
        setLoading(false)
      })
  }, [user])

  // ── Write helpers ───────────────────────────────────────────────────────────

  const persist = useCallback(async (decision: Decision) => {
    if (!user) return
    await supabase.from('decisions').upsert({
      id: decision.id,
      user_id: user.id,
      data: decision,
      created_at: decision.createdAt,
    })
  }, [user])

  const addDecision = useCallback(async (d: Decision) => {
    setDecisions(prev => [d, ...prev])   // optimistic update
    await persist(d)
  }, [persist])

  const updateDecision = useCallback(async (id: string, patch: Partial<Decision>) => {
    let updated: Decision | undefined
    setDecisions(prev => prev.map(d => {
      if (d.id !== id) return d
      updated = { ...d, ...patch }
      return updated
    }))
    if (updated) await persist(updated)
  }, [persist])

  const addUpdate = useCallback(async (id: string, entry: UpdateEntry) => {
    let updated: Decision | undefined
    setDecisions(prev => prev.map(d => {
      if (d.id !== id) return d
      updated = { ...d, updates: [...d.updates, entry] }
      return updated
    }))
    if (updated) await persist(updated)
  }, [persist])

  const resolveDecision = useCallback(async (id: string, resolution: Resolution) => {
    let updated: Decision | undefined
    setDecisions(prev => prev.map(d => {
      if (d.id !== id) return d
      updated = { ...d, status: 'resolved', resolution }
      return updated
    }))
    if (updated) await persist(updated)
  }, [persist])

  const deleteDecision = useCallback(async (id: string) => {
    setDecisions(prev => prev.filter(d => d.id !== id))
    await supabase.from('decisions').delete().eq('id', id)
  }, [])

  return {
    decisions,
    loading,
    addDecision,
    updateDecision,
    addUpdate,
    resolveDecision,
    deleteDecision,
  }
}
