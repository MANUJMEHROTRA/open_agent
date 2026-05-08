import { useState, useEffect, useCallback } from 'react'
import { Plus, Bot, Trash2, Edit2, Play, ChevronDown, ChevronUp, MessageSquare, Brain } from 'lucide-react'
import { agentsApi } from '../api/client'
import type { Agent, AvailableTool, AvailableModel, Message } from '../types'

const DEFAULT_AGENT: Partial<Agent> = {
  name: '',
  role: '',
  system_prompt: '',
  model: 'claude-sonnet-4-6',
  tools: [],
  channels: [],
  memory_enabled: true,
  max_iterations: 10,
  temperature: 0.7,
  guardrails: {},
  skills: [],
  interaction_rules: {},
}

function AgentForm({
  initial,
  tools,
  models,
  onSave,
  onCancel,
}: {
  initial: Partial<Agent>
  tools: AvailableTool[]
  models: AvailableModel[]
  onSave: (data: Partial<Agent>) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState(initial)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const set = (k: keyof Agent, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const toggleTool = (id: string) =>
    set('tools', (form.tools || []).includes(id)
      ? (form.tools || []).filter(t => t !== id)
      : [...(form.tools || []), id])

  return (
    <div className="card space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Name *</label>
          <input className="input" value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="Research Agent" />
        </div>
        <div>
          <label className="label">Role *</label>
          <input className="input" value={form.role || ''} onChange={e => set('role', e.target.value)} placeholder="Researcher" />
        </div>
      </div>

      <div>
        <label className="label">System Prompt *</label>
        <textarea
          className="input min-h-[100px] resize-y"
          value={form.system_prompt || ''}
          onChange={e => set('system_prompt', e.target.value)}
          placeholder="You are a helpful AI agent that..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Model</label>
          <select className="input" value={form.model || 'claude-sonnet-4-6'} onChange={e => set('model', e.target.value)}>
            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Temperature ({form.temperature})</label>
          <input type="range" min="0" max="1" step="0.1" value={form.temperature || 0.7}
            onChange={e => set('temperature', parseFloat(e.target.value))}
            className="w-full accent-brand-600 mt-2" />
        </div>
      </div>

      <div>
        <label className="label">Tools</label>
        <div className="flex flex-wrap gap-2">
          {tools.map(t => (
            <button
              key={t.id}
              onClick={() => toggleTool(t.id)}
              title={t.description}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                (form.tools || []).includes(t.id)
                  ? 'bg-brand-50 border-brand-400 text-brand-700'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Channels</label>
        <div className="flex gap-2">
          {['telegram', 'slack', 'whatsapp'].map(ch => (
            <button
              key={ch}
              onClick={() => set('channels', (form.channels || []).includes(ch)
                ? (form.channels || []).filter(c => c !== ch)
                : [...(form.channels || []), ch])}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                (form.channels || []).includes(ch)
                  ? 'bg-green-50 border-green-500 text-green-700'
                  : 'bg-white border-gray-300 text-gray-500'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced */}
      <button
        onClick={() => setAdvancedOpen(o => !o)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
      >
        {advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Advanced settings
      </button>
      {advancedOpen && (
        <div className="space-y-4 border-t border-gray-200 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Max Iterations</label>
              <input type="number" className="input" min={1} max={50} value={form.max_iterations || 10}
                onChange={e => set('max_iterations', parseInt(e.target.value))} />
            </div>
            <div>
              <label className="label">Memory</label>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={form.memory_enabled ?? true}
                  onChange={e => set('memory_enabled', e.target.checked)}
                  className="accent-brand-600" />
                <span className="text-sm text-gray-700">Enable long-term memory</span>
              </label>
            </div>
          </div>
          <div>
            <label className="label">Schedule (cron)</label>
            <input className="input" value={form.schedule || ''} onChange={e => set('schedule', e.target.value)}
              placeholder="0 9 * * MON-FRI  (runs 9am weekdays)" />
          </div>
          <div>
            <label className="label">Max Tokens (guardrail)</label>
            <input type="number" className="input" min={256} max={16000}
              value={(form.guardrails as Record<string,number>)?.max_tokens || 4096}
              onChange={e => set('guardrails', { ...(form.guardrails || {}), max_tokens: parseInt(e.target.value) })} />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button
          className="btn-primary"
          disabled={!form.name || !form.role || !form.system_prompt}
          onClick={() => onSave(form)}
        >
          Save Agent
        </button>
      </div>
    </div>
  )
}

function ChatPanel({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    agentsApi.memories(agent.id).catch(() => [])
  }, [agent.id])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setLoading(true)
    setMessages(m => [...m, { id: Date.now(), agent_id: agent.id, workflow_id: null, execution_id: null, role: 'user', content: userMsg, channel: 'ui', tokens_used: 0, extra_data: {}, created_at: new Date().toISOString() }])
    try {
      const result = await agentsApi.execute(agent.id, userMsg)
      setMessages(m => [...m, { id: Date.now() + 1, agent_id: agent.id, workflow_id: null, execution_id: null, role: 'assistant', content: result.response || result.error || 'No response', channel: 'ui', tokens_used: result.tokens || 0, extra_data: {}, created_at: new Date().toISOString() }])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setMessages(m => [...m, { id: Date.now() + 1, agent_id: agent.id, workflow_id: null, execution_id: null, role: 'assistant', content: `Error: ${err?.response?.data?.detail || 'Unknown error'}`, channel: 'ui', tokens_used: 0, extra_data: {}, created_at: new Date().toISOString() }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card flex flex-col h-[460px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-brand-600" />
          <span className="font-medium text-sm text-gray-800">Chat with {agent.name}</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xs">Close</button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
        {messages.length === 0 && (
          <p className="text-gray-400 text-sm text-center mt-8">Send a message to start the conversation.</p>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
              m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-800'
            }`}>
              {m.content}
              {m.tokens_used > 0 && <p className="text-xs opacity-50 mt-1">{m.tokens_used} tokens</p>}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-xl px-4 py-2 text-sm text-gray-500 animate-pulse">Thinking...</div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Message the agent..."
          disabled={loading}
        />
        <button className="btn-primary px-4" onClick={send} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [tools, setTools] = useState<AvailableTool[]>([])
  const [models, setModels] = useState<AvailableModel[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [chatAgent, setChatAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [a, t, m] = await Promise.all([agentsApi.list(), agentsApi.tools(), agentsApi.models()])
    setAgents(a)
    setTools(t)
    setModels(m)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (data: Partial<Agent>) => {
    if (editingAgent) {
      await agentsApi.update(editingAgent.id, data)
    } else {
      await agentsApi.create(data)
    }
    setShowForm(false)
    setEditingAgent(null)
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this agent? This also removes its messages and memories.')) return
    await agentsApi.delete(id)
    load()
  }

  const statusColor: Record<string, string> = {
    true: 'bg-green-100 text-green-700',
    false: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage your AI agents</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setShowForm(true); setEditingAgent(null) }}>
          <Plus size={16} /> New Agent
        </button>
      </div>

      {(showForm || editingAgent) && (
        <AgentForm
          initial={editingAgent || DEFAULT_AGENT}
          tools={tools}
          models={models}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingAgent(null) }}
        />
      )}

      {chatAgent && <ChatPanel agent={chatAgent} onClose={() => setChatAgent(null)} />}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="card text-center py-12">
          <Bot size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No agents yet. Create your first agent to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {agents.map(agent => (
            <div key={agent.id} className="card hover:border-gray-300 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
                    <Bot size={18} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{agent.name}</p>
                    <p className="text-xs text-gray-500">{agent.role}</p>
                  </div>
                </div>
                <span className={`badge ${statusColor[String(agent.is_active)]}`}>
                  {agent.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <p className="text-xs text-gray-500 line-clamp-2 mb-3">{agent.system_prompt}</p>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="badge bg-gray-100 text-gray-600">{agent.model.split('-').slice(1,3).join('-')}</span>
                {agent.tools.map(t => <span key={t} className="badge bg-brand-50 text-brand-700">{t}</span>)}
                {agent.channels.map(c => <span key={c} className="badge bg-green-50 text-green-700">{c}</span>)}
                {agent.memory_enabled && <span className="badge bg-purple-50 text-purple-700"><Brain size={10} className="mr-1 inline" />memory</span>}
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button className="btn-primary flex-1 flex items-center justify-center gap-1.5 py-1.5"
                  onClick={() => setChatAgent(chatAgent?.id === agent.id ? null : agent)}>
                  <Play size={13} /> Chat
                </button>
                <button className="btn-secondary p-2" onClick={() => { setEditingAgent(agent); setShowForm(false) }}>
                  <Edit2 size={14} />
                </button>
                <button className="btn-danger p-2" onClick={() => handleDelete(agent.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
