import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  type Connection, type Node, type Edge,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Plus, Play, Trash2, Save, GitBranch, X, Loader } from 'lucide-react'
import { workflowsApi, agentsApi } from '../api/client'
import type { Workflow, Agent, WorkflowTemplate } from '../types'

// ── Custom node ───────────────────────────────────────────────────────────────

function AgentNode({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="bg-white border-2 border-brand-500 rounded-xl px-4 py-3 min-w-[150px] shadow-md">
      <p className="text-xs text-brand-600 font-semibold uppercase tracking-wide">Agent</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{data.label as string || 'Unnamed'}</p>
      {data.role && <p className="text-xs text-gray-500 mt-0.5">{data.role as string}</p>}
    </div>
  )
}

const nodeTypes = { agent: AgentNode }

// ── Run panel ─────────────────────────────────────────────────────────────────

function RunPanel({
  workflow,
  onClose,
}: { workflow: Workflow; onClose: () => void }) {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    if (!input.trim() || loading) return
    setLoading(true)
    setResult(null)
    try {
      const r = await workflowsApi.execute(workflow.id, input)
      setResult(r.response || r.error || JSON.stringify(r))
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setResult(`Error: ${err?.response?.data?.detail || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play size={14} className="text-green-600" />
          <span className="text-sm font-semibold text-gray-800">Run: {workflow.name}</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>
      <textarea
        className="input min-h-[80px] resize-y"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Enter the input message for this workflow..."
      />
      <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={run} disabled={loading || !input.trim()}>
        {loading ? <><Loader size={14} className="animate-spin" /> Running...</> : <><Play size={14} /> Execute Workflow</>}
      </button>
      {result && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
          {result}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [selected, setSelected] = useState<Workflow | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [workflowName, setWorkflowName] = useState('')
  const [workflowDesc, setWorkflowDesc] = useState('')
  const [showRun, setShowRun] = useState(false)
  const [saving, setSaving] = useState(false)
  const nodeIdCounter = useRef(1)

  const load = useCallback(async () => {
    const [w, a] = await Promise.all([workflowsApi.list(), agentsApi.list()])
    setWorkflows(w)
    setAgents(a)
  }, [])

  useEffect(() => { load() }, [load])

  const openWorkflow = (wf: Workflow) => {
    setSelected(wf)
    setWorkflowName(wf.name)
    setWorkflowDesc(wf.description || '')
    const flowNodes: Node[] = (wf.nodes || []).map(n => ({
      id: n.id,
      type: 'agent',
      position: n.position,
      data: { label: (n.data as Record<string,unknown>)?.label || 'Agent', role: (n.data as Record<string,unknown>)?.role || '', agent_id: n.agent_id },
    }))
    const flowEdges: Edge[] = (wf.edges || []).map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#2048ff' },
    }))
    setNodes(flowNodes)
    setEdges(flowEdges)
  }

  const newWorkflow = () => {
    setSelected(null)
    setWorkflowName('New Workflow')
    setWorkflowDesc('')
    setNodes([])
    setEdges([])
    setSelected({ id: 0, name: 'New Workflow', description: '', nodes: [], edges: [], status: 'draft', template_id: null, created_at: '', updated_at: '' })
  }

  const addAgentNode = (agent: Agent) => {
    const id = `node_${nodeIdCounter.current++}`
    const newNode: Node = {
      id,
      type: 'agent',
      position: { x: 150 + nodes.length * 220, y: 200 },
      data: { label: agent.name, role: agent.role, agent_id: agent.id },
    }
    setNodes(ns => [...ns, newNode])
  }

  const onConnect = useCallback((params: Connection) => {
    setEdges(es => addEdge({
      ...params,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#2048ff' },
    }, es))
  }, [setEdges])

  const saveWorkflow = async () => {
    if (!workflowName.trim()) return
    setSaving(true)
    const wfNodes = nodes.map(n => ({
      id: n.id,
      type: 'agent',
      agent_id: (n.data as Record<string,unknown>).agent_id as number,
      position: n.position,
      data: n.data as Record<string,unknown>,
    }))
    const wfEdges = edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: typeof e.label === 'string' ? e.label : undefined,
    }))
    try {
      if (selected && selected.id !== 0) {
        const updated = await workflowsApi.update(selected.id, {
          name: workflowName,
          description: workflowDesc,
          nodes: wfNodes,
          edges: wfEdges,
        })
        setSelected(updated)
      } else {
        const created = await workflowsApi.create({
          name: workflowName,
          description: workflowDesc,
          nodes: wfNodes,
          edges: wfEdges,
        })
        setSelected(created)
      }
      load()
    } finally {
      setSaving(false)
    }
  }

  const deleteWorkflow = async (id: number) => {
    if (!confirm('Delete this workflow?')) return
    await workflowsApi.delete(id)
    if (selected?.id === id) setSelected(null)
    load()
  }

  return (
    <div className="flex h-full">
      {/* Left panel - workflow list */}
      <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-sm text-gray-800">Workflows</h2>
            <button onClick={newWorkflow} className="btn-primary py-1 px-2 text-xs flex items-center gap-1">
              <Plus size={12} /> New
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {workflows.length === 0 && (
            <p className="text-xs text-gray-400 text-center mt-4">No workflows yet</p>
          )}
          {workflows.map(wf => (
            <div
              key={wf.id}
              onClick={() => openWorkflow(wf)}
              className={`p-3 rounded-lg cursor-pointer group transition-colors ${
                selected?.id === wf.id
                  ? 'bg-brand-50 border border-brand-200'
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <GitBranch size={13} className="text-brand-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-gray-800 truncate">{wf.name}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteWorkflow(wf.id) }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">{wf.nodes?.length || 0} nodes</p>
            </div>
          ))}
        </div>

        {/* Agent palette */}
        {selected && (
          <div className="border-t border-gray-200 p-3">
            <p className="text-xs text-gray-500 mb-2 font-medium">Add agent to canvas:</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {agents.map(a => (
                <button
                  key={a.id}
                  onClick={() => addAgentNode(a)}
                  className="w-full text-left text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 transition-colors"
                >
                  <p className="font-medium text-gray-800">{a.name}</p>
                  <p className="text-gray-400">{a.role}</p>
                </button>
              ))}
              {agents.length === 0 && <p className="text-xs text-gray-400">Create agents first</p>}
            </div>
          </div>
        )}
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selected ? (
          <>
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
              <div className="flex-1 flex items-center gap-3">
                <input
                  className="input max-w-[240px]"
                  value={workflowName}
                  onChange={e => setWorkflowName(e.target.value)}
                  placeholder="Workflow name"
                />
                <input
                  className="input flex-1"
                  value={workflowDesc}
                  onChange={e => setWorkflowDesc(e.target.value)}
                  placeholder="Description"
                />
              </div>
              <div className="flex gap-2">
                <button className="btn-primary flex items-center gap-1.5 py-1.5 px-3" onClick={saveWorkflow} disabled={saving}>
                  <Save size={13} /> {saving ? 'Saving…' : 'Save'}
                </button>
                {selected.id !== 0 && (
                  <button
                    className="flex items-center gap-1.5 py-1.5 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    onClick={() => setShowRun(r => !r)}
                  >
                    <Play size={13} /> Run
                  </button>
                )}
              </div>
            </div>

            {showRun && selected.id !== 0 && (
              <div className="p-4 border-b border-gray-200 bg-white">
                <RunPanel workflow={selected} onClose={() => setShowRun(false)} />
              </div>
            )}

            <div className="flex-1">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                className="bg-gray-50"
              >
                <Background color="#e5e7eb" gap={20} />
                <Controls className="!bg-white !border-gray-200 !rounded-lg !shadow-sm" />
                <MiniMap className="!bg-white !border-gray-200 !rounded-lg !shadow-sm" nodeColor="#2048ff" maskColor="rgba(0,0,0,0.03)" />
              </ReactFlow>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <GitBranch size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Select a workflow or create a new one</p>
              <button className="btn-primary mt-4 flex items-center gap-2 mx-auto" onClick={newWorkflow}>
                <Plus size={16} /> Create Workflow
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
