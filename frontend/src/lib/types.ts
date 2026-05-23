export type AgentStatus = 'ACTIVE' | 'DRAFT' | 'EXPORTED' | 'DEPLOYED' | 'FAILED';
export type ExportStatus = 'PENDING' | 'PACKAGING' | 'COMPLETED' | 'FAILED';

export interface AgentSummary {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  description: string;
  status: AgentStatus;
  latestVersion: string;
  runtimeType: 'LANGGRAPH';
  lastExportStatus: ExportStatus | 'NEVER';
}

export interface AgentDetail extends AgentSummary {
  versions: AgentVersion[];
  scopes: string[];
  tools: AgentTool[];
  workflow: WorkflowNode[];
}

export interface AgentVersion {
  id: string;
  version: string;
  status: string;
  runtimeType: 'LANGGRAPH';
  configHash: string;
}

export interface AgentTool {
  name: string;
  actions: string[];
  secretRef?: string;
}

export interface WorkflowNode {
  id: string;
  label: string;
  type: 'input' | 'llm' | 'tool' | 'output';
}

export interface ExportJob {
  id: string;
  agentName: string;
  version: string;
  status: ExportStatus;
  targetFormat: 'OCI_BUNDLE' | 'KUBERNETES' | 'HELM' | 'DOCKER';
  artifactUri?: string;
  currentStep?: string;
}

export interface RuntimeExecution {
  executionId: string;
  agentName: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  currentNode: string;
  duration: string;
}

export interface DlqItem {
  topic: string;
  consumer: string;
  failureClass: string;
  retryCount: number;
  replayEligible: boolean;
  deadLetteredAt: string;
}
