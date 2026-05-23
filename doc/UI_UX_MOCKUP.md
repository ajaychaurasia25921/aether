# Aegis Flow UI/UX Mockup

## 1. Product Surface

The dashboard is a work-focused enterprise console for designing, exporting, deploying, and monitoring autonomous agents.

Primary navigation:

```text
Agents | Builder | Exports | Deployments | Runtime Monitor | DLQ | Audit | Settings
```

## 2. Agent List

```text
+--------------------------------------------------------------------------------+
| Aegis Flow                                      [Search agents...] [New Agent]  |
+--------------------------------------------------------------------------------+
| Agents                                                                         |
|                                                                                |
| Name             Status      Version   Runtime     Last Export      Actions    |
| Support Agent    Active      1.0.0     LangGraph   10 min ago       Open Export |
| Claims Agent     Draft       0.3.0     LangGraph   Never            Open        |
| Billing Agent    Exported    2.1.0     LangGraph   Yesterday        Deploy      |
+--------------------------------------------------------------------------------+
```

## 3. Agent Builder

```text
+--------------------------------------------------------------------------------+
| Support Agent / Builder                                          [Save] [Export]|
+--------------------------------------------------------------------------------+
| Details              | LangGraph Workflow                                      |
| Name                 |  [Intake] --> [Classify] --> [Tool: CRM] --> [Respond]  |
| Slug                 |                                                        |
| Description          |  Selected Node: Classify                               |
| Runtime: LangGraph   |  Model: llama3.2:3b                                    |
|                      |  Retry Policy: 3 attempts                              |
+----------------------+---------------------------------------------------------+
| Scopes               | Tools                                                   |
| agent:execute        | CRM Lookup                                              |
| tool:invoke:crm      | Knowledge Search                                       |
| memory:read          | Ticket Update                                          |
+--------------------------------------------------------------------------------+
```

## 4. Export Center

```text
+--------------------------------------------------------------------------------+
| Export Center                                                   [New Export]   |
+--------------------------------------------------------------------------------+
| Agent            Version   Format      Status       Artifact                   |
| Support Agent    1.0.0     OCI Bundle  Completed    ghcr.io/acme/support:1.0.0 |
| Claims Agent     0.3.0     Kubernetes  Packaging    -                          |
| Billing Agent    2.1.0     Helm        Failed       View Error                 |
+--------------------------------------------------------------------------------+
```

## 5. Runtime Monitor

```text
+--------------------------------------------------------------------------------+
| Runtime Monitor                                                                |
+--------------------------------------------------------------------------------+
| Execution ID      Agent          Status      Current Node      Duration         |
| exec-123          Support Agent  Running     Tool: CRM         00:01:21         |
| exec-124          Billing Agent  Completed   Respond           00:00:42         |
+--------------------------------------------------------------------------------+
| Graph Timeline                                                                  |
| Intake -> Classify -> Tool: CRM -> Respond                                      |
+--------------------------------------------------------------------------------+
```

## 6. DLQ Console

```text
+--------------------------------------------------------------------------------+
| Dead Letter Queue                                      [Replay Selected]        |
+--------------------------------------------------------------------------------+
| Topic                    Consumer        Failure              Replay Eligible   |
| agent.export.requested   export-service  Keycloak timeout     Yes               |
| agent.execution.failed   monitor-service Invalid payload      No                |
+--------------------------------------------------------------------------------+
```

## 7. UX Principles

- Keep operational data dense and scannable.
- Make identity and scopes visible at the point of agent configuration.
- Show saga progress as concrete lifecycle states, not abstract loading spinners.
- Never hide DLQ failures from operators.
- Make export artifacts inspectable before deployment.
