export interface Agent {
  id: number
  name: string
  role: string
  system_prompt: string
  model: string
  tools: string[]
  channels: string[]
  memory_enabled: boolean
  max_iterations: number
  temperature: number
  guardrails: Record<string, unknown>
  schedule: string | null
  skills: string[]
  interaction_rules: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WorkflowNode {
  id: string
  type: string
  agent_id?: number
  position: { x: number; y: number }
  data: Record<string, unknown>
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  condition?: string
  label?: string
}

export interface Workflow {
  id: number
  name: string
  description: string | null
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  status: string
  template_id: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: number
  agent_id: number
  workflow_id: number | null
  execution_id: number | null
  role: string
  content: string
  channel: string
  tokens_used: number
  extra_data: Record<string, unknown>
  created_at: string
}

export interface ExecutionLog {
  id: number
  agent_id: number | null
  workflow_id: number | null
  status: string
  input_data: Record<string, unknown>
  output_data: Record<string, unknown>
  logs: Array<{ timestamp: string; level: string; message: string }>
  total_tokens: number
  total_cost: number
  started_at: string
  finished_at: string | null
}

export interface Stats {
  total_agents: number
  active_agents: number
  total_workflows: number
  total_executions: number
  total_messages: number
  total_tokens: number
  total_cost: number
}

export interface AvailableTool {
  id: string
  name: string
  description: string
}

export interface AvailableModel {
  id: string
  name: string
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}
