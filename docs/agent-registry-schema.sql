-- Agent Registry schema reference.
-- Runtime migrations live under:
-- services/agent-registry-service/src/main/resources/db/migration/

-- Current implementation migration:
-- V1__create_agent_registry.sql

-- Key tables:
-- tenants
-- agents
-- agent_versions
-- agent_oidc_clients
-- agent_scopes
-- agent_capabilities
-- agent_tools
-- langgraph_workflows
-- export_jobs
-- saga_instances
-- outbox_events
-- inbox_events

-- See the Flyway migration for executable DDL:
-- ../services/agent-registry-service/src/main/resources/db/migration/V1__create_agent_registry.sql
