'use client';

import { useEffect, useMemo, useState } from 'react';
import { getDlqItems, getExecutions } from '@/lib/api';
import type { DlqItem, RuntimeExecution } from '@/lib/types';

export interface NestedExecutionState {
  input: Record<string, unknown>;
  graph: {
    currentNode: string;
    checkpoints: Array<{ id: string; node: string; status: string; latencyMs: number }>;
    state: Record<string, unknown>;
  };
  tools: Array<{ name: string; status: string; calls: number; lastError?: string }>;
  security: {
    subject: string;
    scopes: string[];
    m2mClientId: string;
  };
}

export interface OperationalSnapshot {
  executions: RuntimeExecution[];
  dlqItems: DlqItem[];
  nestedState: NestedExecutionState;
  kafkaLag: Array<{ topic: string; consumer: string; lag: number }>;
  lastUpdated: string;
}

const fallbackState: NestedExecutionState = {
  input: { ticketId: 'TCK-10492', tenant: 'acme', priority: 'high' },
  graph: {
    currentNode: 'crm_lookup',
    checkpoints: [
      { id: 'cp-1', node: 'intake', status: 'COMPLETED', latencyMs: 41 },
      { id: 'cp-2', node: 'classify', status: 'COMPLETED', latencyMs: 318 },
      { id: 'cp-3', node: 'crm_lookup', status: 'RUNNING', latencyMs: 1204 },
    ],
    state: {
      classification: { intent: 'refund_request', confidence: 0.93 },
      customer: { tier: 'enterprise', region: 'NA', contracts: ['msa-2024', 'support-plus'] },
      compensations: { enabled: true, pending: [] },
    },
  },
  tools: [
    { name: 'CRM Lookup', status: 'RUNNING', calls: 2 },
    { name: 'Knowledge Search', status: 'COMPLETED', calls: 1 },
    { name: 'Ticket Update', status: 'PENDING', calls: 0 },
  ],
  security: {
    subject: 'agent-support-agent-v1',
    scopes: ['agent:execute', 'tool:invoke:crm', 'memory:read', 'workflow:transition'],
    m2mClientId: 'agent-support-agent-v1',
  },
};

export function useOperationalMonitor(refreshMs = 5000): OperationalSnapshot {
  const [executions, setExecutions] = useState<RuntimeExecution[]>([]);
  const [dlqItems, setDlqItems] = useState<DlqItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState(() => new Date().toISOString());

  useEffect(() => {
    let active = true;

    async function refresh() {
      const [nextExecutions, nextDlqItems] = await Promise.all([getExecutions(), getDlqItems()]);
      if (!active) {
        return;
      }
      setExecutions(nextExecutions);
      setDlqItems(nextDlqItems);
      setLastUpdated(new Date().toISOString());
    }

    refresh();
    const timer = window.setInterval(refresh, refreshMs);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refreshMs]);

  return useMemo(() => ({
    executions,
    dlqItems,
    nestedState: fallbackState,
    kafkaLag: [
      { topic: 'agent.export.requested', consumer: 'export-service', lag: 3 },
      { topic: 'agent.execution.telemetry', consumer: 'monitoring-service', lag: 18 },
      { topic: 'agent.export.dlq', consumer: 'dlq-replay-worker', lag: 0 },
    ],
    lastUpdated,
  }), [dlqItems, executions, lastUpdated]);
}
