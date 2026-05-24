package com.aether.registry.langgraph;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import java.util.UUID;

public record LangGraphCompileRequest(
    UUID tenantId,
    UUID agentId,
    UUID agentVersionId,
    String graphName,
    JsonNode graphDefinition,
    String entryNode,
    String checkpointStrategy,
    Map<String, String> runtimeEnvironment
) {
}
