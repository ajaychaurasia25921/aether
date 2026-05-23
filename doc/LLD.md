# Aegis Flow Low-Level Design

## 1. Initial Implementation Scope

The first implementation slice focuses on the Agent Registry Service.

It provides:

- Tenant creation
- Agent creation
- Agent lookup
- Agent version creation
- Export job creation
- Transactional outbox event creation for `agent.export.requested`
- Scheduled outbox publishing to Kafka

## 2. Agent Registry API

Base path:

```text
/api/v1
```

### Create Tenant

```http
POST /api/v1/tenants
Content-Type: application/json

{
  "slug": "acme",
  "name": "Acme Corp"
}
```

Response:

```json
{
  "id": "uuid",
  "slug": "acme",
  "name": "Acme Corp",
  "status": "ACTIVE"
}
```

### Create Agent

```http
POST /api/v1/agents
Content-Type: application/json

{
  "tenantId": "uuid",
  "slug": "support-agent",
  "name": "Support Agent",
  "description": "Handles support triage",
  "ownerUserId": "uuid"
}
```

### Create Agent Version

```http
POST /api/v1/agents/{agentId}/versions
Content-Type: application/json

{
  "version": "1.0.0",
  "runtimeType": "LANGGRAPH",
  "configHash": "sha256:example",
  "createdBy": "uuid"
}
```

### Request Export

```http
POST /api/v1/agents/{agentId}/versions/{agentVersionId}/export
Content-Type: application/json

{
  "targetFormat": "OCI_BUNDLE",
  "requestedBy": "uuid"
}
```

This creates:

- `export_jobs` row
- `outbox_events` row with topic `agent.export.requested`

Both writes occur in one database transaction.

## 3. Transaction Boundaries

### Export Request Transaction

```text
BEGIN
  validate agent version belongs to agent
  insert export_jobs
  insert outbox_events
COMMIT
```

If any insert fails, the entire transaction rolls back.

## 4. Outbox Event Contract

Topic:

```text
agent.export.requested
```

Payload:

```json
{
  "exportJobId": "uuid",
  "agentId": "uuid",
  "agentVersionId": "uuid",
  "tenantId": "uuid",
  "targetFormat": "OCI_BUNDLE",
  "requestedBy": "uuid"
}
```

Headers:

```json
{
  "messageId": "uuid",
  "sagaId": "uuid",
  "correlationId": "uuid",
  "schemaVersion": "1.0"
}
```

## 5. Package Structure

```text
com.aether.registry
  api
    AgentResource
    TenantResource
    RegistryExceptionMapper
    dto
  persistence
    RegistryRepository
  outbox
    OutboxPublisher
```

## 6. Gradle Commands

```bash
gradle :services:agent-registry-service:quarkusDev
gradle :services:agent-registry-service:quarkusBuild
gradle :services:agent-registry-service:test
```

## 7. Next Implementation Steps

- Add inbox consumer for export completion and failure
- Add Keycloak role and scope enforcement annotations
- Add integration tests with PostgreSQL test resource
- Add OpenAPI examples
