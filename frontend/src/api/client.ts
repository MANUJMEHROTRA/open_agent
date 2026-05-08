import axios from 'axios'
import type { Agent, Workflow, Message, ExecutionLog, Stats, AvailableTool, AvailableModel, WorkflowTemplate } from '../types'

const http = axios.create({ baseURL: '/api' })

// ── Agents ──────────────────────────────────────────────────────────────────

export const agentsApi = {
  list: () => http.get<Agent[]>('/agents/').then(r => r.data),
  get: (id: number) => http.get<Agent>(`/agents/${id}`).then(r => r.data),
  create: (data: Partial<Agent>) => http.post<Agent>('/agents/', data).then(r => r.data),
  update: (id: number, data: Partial<Agent>) => http.put<Agent>(`/agents/${id}`, data).then(r => r.data),
  delete: (id: number) => http.delete(`/agents/${id}`),
  execute: (id: number, message: string, context = {}) =>
    http.post(`/agents/${id}/execute`, { message, context }).then(r => r.data),
  tools: () => http.get<AvailableTool[]>('/agents/tools').then(r => r.data),
  models: () => http.get<AvailableModel[]>('/agents/models').then(r => r.data),
  memories: (id: number) => http.get(`/agents/${id}/memories`).then(r => r.data),
  addMemory: (id: number, data: { key: string; value: string; memory_type?: string }) =>
    http.post(`/agents/${id}/memories`, data).then(r => r.data),
  deleteMemory: (agentId: number, memId: number) => http.delete(`/agents/${agentId}/memories/${memId}`),
}

// ── Workflows ────────────────────────────────────────────────────────────────

export const workflowsApi = {
  list: () => http.get<Workflow[]>('/workflows/').then(r => r.data),
  get: (id: number) => http.get<Workflow>(`/workflows/${id}`).then(r => r.data),
  create: (data: Partial<Workflow>) => http.post<Workflow>('/workflows/', data).then(r => r.data),
  update: (id: number, data: Partial<Workflow>) => http.put<Workflow>(`/workflows/${id}`, data).then(r => r.data),
  delete: (id: number) => http.delete(`/workflows/${id}`),
  execute: (id: number, input_message: string, context = {}) =>
    http.post(`/workflows/${id}/execute`, { input_message, context }).then(r => r.data),
  executions: (id: number) => http.get<ExecutionLog[]>(`/workflows/${id}/executions`).then(r => r.data),
  templates: () => http.get<WorkflowTemplate[]>('/workflows/templates').then(r => r.data),
}

// ── Messages ─────────────────────────────────────────────────────────────────

export const messagesApi = {
  list: (params?: { agent_id?: number; workflow_id?: number; channel?: string; limit?: number }) =>
    http.get<Message[]>('/messages/', { params }).then(r => r.data),
  byAgent: (agentId: number, limit = 50) =>
    http.get<Message[]>(`/messages/agent/${agentId}`, { params: { limit } }).then(r => r.data),
}

// ── Monitoring ────────────────────────────────────────────────────────────────

export const monitoringApi = {
  executions: (params?: { agent_id?: number; workflow_id?: number; status?: string; limit?: number }) =>
    http.get<ExecutionLog[]>('/monitoring/executions', { params }).then(r => r.data),
  execution: (id: number) => http.get<ExecutionLog>(`/monitoring/executions/${id}`).then(r => r.data),
  stats: () => http.get<Stats>('/monitoring/stats').then(r => r.data),
}

// ── WebSocket ─────────────────────────────────────────────────────────────────

export function createMonitoringSocket(onMessage: (data: unknown) => void): WebSocket {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const ws = new WebSocket(`${proto}://${window.location.host}/api/monitoring/ws`)
  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)) } catch { /* ignore */ }
  }
  ws.onerror = (e) => console.error('WS error', e)
  return ws
}
