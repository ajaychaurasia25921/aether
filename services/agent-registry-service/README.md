# Agent Registry Service

Quarkus service that owns Aegis Flow agent metadata, versioning, OIDC client mappings, scopes, capabilities, LangGraph workflow references, export jobs, saga instances, and inbox/outbox persistence.

## Responsibilities

- Register agents per tenant
- Track immutable agent versions
- Store agent scopes and Keycloak M2M client mappings
- Store LangGraph workflow definitions
- Create export jobs
- Emit `agent.export.requested` through the outbox pattern
- Consume export completion/failure events through the inbox pattern

## Local Development

Expected local dependencies:

- PostgreSQL database: `aether_registry`
- Kafka broker: `localhost:9092`
- Keycloak realm: `aether`

Run database migrations automatically at startup:

```bash
mvn quarkus:dev
```

Important config values are defined in:

```text
src/main/resources/application.properties
```

## Flyway

Migration files live in:

```text
src/main/resources/db/migration
```

Current migration:

```text
V1__create_agent_registry.sql
```
