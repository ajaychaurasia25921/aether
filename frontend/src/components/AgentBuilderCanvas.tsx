'use client';

import { ArrowDownTrayIcon, BeakerIcon, CubeIcon, KeyIcon, PlusIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import type { AgentDetail, WorkflowNode } from '@/lib/types';
import { setAegisState, useAegisStore } from '@/store/aegis-store';

interface AgentBuilderCanvasProps {
  agent: AgentDetail;
}

const statePreview = {
  ticket: { id: 'TCK-10492', source: 'portal', priority: 'high' },
  classification: { intent: 'refund_request', confidence: 0.93 },
  toolResults: {
    crm: { customerTier: 'enterprise', openCases: 2 },
    knowledge: { articles: ['refund-policy', 'sla-credit'] },
  },
  next: { node: 'respond', requiresApproval: false },
};

export function AgentBuilderCanvas({ agent }: AgentBuilderCanvasProps) {
  const exportFormat = useAegisStore((state) => state.exportFormat);

  return (
    <section className="min-h-screen bg-slate-50 text-slate-950">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">{agent.name}</h1>
          <p className="text-sm text-slate-600">LangGraph state machine builder</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            value={exportFormat}
            onChange={(event) => setAegisState({ exportFormat: event.target.value as typeof exportFormat })}
            aria-label="Export format"
          >
            <option value="OCI_BUNDLE">OCI Bundle</option>
            <option value="DOCKER">Docker</option>
            <option value="KUBERNETES">Kubernetes</option>
            <option value="HELM">Helm</option>
          </select>
          <button className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium" type="button">
            <BeakerIcon className="h-4 w-4" /> Validate
          </button>
          <button className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white" type="button">
            <ArrowDownTrayIcon className="h-4 w-4" /> Export
          </button>
        </div>
      </header>

      <div className="grid gap-4 p-5 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <aside className="space-y-4">
          <BuilderPanel title="Node Palette">
            {['Input', 'LLM Decision', 'Tool Call', 'Human Approval', 'Output'].map((nodeType) => (
              <button key={nodeType} className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm" type="button">
                {nodeType}
                <PlusIcon className="h-4 w-4 text-slate-500" />
              </button>
            ))}
          </BuilderPanel>
          <BuilderPanel title="OIDC Scopes">
            <div className="space-y-2">
              {agent.scopes.map((scope) => (
                <label key={scope} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300" />
                  {scope}
                </label>
              ))}
            </div>
          </BuilderPanel>
        </aside>

        <main className="min-h-[640px] overflow-auto rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid min-w-[720px] grid-cols-4 gap-5">
            {agent.workflow.map((node, index) => (
              <GraphNode key={node.id} node={node} index={index} />
            ))}
          </div>
          <div className="mt-8 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
            <h2 className="mb-3 text-sm font-semibold">Nested LangGraph State</h2>
            <JsonTree value={statePreview} />
          </div>
        </main>

        <aside className="space-y-4">
          <BuilderPanel title="Runtime Identity">
            <div className="space-y-3 text-sm">
              <InfoRow icon={<KeyIcon className="h-4 w-4" />} label="M2M Client" value={`agent-${agent.slug}-${agent.latestVersion}`} />
              <InfoRow icon={<ShieldCheckIcon className="h-4 w-4" />} label="Policy" value="Least privilege scopes" />
              <InfoRow icon={<CubeIcon className="h-4 w-4" />} label="Artifact" value={exportFormat} />
            </div>
          </BuilderPanel>
          <BuilderPanel title="Tools">
            {agent.tools.map((tool) => (
              <div key={tool.name} className="rounded-md border border-slate-200 bg-white p-3">
                <div className="font-medium">{tool.name}</div>
                <div className="mt-1 text-xs text-slate-600">{tool.actions.join(', ')}</div>
              </div>
            ))}
          </BuilderPanel>
        </aside>
      </div>
    </section>
  );
}

function BuilderPanel({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-100 p-3">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function GraphNode({ node, index }: Readonly<{ node: WorkflowNode; index: number }>) {
  return (
    <div className="relative rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
      <div className="mb-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-700 text-sm font-semibold text-white">{index + 1}</div>
      <h3 className="text-base font-semibold">{node.label}</h3>
      <p className="mt-1 text-xs uppercase text-slate-500">{node.type}</p>
      <div className="mt-4 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-teal-600" style={{ width: `${Math.min(100, 35 + index * 18)}%` }} />
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: Readonly<{ icon: React.ReactNode; label: string; value: string }>) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-white p-3">
      <span className="mt-0.5 text-teal-700">{icon}</span>
      <span>
        <span className="block text-xs text-slate-500">{label}</span>
        <strong className="font-medium">{value}</strong>
      </span>
    </div>
  );
}

function JsonTree({ value, depth = 0 }: Readonly<{ value: unknown; depth?: number }>) {
  if (value === null || typeof value !== 'object') {
    return <span className="font-mono text-xs text-slate-700">{String(value)}</span>;
  }
  return (
    <div className={depth === 0 ? 'space-y-2' : 'ml-4 space-y-1 border-l border-slate-200 pl-3'}>
      {Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => (
        <div key={key}>
          <span className="font-mono text-xs font-semibold text-slate-900">{key}</span>
          <div><JsonTree value={nestedValue} depth={depth + 1} /></div>
        </div>
      ))}
    </div>
  );
}
