import { useState, useEffect } from 'react'
import { LayoutTemplate, Plus, ArrowRight, Loader } from 'lucide-react'
import { workflowsApi, agentsApi } from '../api/client'
import type { WorkflowTemplate, Agent } from '../types'
import { useNavigate } from 'react-router-dom'

const TEMPLATE_ICONS: Record<string, string> = {
  research_summarize: '🔬',
  customer_support:   '🎧',
}

function TemplateCard({
  template,
  agents,
  onUse,
}: {
  template: WorkflowTemplate
  agents: Agent[]
  onUse: (template: WorkflowTemplate, agentMap: Record<string, number>) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [agentMap, setAgentMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)

  const nodeIds = template.nodes.map(n => n.id)
  const canCreate = nodeIds.every(id => agentMap[id] !== undefined)

  const handleUse = async () => {
    setLoading(true)
    try { await onUse(template, agentMap) }
    finally { setLoading(false) }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
          {TEMPLATE_ICONS[template.id] || '🤖'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{template.name}</h3>
          <p className="text-sm text-gray-500 mt-1">{template.description}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            <span>{template.nodes.length} agents</span>
            <span>·</span>
            <span>{template.edges.length} connections</span>
          </div>
        </div>
      </div>

      {/* Flow preview */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-2 flex-wrap">
        {template.nodes.map((node, i) => (
          <div key={node.id} className="flex items-center gap-2">
            <div className="bg-white border border-brand-200 rounded-lg px-3 py-1.5 shadow-sm">
              <p className="text-xs text-brand-700 font-medium">{(node.data as Record<string,unknown>).label as string || node.id}</p>
              <p className="text-xs text-gray-400">{(node.data as Record<string,unknown>).role as string}</p>
            </div>
            {i < template.nodes.length - 1 && <ArrowRight size={14} className="text-gray-400" />}
          </div>
        ))}
      </div>

      <button
        onClick={() => setExpanded(e => !e)}
        className="text-xs text-brand-600 hover:text-brand-800 font-medium"
      >
        {expanded ? 'Hide agent assignment' : 'Use this template →'}
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-gray-200 pt-3">
          <p className="text-xs text-gray-500">Assign your agents to each template role:</p>
          {template.nodes.map(node => (
            <div key={node.id}>
              <label className="label">{(node.data as Record<string,unknown>).label as string} ({(node.data as Record<string,unknown>).role as string})</label>
              <select
                className="input"
                value={agentMap[node.id] || ''}
                onChange={e => setAgentMap(m => ({ ...m, [node.id]: parseInt(e.target.value) }))}
              >
                <option value="">Select an agent...</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name} — {a.role}</option>
                ))}
              </select>
            </div>
          ))}
          {agents.length === 0 && (
            <p className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
              You need to create agents first before using a template.
            </p>
          )}
          <button
            className="btn-primary w-full flex items-center justify-center gap-2"
            onClick={handleUse}
            disabled={!canCreate || loading}
          >
            {loading
              ? <><Loader size={14} className="animate-spin" /> Creating...</>
              : <><Plus size={14} /> Create Workflow from Template</>}
          </button>
        </div>
      )}
    </div>
  )
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([workflowsApi.templates(), agentsApi.list()]).then(([t, a]) => {
      setTemplates(t)
      setAgents(a)
      setLoading(false)
    })
  }, [])

  const handleUseTemplate = async (
    template: WorkflowTemplate,
    agentMap: Record<string, number>
  ) => {
    const nodes = template.nodes.map(n => ({
      ...n,
      agent_id: agentMap[n.id],
      data: { ...n.data as Record<string,unknown>, agent_id: agentMap[n.id] },
    }))
    await workflowsApi.create({
      name: template.name,
      description: template.description,
      nodes,
      edges: template.edges,
      template_id: template.id,
    })
    setSuccess(`Workflow "${template.name}" created!`)
    setTimeout(() => {
      setSuccess('')
      navigate('/workflows')
    }, 1500)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
        <p className="text-gray-500 text-sm mt-1">Pre-built multi-agent workflow templates to get started quickly</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm font-medium">
          {success} Redirecting to workflows...
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading templates...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {templates.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              agents={agents}
              onUse={handleUseTemplate}
            />
          ))}
        </div>
      )}

      <div className="card border-dashed border-gray-300 bg-transparent text-center py-8 shadow-none">
        <LayoutTemplate size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm font-medium">Custom Templates</p>
        <p className="text-gray-400 text-xs mt-1">
          Add new templates in <code className="bg-gray-100 text-gray-600 px-1 rounded">backend/api/workflows.py</code> →{' '}
          <code className="bg-gray-100 text-gray-600 px-1 rounded">WORKFLOW_TEMPLATES</code>
        </p>
      </div>
    </div>
  )
}
