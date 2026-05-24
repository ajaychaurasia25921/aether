package com.aether.registry.messaging;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import java.util.UUID;

public record EventEnvelope(
    UUID messageId,
    UUID sagaId,
    UUID correlationId,
    String schemaVersion,
    String topic,
    JsonNode payload,
    Map<String, String> headers
) {
}
