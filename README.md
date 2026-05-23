# Aether / Aegis Flow

Aether is the repository for **Aegis Flow**, an enterprise agentic orchestration platform for creating, exporting, and deploying autonomous AI agents.

The platform is designed around an identity-first, event-driven architecture:

- Keycloak OIDC/SSO for human users and machine-to-machine agent identities
- Quarkus microservices for the backend control plane
- Kafka for event-driven workflows
- Saga orchestration for distributed transactions
- Inbox/Outbox consistency patterns
- Dead Letter Queue handling and replay governance
- LangGraph for stateful agent workflows
- React + Next.js for the dashboard
- OCI-compliant export artifacts for Docker and Kubernetes

## Architecture Documents

- [Aegis Flow Blueprint](docs/aegis-flow-blueprint.md)
- [Service Boundaries](docs/service-boundaries.md)
- [Agent Registry Schema](docs/agent-registry-schema.sql)
- [Kafka Topic Contract](docs/kafka-topic-contract.md)
- [Agent Export Saga](docs/agent-export-saga.md)

## High-Level Plan

1. Establish the control plane and execution plane boundaries.
2. Implement Keycloak realm, roles, scopes, and agent M2M clients.
3. Build the Agent Registry Service with versioned agent definitions.
4. Add Kafka event contracts, outbox publishing, inbox consumers, retries, and DLQs.
5. Implement the Agent Export Saga.
6. Integrate LangGraph runtime packaging and checkpointing.
7. Build the Next.js dashboard for configuration, export, and monitoring.
8. Generate OCI-compliant Docker, Kubernetes, Helm, SBOM, and provenance artifacts.
