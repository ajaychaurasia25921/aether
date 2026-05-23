# Kafka Topic Contract

Kafka is the event backbone for Aegis Flow. Topics are organized around domain events, saga commands, runtime telemetry, retries, and dead-letter handling.

## Event Envelope

All Kafka messages should use a consistent envelope.

```json
{
  "messageId": "uuid",
  "messageType": "agent.export.requested",
  "schemaVersion": "1.0",
  "tenantId": "uuid",
  "aggregateType": "agent_version",
  "aggregateId": "uuid",
  "sagaId": "uuid",
  "correlationId": "uuid",
  "causationId": "uuid",
  "producer": "agent-registry-service",
  "occurredAt": "2026-05-24T00:00:00Z",
  "payload": {}
}
```

## Core Topics

| Topic | Producer | Consumers | Purpose |
| --- | --- | --- | --- |
| `agent.config.validated` | Agent Builder Service | Registry, Audit, Monitoring | Agent config passed validation |
| `agent.identity.provisioned` | Identity Broker Service | Registry, Export, Audit | M2M client and scopes are ready |
| `agent.workflow.compiled` | Workflow Orchestrator Service | Export, Monitoring, Audit | LangGraph workflow compiled |
| `agent.export.requested` | Agent Registry Service | Export Service, Audit | Export saga requested |
| `agent.export.validated` | Export Service | Monitoring, Audit | Export input validated |
| `agent.export.identity-ready` | Export Service | Monitoring, Audit | Agent identity verified for export |
| `agent.export.workflow-compiled` | Export Service | Monitoring, Audit | Workflow package attached to export |
| `agent.export.packaged` | Export Service | Monitoring, Audit | Docker/K8s/Helm bundle generated |
| `agent.export.published` | Export Service | Registry, Monitoring, Audit | OCI bundle pushed to registry or artifact store |
| `agent.export.completed` | Export Service | Registry, Notification, Audit | Export saga completed |
| `agent.export.failed` | Export Service | Registry, Notification, Audit | Export saga failed |
| `agent.deployment.requested` | Deployment Service | Runtime Dispatcher, Audit | Deployment requested |
| `agent.deployment.completed` | Deployment Service | Monitoring, Audit | Deployment completed |
| `agent.execution.started` | Runtime Dispatcher | Monitoring, Audit | Runtime execution started |
| `agent.execution.transitioned` | LangGraph Runtime | Monitoring, Audit | LangGraph node transition occurred |
| `agent.execution.completed` | LangGraph Runtime | Monitoring, Audit | Agent execution completed |
| `agent.execution.failed` | LangGraph Runtime | Monitoring, Audit | Agent execution failed |

## Retry Topics

Every critical command/event topic must have retry topics:

```text
<topic>.retry.1m
<topic>.retry.5m
<topic>.retry.30m
```

Retry rules:

- Retry only transient failures.
- Preserve `messageId`, `sagaId`, `correlationId`, and idempotency key.
- Add retry metadata in headers.
- Do not retry authorization failures, validation failures, or malformed messages.

## DLQ Topics

Every critical topic must have a DLQ:

```text
<topic>.dlq
```

DLQ payloads must include:

```json
{
  "originalTopic": "agent.export.requested",
  "originalPartition": 0,
  "originalOffset": 100,
  "messageId": "uuid",
  "sagaId": "uuid",
  "tenantId": "uuid",
  "consumer": "export-service",
  "failureClass": "DependencyTimeout",
  "failureMessage": "Keycloak request timed out",
  "stackTraceHash": "sha256",
  "retryCount": 3,
  "replayEligible": true,
  "deadLetteredAt": "2026-05-24T00:00:00Z"
}
```

## DLQ Governance

- DLQ replay requires operator authorization.
- Replay actions must be audited.
- Replayed events must retain original message metadata and add replay metadata.
- Poison messages must be quarantined after repeated replay failure.
- DLQ dashboards must show counts by tenant, topic, consumer, and failure class.
