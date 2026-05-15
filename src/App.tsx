import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthGate from './components/AuthGate'
import Layout, { View } from './components/Layout'
import Dashboard from './components/Dashboard'
import DecisionWizard from './components/DecisionWizard'
import DecisionList from './components/DecisionList'
import DecisionDetail from './components/DecisionDetail'
import CalibrationView from './components/CalibrationView'
import { useDecisions } from './hooks/useDecisions'
import { Decision } from './types'

// ─── Inner app — only rendered when authenticated ─────────────────────────────
function AppInner() {
  const { user, signOut } = useAuth()
  const { decisions, loading, addDecision, deleteDecision } = useDecisions()
  const [view, setView] = useState<View>('dashboard')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleNav = (v: View) => {
    setView(v)
    setSelectedId(null)
  }

  const handleView = (id: string) => {
    setSelectedId(id)
    setView('detail')
  }

  const handleSave = async (d: Decision) => {
    await addDecision(d)
    setSelectedId(d.id)
    setView('detail')
  }

  const selectedDecision = selectedId ? decisions.find(d => d.id === selectedId) : null

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-sm">Loading your decisions…</p>
        </div>
      </div>
    )
  }

  return (
    <Layout current={view} onNav={handleNav} userEmail={user?.email} onSignOut={signOut}>
      {view === 'dashboard' && (
        <Dashboard
          decisions={decisions}
          onNew={() => handleNav('new')}
          onView={handleView}
        />
      )}
      {view === 'new' && (
        <DecisionWizard
          onSave={handleSave}
          onCancel={() => handleNav('dashboard')}
        />
      )}
      {view === 'list' && (
        <DecisionList
          decisions={decisions}
          onView={handleView}
          onDelete={id => {
            deleteDecision(id)
            if (selectedId === id) setSelectedId(null)
          }}
        />
      )}
      {view === 'detail' && selectedDecision && (
        <DecisionDetail
          decision={selectedDecision}
          onBack={() => handleNav('list')}
        />
      )}
      {view === 'calibration' && (
        <CalibrationView decisions={decisions} />
      )}
    </Layout>
  )
}

// ─── Root — handles auth gate ─────────────────────────────────────────────────
function AppRoot() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!user) return <AuthGate />
  return <AppInner />
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  )
}
