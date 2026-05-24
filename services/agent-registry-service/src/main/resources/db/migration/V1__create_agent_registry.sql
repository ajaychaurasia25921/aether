CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  status VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  owner_user_id UUID NOT NULL,
  status VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_agents_tenant_slug UNIQUE (tenant_id, slug),
  CONSTRAINT ck_agents_status CHECK (status IN ('DRAFT', 'ACTIVE', 'DISABLED', 'ARCHIVED'))
);

CREATE TABLE agent_versions (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents(id),
  version VARCHAR(40) NOT NULL,
  status VARCHAR(40) NOT NULL,
  runtime_type VARCHAR(40) NOT NULL,
  image_name VARCHAR(300),
  config_hash VARCHAR(128) NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_agent_versions_agent_version UNIQUE (agent_id, version),
  CONSTRAINT ck_agent_versions_status CHECK (status IN ('DRAFT', 'VALIDATED', 'EXPORTABLE', 'EXPORTED', 'DEPLOYED', 'DEPRECATED', 'FAILED')),
  CONSTRAINT ck_agent_versions_runtime_type CHECK (runtime_type IN ('LANGGRAPH'))
);

CREATE TABLE agent_oidc_clients (
  id UUID PRIMARY KEY,
  agent_version_id UUID NOT NULL REFERENCES agent_versions(id),
  keycloak_realm VARCHAR(120) NOT NULL,
  keycloak_client_id VARCHAR(255) NOT NULL,
  service_account_user_id VARCHAR(255),
  status VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_agent_oidc_clients_realm_client UNIQUE (keycloak_realm, keycloak_client_id),
  CONSTRAINT uq_agent_oidc_clients_version UNIQUE (agent_version_id),
  CONSTRAINT ck_agent_oidc_clients_status CHECK (status IN ('PENDING', 'ACTIVE', 'DISABLED', 'FAILED'))
);

CREATE TABLE agent_scopes (
  id UUID PRIMARY KEY,
  agent_version_id UUID NOT NULL REFERENCES agent_versions(id),
  scope VARCHAR(160) NOT NULL,
  granted_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_agent_scopes_version_scope UNIQUE (agent_version_id, scope)
);

CREATE TABLE agent_capabilities (
  id UUID PRIMARY KEY,
  agent_version_id UUID NOT NULL REFERENCES agent_versions(id),
  capability_type VARCHAR(80) NOT NULL,
  capability_name VARCHAR(160) NOT NULL,
  config_json JSONB NOT NULL,
  policy_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_agent_capabilities_type CHECK (capability_type IN ('MODEL', 'MEMORY', 'TOOL', 'CONNECTOR', 'POLICY', 'RUNTIME'))
);

