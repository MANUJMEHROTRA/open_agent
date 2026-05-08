import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import AgentsPage from './pages/AgentsPage'
import WorkflowsPage from './pages/WorkflowsPage'
import MonitoringPage from './pages/MonitoringPage'
import TemplatesPage from './pages/TemplatesPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/agents" replace />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="workflows" element={<WorkflowsPage />} />
          <Route path="monitoring" element={<MonitoringPage />} />
          <Route path="templates" element={<TemplatesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
