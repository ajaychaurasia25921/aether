# Aegis Flow High-Level Design

## 1. Purpose

Aegis Flow is an enterprise agentic orchestration platform that lets users create, configure, export, deploy, and monitor autonomous AI agents.

The platform is designed for:

- Enterprise identity and governance
- Agent-as-principal security
- Stateful agent orchestration
- Event-driven distributed workflows
- Reliable export and deployment pipelines
- OCI-compliant portability

## 2. Architecture Overview

```mermaid
flowchart LR
  UI[Next.js Dashboard] --> GW[API Gateway / BFF]
  GW --> REG[Agent Registry Service]
  GW --> IDB[Identity Broker Service]
  GW --> EXP[Export Service]
  GW --> MON[Monitoring Service]

  REG --> PG[(PostgreSQL)]
  IDB --> KC[Keycloak]
  EXP --> OCI[OCI Registry / Artifact Store]
  EXP --> LGC[LangGraph Compiler]

  REG --> KAFKA[(Kafka)]
  EXP --> KAFKA
  MON --> KAFKA
  AUD[Audit Service] --> KAFKA

  KAFKA --> RUN[Runtime Dispatcher]
  RUN --> LGR[LangGraph Runtime]
  LGR --> TOOLS[Tool Plugin Runtime]
```

### Plane Responsibilities

| Plane | Responsibility | Key Components |
| --- | --- | --- |
| Control Plane | Human-facing configuration, governance, exports, deployment intent, tenant administration | Next.js Dashboard, Keycloak, Agent Registry, Policy Service, Export Service, Audit Service |
| Execution Plane | Durable workflow execution, tool invocation, runtime state, telemetry, event processing | LangGraph Runtime, Runtime Dispatcher, Tool Runtime, Kafka, Checkpoint Store, DLQ Replay Worker |
| Shared Platform | Identity, transport, persistence, observability, supply-chain controls | Keycloak OIDC, Kafka, PostgreSQL, OCI Registry, OpenTelemetry, Prometheus |

## 3. Architectural Principles

- Identity-first: every human and agent interaction is authenticated through Keycloak.
- Agent-as-principal: every deployable agent version has its own OIDC M2M identity.
- Event-driven by default: long-running workflows communicate through Kafka.
- Data ownership: each microservice owns its schema.
- Reliability by construction: sagas, inbox, outbox, retries, and DLQs are first-class.
- Portability: exported agents must be OCI-compliant and Kubernetes-ready.
- Observability: every command and event carries correlation and saga identifiers.

## 4. Logical Planes

### Control Plane

The control plane owns user-facing configuration and governance:

- Agent Registry
- Agent Builder
- Identity Broker
- Export Service
- Deployment Service
- Monitoring Service
- Audit Service
- Policy Service
- Next.js dashboard

### Execution Plane

The execution plane owns runtime activity:

- Runtime Dispatcher
- LangGraph Runtime
- Tool Plugin Runtime
- Agent Runtime Workers
- Checkpoint Store
- Kafka consumers and producers

## 5. Key Runtime Flows

- Agent creation and versioning
- Scope assignment and identity provisioning
- LangGraph workflow validation
- Agent export saga
- Agent deployment saga
- Agent execution lifecycle
- Runtime monitoring and audit ingestion
- DLQ review and replay

## 6. Keycloak OIDC and SSO Model

Aegis Flow uses Keycloak as the single issuer for both human SSO and machine-to-machine agent identities.

Human users authenticate through the `aether-dashboard` public OIDC client using Authorization Code + PKCE. Role and tenant claims authorize dashboard actions such as agent design, export approval, deployment request, DLQ replay, and audit review.

Machine-to-machine authentication uses confidential OIDC clients with service accounts:

- Platform services such as `agent-registry-service`, `export-service`, and `runtime-dispatcher` use `client_credentials`.
- Each exportable agent version receives a dedicated Keycloak confidential client such as `agent-support-agent-v1`.
- Agent clients are granted only the scopes required by their graph and approved tools, for example `agent:execute`, `tool:invoke:crm`, `memory:read`, and `workflow:transition`.
- Kafka producers and HTTP callers must include bearer tokens. Consumers validate issuer, audience, expiry, scopes, tenant, and agent-version claims before processing commands.
- Token exchange is not used for privilege elevation; service-to-service calls request only explicitly assigned client scopes.

