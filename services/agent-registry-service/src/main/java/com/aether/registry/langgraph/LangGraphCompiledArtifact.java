package com.aether.registry.langgraph;

import java.util.List;
import java.util.Map;

public record LangGraphCompiledArtifact(
    String artifactUri,
    String imageName,
    String stateSchemaHash,
    List<String> nodeNames,
    Map<String, String> requiredScopes
) {
}
