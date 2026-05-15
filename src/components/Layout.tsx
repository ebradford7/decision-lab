import { LayoutDashboard, ListChecks, PlusCircle, Target, ChevronRight, LogOut } from 'lucide-react'

export type View = 'dashboard' | 'new' | 'list' | 'calibration' | 'detail'

interface Props {
  current: View
  onNav: (v: View) => void
  children: React.ReactNode
  userEmail?: string
  onSignOut?: () => void
}

const navItems = [
  { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'new' as View, label: 'New Decision', icon: PlusCircle },
  { id: 'list' as View, label: 'All Decisions', icon: ListChecks },
  { id: 'calibration' as View, label: 'Calibration', icon: Target },
]

export default function Layout({ current, onNav, children, userEmail, onSignOut }: Props) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Target className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-sm tracking-tight">Decision Lab</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-tight">Decide well. Track honestly.</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNav(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                current === id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {current === id && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
            </button>
          ))}
        </nav>

        {/* User + sign-out */}
        {userEmail && (
          <div className="px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500 truncate font-medium" title={userEmail}>
              {userEmail}
            </p>
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 mt-1.5 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              Sign out
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
