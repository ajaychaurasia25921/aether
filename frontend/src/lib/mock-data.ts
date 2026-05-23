import type { AgentDetail, AgentSummary, DlqItem, ExportJob, RuntimeExecution } from './types';

export const agents: AgentSummary[] = [
  {
    id: '2b3f38cc-d74a-4ae8-9138-637efc224a02',
    tenantId: '7d1d62db-fb0d-4378-b6e1-bd9d2f67a010',
    slug: 'support-agent',
    name: 'Support Agent',
    description: 'Handles support triage and CRM lookup',
    status: 'ACTIVE',
    latestVersion: '1.0.0',
    runtimeType: 'LANGGRAPH',
    lastExportStatus: 'COMPLETED',
  },
  {
    id: 'b52ab390-98bd-457e-a4e3-b61f6e9f406d',
    tenantId: '7d1d62db-fb0d-4378-b6e1-bd9d2f67a010',
    slug: 'claims-agent',
    name: 'Claims Agent',
    description: 'Reviews claims packets and routes exceptions',
    status: 'DRAFT',
    latestVersion: '0.3.0',
    runtimeType: 'LANGGRAPH',
    lastExportStatus: 'NEVER',
  },
  {
    id: '9d32fa8d-cda9-462d-8a16-76262296053f',
    tenantId: '7d1d62db-fb0d-4378-b6e1-bd9d2f67a010',
    slug: 'billing-agent',
    name: 'Billing Agent',
    description: 'Coordinates invoice checks and customer notices',
    status: 'EXPORTED',
    latestVersion: '2.1.0',
    runtimeType: 'LANGGRAPH',
    lastExportStatus: 'COMPLETED',
  },
];

export const selectedAgent: AgentDetail = {
  ...agents[0],
  versions: [
    {
      id: '42b749ff-2c73-4bb5-87fa-d8c36a7bdf61',
      version: '1.0.0',
      status: 'EXPORTABLE',
      runtimeType: 'LANGGRAPH',
      configHash: 'sha256:7d8f',
    },
  ],
  scopes: ['agent:execute', 'tool:invoke:crm', 'memory:read', 'workflow:transition'],
  tools: [
    { name: 'CRM Lookup', actions: ['read_customer', 'read_ticket'], secretRef: 'vault://crm/support-agent' },
    { name: 'Knowledge Search', actions: ['semantic_search'] },
    { name: 'Ticket Update', actions: ['append_note', 'set_priority'], secretRef: 'vault://ticketing/support-agent' },
  ],
  workflow: [
    { id: 'intake', label: 'Intake', type: 'input' },
    { id: 'classify', label: 'Classify', type: 'llm' },
    { id: 'crm', label: 'Tool: CRM', type: 'tool' },
    { id: 'respond', label: 'Respond', type: 'output' },
  ],
};

export const exportJobs: ExportJob[] = [
  {
    id: 'c5a6f1ce-b7b1-4a91-b598-9a37c1ad6167',
    agentName: 'Support Agent',
    version: '1.0.0',
    status: 'COMPLETED',
    targetFormat: 'OCI_BUNDLE',
    artifactUri: 'ghcr.io/acme/support-agent:1.0.0',
  },
  {
    id: '7685ab4e-490a-4ef2-84c1-33f6572fcb3d',
    agentName: 'Claims Agent',
    version: '0.3.0',
    status: 'PACKAGING',
    targetFormat: 'KUBERNETES',
    currentStep: 'Generate Kubernetes manifests',
  },
  {
    id: '6bbd448d-0fd6-43e8-b64a-ee5554edb720',
    agentName: 'Billing Agent',
    version: '2.1.0',
    status: 'FAILED',
    targetFormat: 'HELM',
    currentStep: 'OCI registry timeout',
  },
];

export const executions: RuntimeExecution[] = [
  { executionId: 'exec-123', agentName: 'Support Agent', status: 'RUNNING', currentNode: 'Tool: CRM', duration: '00:01:21' },
  { executionId: 'exec-124', agentName: 'Billing Agent', status: 'COMPLETED', currentNode: 'Respond', duration: '00:00:42' },
];

export const dlqItems: DlqItem[] = [
  {
    topic: 'agent.export.requested.dlq',
    consumer: 'export-service',
    failureClass: 'KEYCLOAK_TIMEOUT',
    retryCount: 3,
    replayEligible: true,
    deadLetteredAt: '2026-05-24T00:00:00Z',
  },
  {
    topic: 'agent.execution.failed.dlq',
    consumer: 'monitoring-service',
    failureClass: 'INVALID_PAYLOAD',
    retryCount: 0,
    replayEligible: false,
    deadLetteredAt: '2026-05-24T00:04:12Z',
  },
];
