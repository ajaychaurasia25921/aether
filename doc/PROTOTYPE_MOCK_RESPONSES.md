# Prototype Mock Responses

These mock responses support early Next.js dashboard prototyping before all backend services are complete.

## GET /api/v1/agents

```json
{
  "items": [
    {
      "id": "2b3f38cc-d74a-4ae8-9138-637efc224a02",
      "tenantId": "7d1d62db-fb0d-4378-b6e1-bd9d2f67a010",
      "slug": "support-agent",
      "name": "Support Agent",
      "description": "Handles support triage and CRM lookup",
      "status": "ACTIVE",
      "latestVersion": "1.0.0",
      "runtimeType": "LANGGRAPH",
      "lastExportStatus": "COMPLETED"
    }
  ]
}
```

## GET /api/v1/agents/{agentId}

```json
{
  "id": "2b3f38cc-d74a-4ae8-9138-637efc224a02",
  "tenantId": "7d1d62db-fb0d-4378-b6e1-bd9d2f67a010",
  "slug": "support-agent",
  "name": "Support Agent",
  "description": "Handles support triage and CRM lookup",
  "status": "ACTIVE",
  "versions": [
    {
      "id": "42b749ff-2c73-4bb5-87fa-d8c36a7bdf61",
      "version": "1.0.0",
      "status": "EXPORTABLE",
      "runtimeType": "LANGGRAPH",
      "configHash": "sha256:7d8f"
    }
  ],
  "scopes": [
    "agent:execute",
    "tool:invoke:crm",
    "memory:read"
  ]
}
```

## POST /api/v1/agents/{agentId}/versions/{versionId}/export

```json
{
  "exportJobId": "c5a6f1ce-b7b1-4a91-b598-9a37c1ad6167",
  "sagaId": "eb2ef23f-22e1-48be-ae92-26235cdd2c4e",
  "agentVersionId": "42b749ff-2c73-4bb5-87fa-d8c36a7bdf61",
  "status": "PENDING",
  "targetFormat": "OCI_BUNDLE"
}
```

## GET /api/v1/export-jobs/{exportJobId}

```json
{
  "id": "c5a6f1ce-b7b1-4a91-b598-9a37c1ad6167",
  "agentVersionId": "42b749ff-2c73-4bb5-87fa-d8c36a7bdf61",
  "sagaId": "eb2ef23f-22e1-48be-ae92-26235cdd2c4e",
  "status": "PACKAGING",
  "targetFormat": "OCI_BUNDLE",
  "progress": {
    "currentStep": "Generate Kubernetes manifests",
    "completedSteps": [
      "Validate agent version",
      "Verify Keycloak M2M client",
      "Compile LangGraph workflow"
    ]
  }
}
```

## GET /api/v1/runtime/executions

```json
{
  "items": [
    {
      "executionId": "exec-123",
      "agentId": "2b3f38cc-d74a-4ae8-9138-637efc224a02",
      "agentName": "Support Agent",
      "status": "RUNNING",
      "currentNode": "Tool: CRM",
      "startedAt": "2026-05-24T00:00:00Z"
    }
  ]
}
```

## GET /api/v1/dlq

```json
{
  "items": [
    {
      "topic": "agent.export.requested.dlq",
      "consumer": "export-service",
      "failureClass": "KEYCLOAK_TIMEOUT",
      "retryCount": 3,
      "replayEligible": true,
      "deadLetteredAt": "2026-05-24T00:00:00Z"
    }
  ]
}
```
