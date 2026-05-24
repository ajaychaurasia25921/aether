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
  inbox
    InboxService
  messaging
    EventEnvelope
    DlqRouter
    ExportSagaConsumer
  outbox
    OutboxPublisher
  langgraph
    LangGraphWorkflowPort
    LangGraphCompileRequest
    LangGraphCompiledArtifact
  security
    SecurityPolicies
```

## 6. Backend Directory Tree

The implementation is Gradle-based in this repository:

```text
services/agent-registry-service/
  build.gradle
  src/main/java/com/aether/registry/
    api/
      AgentResource.java
      TenantResource.java
      RegistryExceptionMapper.java
      dto/
    inbox/
      InboxService.java
    langgraph/
      LangGraphCompileRequest.java
      LangGraphCompiledArtifact.java
      LangGraphWorkflowPort.java
    messaging/
      DlqRouter.java
      EventEnvelope.java
      ExportSagaConsumer.java
    outbox/
      OutboxPublisher.java
    persistence/
      RegistryRepository.java
    security/
      SecurityPolicies.java
  src/main/resources/
    application.properties
    db/migration/V1__create_agent_registry.sql
```

## 7. Inbox, Outbox, DLQ Rules

- Producers write aggregate changes and outbox rows in one JDBC transaction.
- `OutboxPublisher` emits durable event envelopes containing `messageId`, `sagaId`, `correlationId`, `schemaVersion`, topic, and payload.
- Consumers insert an inbox row before applying domain updates. The unique `(message_id, consumer_name)` constraint makes replay idempotent.
- Consumer failures are routed to a topic-specific DLQ with original payload, failure class, failure message, retry count, consumer name, and replay eligibility.
- Replay workers may re-publish only events whose failure class is operational or transient. Schema validation failures remain non-replayable until corrected.

## 8. Keycloak Security Policies

- Dashboard users authenticate through `aether-dashboard` using Authorization Code + PKCE.
- Backend APIs accept bearer tokens from Keycloak realm `aether`.
- Write APIs require `agent-designer`, `tenant-admin`, or `platform-admin`.
- Export APIs require `agent-designer`, `operator`, or `platform-admin` and the `agent:export` client scope.
- Service consumers use confidential clients with service accounts and client credentials.
- Agent runtime clients are provisioned per agent version with least-privilege scopes and may be disabled as saga compensation.

## 9. Gradle Commands

```bash
gradle :services:agent-registry-service:quarkusDev
gradle :services:agent-registry-service:quarkusBuild
gradle :services:agent-registry-service:test
```

## 10. OpenAPI Specification

Static OpenAPI contracts are kept in:

```text
docs/openapi/agent-registry.openapi.yaml
```

At runtime, Quarkus also serves the generated OpenAPI document at:

```text
http://localhost:8081/q/openapi
```

The committed contract documents the current Agent Registry API surface:

- `POST /api/v1/tenants`
- `POST /api/v1/agents`
- `GET /api/v1/agents/{agentId}`
- `POST /api/v1/agents/{agentId}/versions`
- `POST /api/v1/agents/{agentId}/versions/{agentVersionId}/export`

The OpenAPI security scheme models Keycloak Authorization Code + PKCE for dashboard users and `client_credentials` for service and agent M2M sessions.

## 11. Next Implementation Steps

- Add integration tests with PostgreSQL test resource
- Add a dedicated export-service module when the compiler and OCI registry integrations move beyond the registry service boundary
