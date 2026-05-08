import { Outlet, NavLink } from 'react-router-dom'
import { Bot, GitBranch, Activity, LayoutTemplate, Zap } from 'lucide-react'

const nav = [
  { to: '/agents',     icon: Bot,            label: 'Agents'     },
  { to: '/workflows',  icon: GitBranch,       label: 'Workflows'  },
  { to: '/monitoring', icon: Activity,        label: 'Monitoring' },
  { to: '/templates',  icon: LayoutTemplate,  label: 'Templates'  },
]

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shadow">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">AgentOS</p>
            <p className="text-xs text-gray-400">Orchestration Platform</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">Powered by LangGraph + Claude</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  )
}
