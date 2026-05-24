'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell, type NavItem } from '@/components/AppShell';
import { StatusBadge } from '@/components/StatusBadge';
import { agents as seedAgents, dlqItems as seedDlqItems, executions as seedExecutions, exportJobs as seedExportJobs, selectedAgent as seedSelectedAgent } from '@/lib/mock-data';
import type { AgentDetail, DlqItem, ExportJob, RuntimeExecution } from '@/lib/types';

type ModalMode = 'new-agent' | 'import-agent' | 'export-agent' | null;

const deploymentYaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: support-agent
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: runtime
          image: ghcr.io/acme/support-agent:1.0.0
          env:
            - name: AEGIS_OIDC_CLIENT_ID
              value: agent-support-agent-v1`;

export default function DashboardPage() {
  const [activeItem, setActiveItem] = useState<NavItem>('Agents');
  const [query, setQuery] = useState('');
  const [agents, setAgents] = useState<AgentDetail[]>([
    seedSelectedAgent,
    ...seedAgents.filter((agent) => agent.id !== seedSelectedAgent.id).map((agent) => ({
      ...agent,
      versions: [],
      scopes: ['agent:execute', 'agent:read'],
      tools: [],
      workflow: [
        { id: 'intake', label: 'Intake', type: 'input' as const },
        { id: 'decide', label: 'Decide', type: 'llm' as const },
        { id: 'done', label: 'Done', type: 'output' as const },
      ],
    })),
  ]);
  const [selectedAgentId, setSelectedAgentId] = useState(seedSelectedAgent.id);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>(seedExportJobs);
  const [executions, setExecutions] = useState<RuntimeExecution[]>(seedExecutions);
  const [dlqItems, setDlqItems] = useState<DlqItem[]>(seedDlqItems);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [toast, setToast] = useState('Ready');
  const [lastRefreshLabel, setLastRefreshLabel] = useState('not refreshed yet');
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentSlug, setNewAgentSlug] = useState('');
  const [importText, setImportText] = useState('');
  const [exportFormat, setExportFormat] = useState<ExportJob['targetFormat']>('OCI_BUNDLE');

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ?? agents[0];
  const filteredAgents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return agents;
    }
    return agents.filter((agent) => `${agent.name} ${agent.slug} ${agent.description}`.toLowerCase().includes(normalized));
  }, [agents, query]);

  useEffect(() => {
    setLastRefreshLabel(new Date().toLocaleTimeString());
  }, []);

  function refreshOperations() {
    const now = new Date();
    setLastRefreshLabel(now.toLocaleTimeString());
    setExecutions((items) => items.map((item) => item.status === 'RUNNING' ? { ...item, duration: bumpDuration(item.duration) } : item));
    setToast(`Refreshed at ${now.toLocaleTimeString()}`);
  }

  function openAgent(agentId: string) {
    setSelectedAgentId(agentId);
    setActiveItem('Builder');
    setToast('Agent opened in builder');
  }

  function createAgent() {
    const name = newAgentName.trim();
    const slug = (newAgentSlug.trim() || slugify(name));
    if (!name || !slug) {
      setToast('Agent name and slug are required');
      return;
    }
    const next: AgentDetail = {
      id: createId(),
      tenantId: seedSelectedAgent.tenantId,
      slug,
      name,
      description: 'New draft agent created from the dashboard',
      status: 'DRAFT',
      latestVersion: '0.1.0',
      runtimeType: 'LANGGRAPH',
      lastExportStatus: 'NEVER',
      versions: [],
      scopes: ['agent:execute', 'workflow:transition'],
      tools: [],
      workflow: [
        { id: 'intake', label: 'Intake', type: 'input' },
        { id: 'reason', label: 'Reason', type: 'llm' },
        { id: 'respond', label: 'Respond', type: 'output' },
      ],
    };
    setAgents((items) => [next, ...items]);
    setSelectedAgentId(next.id);
    setNewAgentName('');
    setNewAgentSlug('');
    setModalMode(null);
    setActiveItem('Builder');
    setToast(`Created ${next.name}`);
  }

  function importAgent() {
    const importedName = extractJsonName(importText) ?? 'Imported Agent';
    const importedSlug = slugify(importedName);
    setNewAgentName(importedName);
    setNewAgentSlug(importedSlug);
    setModalMode('new-agent');
    setToast('Import parsed. Review and create the agent.');
  }

  function requestExport() {
    const job: ExportJob = {
      id: createId(),
      agentName: selectedAgent.name,
      version: selectedAgent.latestVersion,
      status: 'PACKAGING',
      targetFormat: exportFormat,
      currentStep: 'Provisioning M2M identity',
    };
    setExportJobs((items) => [job, ...items]);
    setAgents((items) => items.map((agent) => agent.id === selectedAgent.id ? { ...agent, lastExportStatus: 'PACKAGING' } : agent));
    setModalMode(null);
    setActiveItem('Exports');
    setToast(`Export started for ${selectedAgent.name}`);
    window.setTimeout(() => {
      setExportJobs((items) => items.map((item) => item.id === job.id ? {
        ...item,
        status: 'COMPLETED',
        currentStep: undefined,
        artifactUri: `ghcr.io/acme/${selectedAgent.slug}:${selectedAgent.latestVersion}`,
      } : item));
      setAgents((items) => items.map((agent) => agent.id === selectedAgent.id ? { ...agent, status: 'EXPORTED', lastExportStatus: 'COMPLETED' } : agent));
      setToast(`Export completed for ${selectedAgent.name}`);
    }, 1600);
  }

  function replayDlq(item: DlqItem) {
    if (!item.replayEligible) {
      setToast(`${item.failureClass} is blocked until payload correction`);
      return;
    }
    setDlqItems((items) => items.filter((candidate) => candidate !== item));
    setToast(`Replayed ${item.topic}`);
  }

  function addTool() {
    setAgents((items) => items.map((agent) => agent.id === selectedAgent.id ? {
      ...agent,
      tools: [...agent.tools, { name: `Tool ${agent.tools.length + 1}`, actions: ['invoke'] }],
      scopes: Array.from(new Set([...agent.scopes, 'tool:invoke:custom'])),
    } : agent));
    setToast('Tool added to selected agent');
  }

  function addWorkflowNode() {
    setAgents((items) => items.map((agent) => agent.id === selectedAgent.id ? {
      ...agent,
      workflow: [...agent.workflow, { id: `node-${agent.workflow.length + 1}`, label: `Step ${agent.workflow.length + 1}`, type: 'tool' }],
    } : agent));
    setToast('Workflow node added');
  }

  return (
    <AppShell activeItem={activeItem} onSelectItem={setActiveItem}>
      <header className="topbar">
        <div>
          <h1>{activeItem}</h1>
          <p>{subtitleFor(activeItem)} Last update: {lastRefreshLabel}</p>
        </div>
        <div className="actions">
          <input className="search" onChange={(event) => setQuery(event.target.value)} placeholder="Search agents" value={query} aria-label="Search agents" />
          <button className="secondary-button" onClick={() => setModalMode('import-agent')} type="button">Import</button>
          <button className="primary-button" onClick={() => setModalMode('new-agent')} type="button">New Agent</button>
        </div>
      </header>

      <div className="toast" role="status">{toast}</div>

      {activeItem === 'Agents' && (
        <AgentsView agents={filteredAgents} onOpen={openAgent} onRefresh={refreshOperations} />
      )}
      {activeItem === 'Builder' && (
        <BuilderView agent={selectedAgent} onAddNode={addWorkflowNode} onAddTool={addTool} onExport={() => setModalMode('export-agent')} />
      )}
      {activeItem === 'Exports' && (
        <ExportsView exportJobs={exportJobs} onNewExport={() => setModalMode('export-agent')} />
      )}
      {activeItem === 'Deployments' && (
        <DeploymentsView selectedAgent={selectedAgent} />
      )}
      {activeItem === 'Runtime Monitor' && (
        <MonitorView executions={executions} onRefresh={refreshOperations} selectedAgent={selectedAgent} />
      )}
      {activeItem === 'DLQ' && (
        <DlqView dlqItems={dlqItems} onReplay={replayDlq} />
      )}
      {activeItem === 'Audit' && (
        <AuditView exportJobs={exportJobs} selectedAgent={selectedAgent} />
      )}
      {activeItem === 'Settings' && (
        <SettingsView />
      )}

      {modalMode === 'new-agent' && (
        <Modal title="New Agent" onClose={() => setModalMode(null)}>
          <label className="field">
            <span>Name</span>
            <input value={newAgentName} onChange={(event) => setNewAgentName(event.target.value)} placeholder="Compliance Agent" />
          </label>
          <label className="field">
            <span>Slug</span>
            <input value={newAgentSlug} onChange={(event) => setNewAgentSlug(event.target.value)} placeholder="compliance-agent" />
          </label>
          <button className="primary-button" onClick={createAgent} type="button">Create Agent</button>
        </Modal>
      )}

      {modalMode === 'import-agent' && (
        <Modal title="Import Agent JSON" onClose={() => setModalMode(null)}>
          <label className="field">
            <span>Definition</span>
            <textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder='{"name":"Risk Review Agent"}' rows={7} />
          </label>
          <button className="primary-button" onClick={importAgent} type="button">Parse Import</button>
        </Modal>
      )}

      {modalMode === 'export-agent' && (
        <Modal title={`Export ${selectedAgent.name}`} onClose={() => setModalMode(null)}>
          <label className="field">
            <span>Target format</span>
            <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportJob['targetFormat'])}>
              <option value="OCI_BUNDLE">OCI Bundle</option>
              <option value="DOCKER">Docker</option>
              <option value="KUBERNETES">Kubernetes</option>
              <option value="HELM">Helm</option>
            </select>
          </label>
          <button className="primary-button" onClick={requestExport} type="button">Start Export</button>
        </Modal>
      )}
    </AppShell>
  );
}

function AgentsView({ agents, onOpen, onRefresh }: Readonly<{ agents: AgentDetail[]; onOpen: (agentId: string) => void; onRefresh: () => void }>) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Agents</h2>
        <button className="secondary-button" onClick={onRefresh} type="button">Refresh</button>
      </div>
      <table className="table">
        <thead>
          <tr><th>Name</th><th>Status</th><th>Version</th><th>Runtime</th><th>Last Export</th><th>Action</th></tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr key={agent.id}>
              <td><strong>{agent.name}</strong><br /><span>{agent.description}</span></td>
              <td><StatusBadge status={agent.status} /></td>
              <td>{agent.latestVersion}</td>
              <td>{agent.runtimeType}</td>
              <td><StatusBadge status={agent.lastExportStatus} /></td>
              <td><button className="secondary-button" onClick={() => onOpen(agent.id)} type="button">Open</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {agents.length === 0 && <div className="empty-state">No agents match the current search.</div>}
    </section>
  );
}

function BuilderView({ agent, onAddNode, onAddTool, onExport }: Readonly<{ agent: AgentDetail; onAddNode: () => void; onAddTool: () => void; onExport: () => void }>) {
  return (
    <section className="grid dashboard-grid">
      <div className="grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Agent Builder Canvas</h2>
            <div className="actions">
              <button className="secondary-button" onClick={onAddNode} type="button">Add Node</button>
              <button className="primary-button" onClick={onExport} type="button">Export</button>
            </div>
          </div>
          <div className="panel-body workflow-canvas">
            {agent.workflow.map((node, index) => (
              <div className="node" key={node.id}>
                <strong>{index + 1}. {node.label}</strong>
                <span className="node-type">{node.type}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-header"><h2>Nested LangGraph State</h2></div>
          <div className="panel-body state-tree">
            <TreeView value={{ ticket: { priority: 'high', source: 'portal' }, currentNode: agent.workflow.at(-1)?.id, scopes: agent.scopes, checkpoint: { strategy: 'POSTGRES', retained: true } }} />
          </div>
        </section>
      </div>
      <aside className="grid">
        <section className="panel">
          <div className="panel-header"><h2>Selected Agent</h2></div>
          <div className="panel-body kv-list">
            <div className="kv"><span>Name</span><strong>{agent.name}</strong></div>
            <div className="kv"><span>Slug</span><strong>{agent.slug}</strong></div>
            <div className="kv"><span>Version</span><strong>{agent.latestVersion}</strong></div>
            <div className="kv"><span>Runtime</span><strong>{agent.runtimeType}</strong></div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-header"><h2>OIDC Scopes</h2></div>
          <div className="panel-body scope-list">{agent.scopes.map((scope) => <span key={scope}>{scope}</span>)}</div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <h2>Tools</h2>
            <button className="secondary-button" onClick={onAddTool} type="button">Add</button>
          </div>
          <div className="panel-body tool-list">
            {agent.tools.length === 0 ? <span className="muted">No tools configured.</span> : agent.tools.map((tool) => (
              <div className="tool" key={tool.name}><strong>{tool.name}</strong><br /><small>{tool.actions.join(', ')}</small></div>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}

function ExportsView({ exportJobs, onNewExport }: Readonly<{ exportJobs: ExportJob[]; onNewExport: () => void }>) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Export Center</h2>
        <button className="primary-button" onClick={onNewExport} type="button">New Export</button>
      </div>
      <table className="table">
        <thead><tr><th>Agent</th><th>Version</th><th>Format</th><th>Status</th><th>Artifact / Step</th></tr></thead>
        <tbody>{exportJobs.map((job) => (
          <tr key={job.id}><td>{job.agentName}</td><td>{job.version}</td><td>{job.targetFormat}</td><td><StatusBadge status={job.status} /></td><td>{job.artifactUri ?? job.currentStep}</td></tr>
        ))}</tbody>
      </table>
    </section>
  );
}

function DeploymentsView({ selectedAgent }: Readonly<{ selectedAgent: AgentDetail }>) {
  return (
    <section className="grid dashboard-grid">
      <section className="panel">
        <div className="panel-header"><h2>OCI Deployment Configuration</h2></div>
        <pre className="code-block">{deploymentYaml.replace('support-agent', selectedAgent.slug)}</pre>
      </section>
      <aside className="panel">
        <div className="panel-header"><h2>Portability</h2></div>
        <div className="panel-body checklist">
          {['Docker image', 'Kubernetes manifest', 'Helm values', 'SBOM', 'OIDC client scopes'].map((item) => <label key={item}><input type="checkbox" checked readOnly /> {item}</label>)}
        </div>
      </aside>
    </section>
  );
}

function MonitorView({ executions, onRefresh, selectedAgent }: Readonly<{ executions: RuntimeExecution[]; onRefresh: () => void; selectedAgent: AgentDetail }>) {
  return (
    <section className="grid dashboard-grid">
      <section className="panel">
        <div className="panel-header">
          <h2>Runtime Executions</h2>
          <button className="secondary-button" onClick={onRefresh} type="button">Refresh</button>
        </div>
        <table className="table">
          <thead><tr><th>Execution</th><th>Agent</th><th>Status</th><th>Node</th><th>Duration</th></tr></thead>
          <tbody>{executions.map((execution) => (
            <tr key={execution.executionId}><td>{execution.executionId}</td><td>{execution.agentName}</td><td><StatusBadge status={execution.status} /></td><td>{execution.currentNode}</td><td>{execution.duration}</td></tr>
          ))}</tbody>
        </table>
      </section>
      <aside className="panel">
        <div className="panel-header"><h2>Live State</h2></div>
        <div className="panel-body state-tree">
          <TreeView value={{ agent: selectedAgent.slug, kafkaLag: { requested: 2, completed: 0, failed: 0 }, state: { node: 'Tool: CRM', retryBudget: 3, saga: { step: 'PACKAGING', compensating: false } } }} />
        </div>
      </aside>
    </section>
  );
}

function DlqView({ dlqItems, onReplay }: Readonly<{ dlqItems: DlqItem[]; onReplay: (item: DlqItem) => void }>) {
  return (
    <section className="panel">
      <div className="panel-header"><h2>Dead Letter Queue</h2></div>
      <table className="table">
        <thead><tr><th>Topic</th><th>Consumer</th><th>Failure</th><th>Retries</th><th>Action</th></tr></thead>
        <tbody>{dlqItems.map((item) => (
          <tr key={`${item.topic}-${item.failureClass}`}><td>{item.topic}</td><td>{item.consumer}</td><td>{item.failureClass}</td><td>{item.retryCount}</td><td><button className="secondary-button" onClick={() => onReplay(item)} type="button">{item.replayEligible ? 'Replay' : 'Blocked'}</button></td></tr>
        ))}</tbody>
      </table>
      {dlqItems.length === 0 && <div className="empty-state">DLQ is clear.</div>}
    </section>
  );
}

function AuditView({ exportJobs, selectedAgent }: Readonly<{ exportJobs: ExportJob[]; selectedAgent: AgentDetail }>) {
  const rows = [
    `OIDC scopes reviewed for ${selectedAgent.name}`,
    ...exportJobs.slice(0, 3).map((job) => `${job.status} export for ${job.agentName}`),
    'Keycloak realm policy synchronized',
  ];
  return (
    <section className="panel">
      <div className="panel-header"><h2>Audit Trail</h2></div>
      <div className="panel-body audit-list">{rows.map((row, index) => <div key={row} className="audit-row"><strong>{index + 1}</strong><span>{row}</span><small>{new Date(Date.now() - index * 60000).toLocaleTimeString()}</small></div>)}</div>
    </section>
  );
}

function SettingsView() {
  return (
    <section className="grid settings-grid">
      <section className="panel">
        <div className="panel-header"><h2>Keycloak</h2></div>
        <div className="panel-body kv-list">
          <div className="kv"><span>Realm</span><strong>aether</strong></div>
          <div className="kv"><span>Dashboard Client</span><strong>aether-dashboard</strong></div>
          <div className="kv"><span>M2M Template</span><strong>aegis-agent-runtime-template</strong></div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-header"><h2>Kafka Topics</h2></div>
        <div className="panel-body scope-list">{['agent.export.requested', 'agent.export.completed', 'agent.export.failed', 'agent.export.dlq'].map((topic) => <span key={topic}>{topic}</span>)}</div>
      </section>
    </section>
  );
}

function Modal({ children, onClose, title }: Readonly<{ children: React.ReactNode; onClose: () => void; title: string }>) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="panel-header">
          <h2>{title}</h2>
          <button className="secondary-button" onClick={onClose} type="button">Close</button>
        </div>
        <div className="panel-body form-grid">{children}</div>
      </section>
    </div>
  );
}

function TreeView({ value }: Readonly<{ value: unknown }>) {
  if (Array.isArray(value)) {
    return <ul>{value.map((item, index) => <li key={index}><TreeView value={item} /></li>)}</ul>;
  }
  if (value && typeof value === 'object') {
    return (
      <ul>
        {Object.entries(value as Record<string, unknown>).map(([key, nested]) => (
          <li key={key}><strong>{key}</strong>: <TreeView value={nested} /></li>
        ))}
      </ul>
    );
  }
  return <span>{String(value)}</span>;
}

function subtitleFor(item: NavItem) {
  switch (item) {
    case 'Builder':
      return 'Build LangGraph state machines and attach governed tools.';
    case 'Exports':
      return 'Package agents as OCI-compliant deployment artifacts.';
    case 'Runtime Monitor':
      return 'Inspect executions, nested state, and Kafka health.';
    case 'DLQ':
      return 'Review and replay eligible failed events.';
    default:
      return 'Configure, export, deploy, and monitor autonomous agents.';
  }
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'agent';
}

function createId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function extractJsonName(value: string) {
  try {
    const parsed = JSON.parse(value) as { name?: unknown };
    return typeof parsed.name === 'string' ? parsed.name : null;
  } catch {
    return null;
  }
}

function bumpDuration(value: string) {
  const parts = value.split(':').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return value;
  }
  const total = parts[0] * 3600 + parts[1] * 60 + parts[2] + 5;
  const hours = Math.floor(total / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
  const seconds = (total % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}
