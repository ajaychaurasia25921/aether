import { agents, dlqItems, executions, exportJobs, selectedAgent } from './mock-data';
import type { AgentDetail, AgentSummary, DlqItem, ExportJob, RuntimeExecution } from './types';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS !== 'false';

export async function getAgents(): Promise<AgentSummary[]> {
  if (useMocks || !apiBase) {
    return agents;
  }
  const response = await fetch(`${apiBase}/api/v1/agents`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to load agents');
  }
  const body = await response.json();
  return (body.items ?? body) as AgentSummary[];
}

export async function getSelectedAgent(): Promise<AgentDetail> {
  return selectedAgent;
}

export async function getExportJobs(): Promise<ExportJob[]> {
  return exportJobs;
}

export async function getExecutions(): Promise<RuntimeExecution[]> {
  return executions;
}

export async function getDlqItems(): Promise<DlqItem[]> {
  return dlqItems;
}