## 7. Saga Orchestration Flow

The export workflow is a saga because identity provisioning, LangGraph compilation, OCI packaging, registry publication, and status updates cross independent services.

```mermaid
sequenceDiagram
  autonumber
  participant U as Dashboard User
  participant API as Agent Registry API
  participant DB as Registry DB
  participant OB as Outbox Publisher
  participant K as Kafka
  participant EXP as Export Saga Orchestrator
  participant KC as Keycloak
  participant LG as LangGraph Compiler
  participant OCI as OCI Registry
  participant DLQ as Dead Letter Topic

  U->>API: POST /agents/{agent}/versions/{version}/export
  API->>DB: Insert export_job(PENDING) + saga_instance(RUNNING) + outbox event
  DB-->>API: Commit
  API-->>U: 202 Accepted + sagaId
  OB->>DB: Poll pending outbox events
  OB->>K: Publish agent.export.requested
  OB->>DB: Mark outbox PUBLISHED
  K->>EXP: Consume agent.export.requested
  EXP->>DB: Insert inbox RECEIVED
  EXP->>KC: Create or verify M2M agent client and scopes
  EXP->>K: Publish agent.identity.ready
  EXP->>LG: Compile LangGraph graph definition
  EXP->>K: Publish agent.workflow.compiled
  EXP->>OCI: Push OCI bundle, Docker image, manifests, SBOM
  EXP->>K: Publish agent.export.completed
  K->>API: Consume completion event
  API->>DB: Mark inbox PROCESSED, export_job COMPLETED, saga COMPLETED

  alt unrecoverable failure
    EXP->>K: Publish compensating event
    EXP->>KC: Disable provisional client/scopes
    EXP->>DLQ: Route event with failure class and replay metadata
    EXP->>DB: Mark saga FAILED or COMPENSATED
  end
```

## 8. Inbox/Outbox Polling Mechanism

```mermaid
sequenceDiagram
  autonumber
  participant SVC as Quarkus Service
  participant DB as PostgreSQL
  participant P as Scheduled Outbox Publisher
  participant K as Kafka
  participant C as Kafka Consumer
  participant DLQ as DLQ Router

  SVC->>DB: Begin transaction
  SVC->>DB: Mutate aggregate row
  SVC->>DB: Insert outbox_events(status=PENDING, headers, payload)
  SVC->>DB: Commit
  loop every 5 seconds
    P->>DB: SELECT PENDING ORDER BY created_at LIMIT 25
    P->>K: Produce event with messageId, sagaId, correlationId
    alt publish succeeds
      P->>DB: UPDATE outbox_events SET status=PUBLISHED
    else publish fails
      P->>DB: Increment retry count / mark FAILED after threshold
    end
  end
  K->>C: Deliver event
  C->>DB: Insert inbox_events(messageId, consumer) if absent
  alt duplicate message
    C->>DB: Mark inbox IGNORED
  else valid message
    C->>DB: Process domain update in same transaction
    C->>DB: Mark inbox PROCESSED
  else failed after retries
    C->>DLQ: Publish dead-letter envelope
    C->>DB: Mark inbox FAILED
  end
```

## 9. Deployment View

Aegis Flow should be deployable to Kubernetes with:

- One deployment per service
- PostgreSQL per bounded context or logical schema
- Kafka cluster
- Keycloak realm
- OCI registry integration
- OpenTelemetry collector
- Prometheus and Grafana
- Central log aggregation

Exported runtime artifacts are OCI-compliant and can be moved between Docker, Kubernetes, OpenShift, EKS, AKS, GKE, private registries, and air-gapped enterprise registries. Each exported bundle includes image metadata, Kubernetes manifests, Helm values, SBOM, provenance, runtime scopes, and LangGraph graph metadata.

## 10. Non-Functional Requirements

| Concern | Requirement |
| --- | --- |
| Security | OIDC, scoped M2M identities, tenant isolation |
| Reliability | Saga, inbox/outbox, retries, DLQ |
| Scalability | Kafka partitioning by tenant or aggregate ID |
| Portability | Docker, Kubernetes, Helm, SBOM, provenance |
| Observability | Metrics, logs, traces, audit records |
| Maintainability | Bounded contexts, clear contracts, schema migrations |
