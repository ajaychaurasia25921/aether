# Aegis Flow Technical Wiki

## Executive Summary

Aegis Flow is an enterprise agentic orchestration platform that lets organizations design, govern, execute, export, and monitor autonomous AI agents inside existing security and compliance boundaries.

The platform separates the Control Plane from the Execution Plane:

- Control Plane: dashboard, Keycloak identity, agent registry, policy, exports, audit, deployment intent.
- Execution Plane: LangGraph runtime, Kafka workflows, tool execution, checkpointing, telemetry, DLQ replay.

## Development Roadmap

### Phase 1: Foundation

Key deliverables:

- Repository, service boundaries, Docker Compose, local developer workflow.
- Keycloak realm with SSO roles, client scopes, service accounts, and M2M client templates.
- PostgreSQL schemas for tenants, agents, versions, scopes, LangGraph definitions, outbox, inbox, sagas, DLQ.
- Kafka topic contract for registry, export, runtime, audit, monitoring, and DLQ topics.
- Baseline observability with health checks, metrics, logs, and OpenTelemetry identity fields.

### Phase 2: Core Engine

Key deliverables:

- Quarkus Agent Registry APIs for tenants, agents, versions, scopes, tools, and export requests.
- Transactional outbox publisher and idempotent inbox consumers.
- Export saga orchestrator for identity provisioning, workflow compilation, OCI packaging, registry publishing, and compensation.
- DLQ routing and replay metadata.
- LangGraph integration contract for graph validation, state schema extraction, compilation, and runtime checkpoint policy.

### Phase 3: Interface

Key deliverables:

- React + Next.js enterprise dashboard shell.
- Agent Builder canvas for LangGraph state machines, nested state payloads, tool policy, scopes, and export readiness.
- Real-time operational monitoring dashboard with execution health, saga state, Kafka lag, DLQ triage, nested runtime state, and node traces.
- Keycloak OIDC login via Authorization Code + PKCE.
- Dashboard API client with bearer-token propagation and role-aware navigation.

### Phase 4: Advanced Logic

Key deliverables:

- Policy engine for tool permissions, model access, tenant isolation, and runtime guardrails.
- Agent-as-principal lifecycle automation for per-version Keycloak clients.
- Replay governance for DLQ events with schema validation and approval workflows.
- Runtime autoscaling signals from Kafka lag, execution concurrency, and checkpoint pressure.
- OCI supply-chain metadata: SBOM, provenance, signature hooks, manifest export, Helm values, and Kubernetes overlays.

### Phase 5: Delivery

Key deliverables:

- Production Kubernetes deployment model for control plane and execution plane services.
- Hardened Keycloak realm export with environment-specific secrets and rotation procedure.
- Enterprise runbooks for export saga recovery, DLQ replay, incident response, tenant onboarding, and disaster recovery.
- Security validation: OIDC scopes, service account permissions, audit trails, image provenance, and dependency scanning.
- CTO-ready launch package: architecture deck, demo flows, ROI story, and deployment portability checklist.

## Operating Model

Aegis Flow treats every agent version as a governed software artifact. Agent definitions are authored in the dashboard, validated by the registry, compiled for LangGraph execution, packaged as OCI artifacts, and monitored as durable event-driven workflows.

## Reliability Model

- Saga Pattern: long-running export and deployment workflows are stepwise, compensatable, and observable.
- Outbox Pattern: domain changes and event publication are made consistent without distributed transactions.
- Inbox Pattern: consumers are idempotent and safe under Kafka redelivery.
- DLQ Pattern: poison messages and exhausted retries are preserved with replay eligibility metadata.

## Security Model

- Human SSO uses Keycloak and PKCE.
- Service-to-service calls use Keycloak confidential clients and `client_credentials`.
- Agent runtime calls use dedicated per-agent-version clients with least-privilege scopes.
- Every command/event carries tenant, correlation, saga, and actor metadata.
- All exports include runtime identity requirements so deployment targets do not invent privileges.
