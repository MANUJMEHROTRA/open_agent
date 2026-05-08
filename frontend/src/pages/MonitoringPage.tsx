import { useState, useEffect, useRef, useCallback } from 'react'
import { Activity, Circle, Cpu, DollarSign, MessageSquare, Zap } from 'lucide-react'
import { monitoringApi, createMonitoringSocket } from '../api/client'
import type { ExecutionLog, Stats } from '../types'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface LogEvent {
  type: string
  timestamp?: string
  level?: string
  message?: string
  execution_id?: number
  node_id?: string
  agent_id?: number
  output?: string
  response?: string
  error?: string
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-gray-500 text-xs">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    running:   'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    failed:    'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }
  return `badge ${map[status] || 'bg-gray-100 text-gray-500'}`
}

export default function MonitoringPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [executions, setExecutions] = useState<ExecutionLog[]>([])
  const [liveEvents, setLiveEvents] = useState<LogEvent[]>([])
  const [selectedExec, setSelectedExec] = useState<ExecutionLog | null>(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async () => {
    const [s, e] = await Promise.all([monitoringApi.stats(), monitoringApi.executions({ limit: 50 })])
    setStats(s)
    setExecutions(e)
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [loadData])

  useEffect(() => {
    const ws = createMonitoringSocket((data) => {
      const event = data as LogEvent
      setLiveEvents(evs => [...evs.slice(-199), event])
      if (event.type === 'execution_complete' || event.type === 'workflow_complete' || event.type === 'execution_failed') {
        loadData()
      }
    })
    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    wsRef.current = ws
    return () => { ws.close() }
  }, [loadData])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [liveEvents])

  const chartData = executions.slice().reverse().slice(-20).map(e => ({
    time: new Date(e.started_at).toLocaleTimeString(),
    tokens: e.total_tokens,
    cost: e.total_cost * 100,
  }))

  const levelColor: Record<string, string> = {
    info:    'text-blue-600',
    error:   'text-red-600',
    warning: 'text-yellow-600',
  }

  const eventColor: Record<string, string> = {
    log:                '',
    node_start:         'text-purple-600',
    node_complete:      'text-green-600',
    execution_complete: 'text-green-600',
    workflow_complete:  'text-green-600',
    execution_failed:   'text-red-600',
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monitoring</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time agent execution tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Circle size={8} className={connected ? 'text-green-500 fill-green-500 animate-pulse' : 'text-gray-400 fill-gray-400'} />
          <span className="text-xs text-gray-500">{connected ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Cpu}          label="Total Agents"  value={stats.total_agents}                       color="bg-brand-600"  />
          <StatCard icon={Zap}          label="Executions"    value={stats.total_executions}                   color="bg-purple-600" />
          <StatCard icon={MessageSquare} label="Messages"     value={stats.total_messages}                     color="bg-green-600"  />
          <StatCard icon={DollarSign}   label="Total Cost"    value={`$${stats.total_cost.toFixed(4)}`}        color="bg-orange-500" />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Live event stream */}
        <div className="card flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={15} className="text-brand-600" />
            <h2 className="font-semibold text-sm text-gray-800">Live Event Stream</h2>
            {connected && <span className="badge bg-green-100 text-green-700 ml-auto">Connected</span>}
          </div>
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-xs overflow-y-auto h-64 space-y-1">
            {liveEvents.length === 0 && (
              <p className="text-gray-400 text-center mt-4">Waiting for events...</p>
            )}
            {liveEvents.map((ev, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-400 flex-shrink-0">
                  {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : '--:--:--'}
                </span>
                <span className={`flex-shrink-0 w-20 ${eventColor[ev.type] || 'text-gray-500'}`}>
                  [{ev.type}]
                </span>
                <span className={ev.level ? levelColor[ev.level] || 'text-gray-700' : 'text-gray-700'}>
                  {ev.message || ev.output?.slice(0, 120) || ev.response?.slice(0, 120) || ev.error || JSON.stringify(ev).slice(0, 120)}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
          {liveEvents.length > 0 && (
            <button onClick={() => setLiveEvents([])} className="text-xs text-gray-400 hover:text-gray-600 mt-2 text-right">
              Clear
            </button>
          )}
        </div>

        {/* Token usage chart */}
        <div className="card">
          <h2 className="font-semibold text-sm text-gray-800 mb-4">Token Usage (last 20 executions)</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2048ff" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2048ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                  labelStyle={{ color: '#6b7280' }}
                />
                <Area type="monotone" dataKey="tokens" stroke="#2048ff" fill="url(#tokenGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              No execution data yet
            </div>
          )}
        </div>
      </div>

      {/* Execution log table */}
      <div className="card">
        <h2 className="font-semibold text-sm text-gray-800 mb-4">Recent Executions</h2>
        {executions.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No executions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs border-b border-gray-200">
                  <th className="pb-2 pr-4">ID</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Tokens</th>
                  <th className="pb-2 pr-4">Cost</th>
                  <th className="pb-2 pr-4">Started</th>
                  <th className="pb-2">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {executions.map(ex => {
                  const dur = ex.finished_at
                    ? `${((new Date(ex.finished_at).getTime() - new Date(ex.started_at).getTime()) / 1000).toFixed(1)}s`
                    : '…'
                  return (
                    <tr
                      key={ex.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedExec(selectedExec?.id === ex.id ? null : ex)}
                    >
                      <td className="py-2 pr-4 text-gray-400">#{ex.id}</td>
                      <td className="py-2 pr-4 text-gray-600">
                        {ex.workflow_id ? `workflow #${ex.workflow_id}` : `agent #${ex.agent_id}`}
                      </td>
                      <td className="py-2 pr-4"><span className={statusBadge(ex.status)}>{ex.status}</span></td>
                      <td className="py-2 pr-4 text-gray-700">{ex.total_tokens.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-gray-700">${ex.total_cost.toFixed(5)}</td>
                      <td className="py-2 pr-4 text-gray-400 text-xs">{new Date(ex.started_at).toLocaleTimeString()}</td>
                      <td className="py-2 text-gray-500">{dur}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {selectedExec && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">Execution #{selectedExec.id} logs:</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-xs max-h-48 overflow-y-auto space-y-1">
              {(selectedExec.logs || []).map((l, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-gray-400">{new Date(l.timestamp).toLocaleTimeString()}</span>
                  <span className={levelColor[l.level] || 'text-gray-700'}>[{l.level}]</span>
                  <span className="text-gray-700">{l.message}</span>
                </div>
              ))}
              {selectedExec.output_data?.response && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-green-700">Response: {String(selectedExec.output_data.response).slice(0, 500)}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
