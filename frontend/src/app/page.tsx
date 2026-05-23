import { AppShell } from '@/components/AppShell';
import { StatusBadge } from '@/components/StatusBadge';
import { getAgents, getDlqItems, getExecutions, getExportJobs, getSelectedAgent } from '@/lib/api';

export default async function DashboardPage() {
  const [agents, selectedAgent, exportJobs, executions, dlqItems] = await Promise.all([
    getAgents(),
    getSelectedAgent(),
    getExportJobs(),
    getExecutions(),
    getDlqItems(),
  ]);

  return (
    <AppShell>
      <header className="topbar">
        <div>
          <h1>Agent Operations</h1>
          <p>Configure, export, deploy, and monitor autonomous agents.</p>
        </div>
        <div className="actions">
          <input className="search" placeholder="Search agents" aria-label="Search agents" />
          <button className="secondary-button" type="button">Import</button>
          <button className="primary-button" type="button">New Agent</button>
        </div>
      </header>

      <section className="grid dashboard-grid">
        <div className="grid">
          <section className="panel">
            <div className="panel-header">
              <h2>Agents</h2>
              <button className="secondary-button" type="button">Refresh</button>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Version</th>
                  <th>Runtime</th>
                  <th>Last Export</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id}>
                    <td>
                      <strong>{agent.name}</strong>
                      <br />
                      <span>{agent.description}</span>
                    </td>
                    <td><StatusBadge status={agent.status} /></td>
                    <td>{agent.latestVersion}</td>
                    <td>{agent.runtimeType}</td>
                    <td><StatusBadge status={agent.lastExportStatus} /></td>
                    <td><button className="secondary-button" type="button">Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>LangGraph Workflow</h2>
              <button className="primary-button" type="button">Export</button>
            </div>
            <div className="panel-body workflow">
              {selectedAgent.workflow.map((node) => (
                <div className="node" key={node.id}>
                  <strong>{node.label}</strong>
                  <span className="node-type">{node.type}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Export Center</h2>
              <button className="secondary-button" type="button">New Export</button>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Version</th>
                  <th>Format</th>
                  <th>Status</th>
                  <th>Artifact / Step</th>
                </tr>
              </thead>
              <tbody>
                {exportJobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.agentName}</td>
                    <td>{job.version}</td>
                    <td>{job.targetFormat}</td>
                    <td><StatusBadge status={job.status} /></td>
                    <td>{job.artifactUri ?? job.currentStep}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <aside className="grid">
          <section className="panel">
            <div className="panel-header"><h2>Selected Agent</h2></div>
            <div className="panel-body kv-list">
              <div className="kv"><span>Name</span><strong>{selectedAgent.name}</strong></div>
              <div className="kv"><span>Slug</span><strong>{selectedAgent.slug}</strong></div>
              <div className="kv"><span>Version</span><strong>{selectedAgent.latestVersion}</strong></div>
              <div className="kv"><span>Runtime</span><strong>{selectedAgent.runtimeType}</strong></div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header"><h2>OIDC Scopes</h2></div>
            <div className="panel-body scope-list">
              {selectedAgent.scopes.map((scope) => <span key={scope}>{scope}</span>)}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header"><h2>Tools</h2></div>
            <div className="panel-body tool-list">
              {selectedAgent.tools.map((tool) => (
                <div className="tool" key={tool.name}>
                  <strong>{tool.name}</strong>
                  <br />
                  <small>{tool.actions.join(', ')}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header"><h2>Runtime Monitor</h2></div>
            <table className="table">
              <thead>
                <tr>
                  <th>Execution</th>
                  <th>Status</th>
                  <th>Node</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((execution) => (
                  <tr key={execution.executionId}>
                    <td>{execution.executionId}</td>
                    <td><StatusBadge status={execution.status} /></td>
                    <td>{execution.currentNode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="panel">
            <div className="panel-header"><h2>Dead Letter Queue</h2></div>
            <table className="table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Failure</th>
                  <th>Replay</th>
                </tr>
              </thead>
              <tbody>
                {dlqItems.map((item) => (
                  <tr key={`${item.topic}-${item.failureClass}`}>
                    <td>{item.topic}</td>
                    <td>{item.failureClass}</td>
                    <td><StatusBadge status={item.replayEligible ? 'YES' : 'NO'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </aside>
      </section>
    </AppShell>
  );
}
