'use client';

import { ArrowPathIcon, BoltIcon, ExclamationTriangleIcon, QueueListIcon } from '@heroicons/react/24/outline';
import { useOperationalMonitor } from '@/hooks/useOperationalMonitor';

export function OperationalMonitoringDashboard() {
  const snapshot = useOperationalMonitor();

  return (
    <section className="min-h-screen bg-zinc-50 p-5 text-zinc-950">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Real-Time Operational Monitoring</h1>
          <p className="text-sm text-zinc-600">Updated {new Date(snapshot.lastUpdated).toLocaleTimeString()}</p>
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium" type="button">
          <ArrowPathIcon className="h-4 w-4" /> Refresh
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard icon={<BoltIcon className="h-5 w-5" />} label="Running Executions" value={String(snapshot.executions.filter((item) => item.status === 'RUNNING').length)} />
        <MetricCard icon={<QueueListIcon className="h-5 w-5" />} label="Kafka Lag" value={String(snapshot.kafkaLag.reduce((sum, item) => sum + item.lag, 0))} />
        <MetricCard icon={<ExclamationTriangleIcon className="h-5 w-5" />} label="DLQ Items" value={String(snapshot.dlqItems.length)} />
        <MetricCard icon={<BoltIcon className="h-5 w-5" />} label="Current Node" value={snapshot.nestedState.graph.currentNode} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-lg border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="text-base font-semibold">Executions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Execution</th>
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Node</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.executions.map((execution) => (
                  <tr key={execution.executionId} className="border-t border-zinc-200">
                    <td className="px-4 py-3 font-mono text-xs">{execution.executionId}</td>
                    <td className="px-4 py-3">{execution.agentName}</td>
                    <td className="px-4 py-3"><StatusPill value={execution.status} /></td>
                    <td className="px-4 py-3">{execution.currentNode}</td>
                    <td className="px-4 py-3">{execution.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="text-base font-semibold">Nested Execution State</h2>
          </div>
          <div className="p-4">
            <StateTree value={snapshot.nestedState} />
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-base font-semibold">Kafka Consumers</h2>
          <div className="space-y-2">
            {snapshot.kafkaLag.map((item) => (
              <div key={`${item.topic}-${item.consumer}`} className="grid grid-cols-[minmax(0,1fr)_80px] items-center gap-3 rounded-md border border-zinc-200 p-3">
                <div>
                  <div className="font-medium">{item.topic}</div>
                  <div className="text-xs text-zinc-600">{item.consumer}</div>
                </div>
                <div className="text-right font-mono text-sm">{item.lag}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-base font-semibold">DLQ Triage</h2>
          <div className="space-y-2">
            {snapshot.dlqItems.map((item) => (
              <div key={`${item.topic}-${item.failureClass}`} className="rounded-md border border-zinc-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm">{item.failureClass}</strong>
                  <StatusPill value={item.replayEligible ? 'REPLAYABLE' : 'BLOCKED'} />
                </div>
                <div className="mt-1 text-xs text-zinc-600">{item.topic} · {item.consumer} · retries {item.retryCount}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function MetricCard({ icon, label, value }: Readonly<{ icon: React.ReactNode; label: string; value: string }>) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-3 text-teal-700">{icon}</div>
      <div className="text-xs text-zinc-600">{label}</div>
      <div className="mt-1 truncate text-2xl font-semibold">{value}</div>
    </div>
  );
}

function StatusPill({ value }: Readonly<{ value: string }>) {
  const tone = value === 'FAILED' || value === 'BLOCKED' ? 'bg-red-50 text-red-700' : value === 'RUNNING' || value === 'REPLAYABLE' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700';
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>{value}</span>;
}

function StateTree({ value, depth = 0 }: Readonly<{ value: unknown; depth?: number }>) {
  if (Array.isArray(value)) {
    return (
      <div className="space-y-1">
        {value.map((item, index) => (
          <div key={index} className="ml-3 border-l border-zinc-200 pl-3">
            <span className="font-mono text-xs text-zinc-500">[{index}]</span>
            <StateTree value={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }
  if (value === null || typeof value !== 'object') {
    return <span className="font-mono text-xs text-zinc-800">{String(value)}</span>;
  }
  return (
    <div className={depth === 0 ? 'space-y-2' : 'ml-3 space-y-1 border-l border-zinc-200 pl-3'}>
      {Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => (
        <div key={key}>
          <span className="font-mono text-xs font-semibold text-zinc-950">{key}</span>
          <div><StateTree value={nestedValue} depth={depth + 1} /></div>
        </div>
      ))}
    </div>
  );
}
