# Service Boundaries

Aegis Flow separates configuration, governance, export, deployment, and runtime execution into clear bounded contexts. Each service owns its data and publishes state changes through Kafka.

## Control Plane Services

| Service | Owner Data | Primary Responsibilities |
| --- | --- | --- |
| API Gateway / BFF | None or session metadata | Frontend aggregation, token validation, routing, request shaping |
| Identity Broker Service | Agent OIDC client metadata | Keycloak realm integration, client provisioning, service accounts, scopes |
| Agent Registry Service | Agents, versions, scopes, tools, capabilities, workflows | Source of truth for agent definitions and versions |
| Agent Builder Service | Draft validation results | Validates prompts, tools, graph definitions, policies, and export readiness |
| Export Service | Export jobs and generated artifact metadata | Coordinates Agent Export Saga and produces OCI-compliant bundles |
| Deployment Service | Deployment jobs and target metadata | Deploys exported agents to Kubernetes or external targets |
| Monitoring Service | Read models and stream offsets | Real-time status, execution telemetry, export progress, dashboard updates |
| Audit Service | Immutable audit log | Records identity, configuration, export, deployment, and replay actions |
| Policy Service | Policy rules and decisions | Enforces scope, export, deployment, and runtime constraints |

## Execution Plane Services

| Service | Owner Data | Primary Responsibilities |
| --- | --- | --- |
| Runtime Dispatcher Service | Execution jobs | Dispatches execution commands and tracks execution saga state |
| LangGraph Runtime Service | Checkpoints and graph run state | Executes stateful LangGraph workflows and emits graph transition events |
| Tool Plugin Service | Tool catalog and tool policies | Manages tool metadata, allowed actions, secret references, and sandbox policy |
| Agent Runtime Worker | Ephemeral runtime state | Executes agent tasks using scoped OIDC credentials |

## Boundary Rules

- Services must not directly read another service's database.
- Cross-service communication should use Kafka events or synchronous APIs only for query-style reads.
- Critical state transitions must use transactional outbox events.
- Kafka consumers must use inbox deduplication before processing.
- All public APIs must validate Keycloak JWTs.
- Agent runtime calls must use agent-specific M2M tokens.
- Every export, deploy, DLQ replay, and policy override must be audited.

## Recommended Service Packaging

```text
services/
  identity-broker-service/
  agent-registry-service/
  agent-builder-service/
  workflow-orchestrator-service/
  runtime-dispatcher-service/
  langgraph-runtime-service/
  tool-plugin-service/
  export-service/
  deployment-service/
  monitoring-service/
  audit-service/
  policy-service/
```

## Shared Platform Libraries

Shared libraries should be limited to platform concerns:

- Kafka envelope model
- Correlation ID and saga ID propagation
- OIDC claims parsing
- Outbox and inbox primitives
- Error classification
- OpenTelemetry conventions

Business domain logic must remain inside service boundaries.