CREATE TABLE agent_tools (
  id UUID PRIMARY KEY,
  agent_version_id UUID NOT NULL REFERENCES agent_versions(id),
  tool_id UUID NOT NULL,
  tool_name VARCHAR(160) NOT NULL,
  allowed_actions JSONB NOT NULL,
  secret_ref VARCHAR(300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_agent_tools_version_tool UNIQUE (agent_version_id, tool_id)
);

CREATE TABLE langgraph_workflows (
  id UUID PRIMARY KEY,
  agent_version_id UUID NOT NULL REFERENCES agent_versions(id),
  graph_name VARCHAR(160) NOT NULL,
  graph_definition_json JSONB NOT NULL,
  entry_node VARCHAR(160) NOT NULL,
  checkpoint_strategy VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_langgraph_workflows_version UNIQUE (agent_version_id),
  CONSTRAINT ck_langgraph_checkpoint_strategy CHECK (checkpoint_strategy IN ('NONE', 'POSTGRES', 'REDIS', 'EXTERNAL'))
);

CREATE TABLE export_jobs (
  id UUID PRIMARY KEY,
  agent_version_id UUID NOT NULL REFERENCES agent_versions(id),
  saga_id UUID NOT NULL UNIQUE,
  requested_by UUID NOT NULL,
  status VARCHAR(40) NOT NULL,
  target_format VARCHAR(40) NOT NULL,
  artifact_uri TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_export_jobs_status CHECK (status IN ('PENDING', 'VALIDATING', 'IDENTITY_READY', 'COMPILING_WORKFLOW', 'PACKAGING', 'PUBLISHING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  CONSTRAINT ck_export_jobs_target_format CHECK (target_format IN ('DOCKER', 'KUBERNETES', 'HELM', 'OCI_BUNDLE'))
);

CREATE TABLE saga_instances (
  id UUID PRIMARY KEY,
  saga_type VARCHAR(120) NOT NULL,
  aggregate_type VARCHAR(120) NOT NULL,
  aggregate_id UUID NOT NULL,
  current_step VARCHAR(120) NOT NULL,
  status VARCHAR(40) NOT NULL,
  state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT ck_saga_instances_status CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED', 'COMPENSATING', 'COMPENSATED', 'CANCELLED'))
);

CREATE TABLE outbox_events (
  id UUID PRIMARY KEY,
  aggregate_type VARCHAR(120) NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type VARCHAR(160) NOT NULL,
  topic VARCHAR(200) NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  CONSTRAINT ck_outbox_events_status CHECK (status IN ('PENDING', 'PUBLISHED', 'FAILED'))
);

CREATE TABLE inbox_events (
  id UUID PRIMARY KEY,
  message_id VARCHAR(255) NOT NULL,
  topic VARCHAR(200) NOT NULL,
  consumer_name VARCHAR(160) NOT NULL,
  payload_hash VARCHAR(128) NOT NULL,
  status VARCHAR(40) NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  CONSTRAINT uq_inbox_events_message_consumer UNIQUE (message_id, consumer_name),
  CONSTRAINT ck_inbox_events_status CHECK (status IN ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED'))
);

CREATE TABLE dlq_events (
  id UUID PRIMARY KEY,
  original_topic VARCHAR(200) NOT NULL,
  dlq_topic VARCHAR(200) NOT NULL,
  consumer_name VARCHAR(160) NOT NULL,
  message_id VARCHAR(255),
  saga_id UUID,
  correlation_id UUID,
  failure_class VARCHAR(180) NOT NULL,
  failure_message TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  replay_eligible BOOLEAN NOT NULL DEFAULT false,
  payload JSONB NOT NULL,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  dead_lettered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  replayed_at TIMESTAMPTZ
);

CREATE INDEX ix_agents_tenant_id ON agents(tenant_id);
CREATE INDEX ix_agent_versions_agent_id ON agent_versions(agent_id);
CREATE INDEX ix_agent_versions_status ON agent_versions(status);
CREATE INDEX ix_agent_oidc_clients_version_id ON agent_oidc_clients(agent_version_id);
CREATE INDEX ix_agent_scopes_version_id ON agent_scopes(agent_version_id);
CREATE INDEX ix_agent_capabilities_version_id ON agent_capabilities(agent_version_id);
CREATE INDEX ix_agent_tools_version_id ON agent_tools(agent_version_id);
CREATE INDEX ix_langgraph_workflows_version_id ON langgraph_workflows(agent_version_id);
CREATE INDEX ix_export_jobs_agent_version_id ON export_jobs(agent_version_id);
CREATE INDEX ix_export_jobs_status ON export_jobs(status);
CREATE INDEX ix_saga_instances_aggregate ON saga_instances(aggregate_type, aggregate_id);
CREATE INDEX ix_saga_instances_status ON saga_instances(status);
CREATE INDEX ix_outbox_events_status_created_at ON outbox_events(status, created_at);
CREATE INDEX ix_outbox_events_aggregate ON outbox_events(aggregate_type, aggregate_id);
CREATE INDEX ix_inbox_events_topic_consumer ON inbox_events(topic, consumer_name);
CREATE INDEX ix_dlq_events_original_topic ON dlq_events(original_topic);
CREATE INDEX ix_dlq_events_replay ON dlq_events(replay_eligible, dead_lettered_at);
