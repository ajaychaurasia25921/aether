import { agents, dlqItems, executions, exportJobs, selectedAgent } from './mock-data';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS !== 'false';

export async function getAgents() {
  if (useMocks || !apiBase) {
    return agents;
  }
  const response = await fetch(`${apiBase}/api/v1/agents`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to load agents');
  }
  const body = await response.json();
  return body.items ?? body;
}

export async function getSelectedAgent() {
  return selectedAgent;
}

export async function getExportJobs() {
  return exportJobs;
}

export async function getExecutions() {
  return executions;
}

export async function getDlqItems() {
  return dlqItems;
}
