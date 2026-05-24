# Aegis Flow Pitch Deck Script

## Slide 1: Aegis Flow

Enterprise agent orchestration without breaking enterprise security boundaries.

Speaker notes: Aegis Flow gives CTOs a governed way to build, package, deploy, and operate AI agents as first-class enterprise workloads.

## Slide 2: The Problem

AI agents are powerful, but most enterprises cannot safely operate them at scale.

Speaker notes: Teams need identity, auditability, policy controls, runtime visibility, and deployment portability before agents can move from prototypes to production.

## Slide 3: The Platform

Aegis Flow separates agent governance from agent execution.

Speaker notes: The Control Plane handles design, identity, registry, export, deployment intent, and audit. The Execution Plane handles LangGraph workflows, Kafka orchestration, tools, checkpoints, and monitoring.

## Slide 4: Enterprise Identity First

Keycloak OIDC secures humans, services, and agents.

Speaker notes: Users authenticate with SSO. Platform services use M2M client credentials. Each deployable agent version receives least-privilege scopes, so agents operate as governed principals.

## Slide 5: Event-Driven Reliability

Kafka, sagas, inbox/outbox, and DLQs make workflows durable.

Speaker notes: Long-running export and deployment flows are observable, retryable, compensatable, and replayable without relying on brittle synchronous chains.

## Slide 6: LangGraph-Native Agent Builder

Design stateful agent workflows visually while preserving runtime semantics.

Speaker notes: The builder models nodes, edges, state schemas, checkpoint strategy, tool permissions, and scope requirements so builders can see what will actually run.

## Slide 7: OCI-Compliant Portability

Exports run across Docker, Kubernetes, and cloud-native platforms.

Speaker notes: Aegis Flow packages agents as OCI-compliant artifacts with Docker images, Kubernetes manifests, Helm values, SBOM, provenance metadata, and identity requirements. Workloads can move between private registries, Kubernetes distributions, and cloud providers.

## Slide 8: Real-Time Operations

Monitor agents like production services.

Speaker notes: Operators can inspect executions, graph state, saga progress, Kafka lag, node traces, failures, and DLQ replay eligibility from one operational surface.

## Slide 9: Governance and Audit

Agent activity becomes accountable.

Speaker notes: Aegis Flow tracks who approved scopes, which tools were invoked, which agent version ran, what image was deployed, and how failures were handled.

## Slide 10: CTO Outcome

Move from agent experiments to controlled enterprise adoption.

Speaker notes: Aegis Flow reduces platform risk, standardizes operations, supports cloud-native portability, and gives engineering leaders a practical path to production-grade AI agents.
