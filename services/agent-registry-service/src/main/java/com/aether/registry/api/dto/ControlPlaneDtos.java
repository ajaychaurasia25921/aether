package com.aether.registry.api.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class ControlPlaneDtos {
  private ControlPlaneDtos() {
  }

  public record AgentListResponse(List<AgentListItem> items) {
  }

  public record AgentListItem(
      UUID id,
      UUID tenantId,
      String slug,
      String name,
      String description,
      String status,
      String latestVersion,
      String runtimeType,
      String lastExportStatus
  ) {
  }

  public record ExportJobListResponse(List<ExportJobListItem> items) {
  }

  public record ExportJobListItem(
      UUID id,
      UUID sagaId,
      UUID agentVersionId,
      String agentName,
      String version,
      String status,
      String targetFormat,
      String artifactUri,
      String errorMessage,
      OffsetDateTime updatedAt
  ) {
  }

  public record DlqListResponse(List<DlqListItem> items) {
  }

  public record DlqListItem(
      UUID id,
      String originalTopic,
      String dlqTopic,
      String consumerName,
      String failureClass,
      String failureMessage,
      int retryCount,
      boolean replayEligible,
      OffsetDateTime deadLetteredAt
  ) {
  }

  public record ReplayResponse(UUID id, String status, boolean replayEligible) {
  }

  public record ExecutionPlaneStatusResponse(
      String service,
      String framework,
      String orchestration,
      String reliability,
      List<String> inboundTopics,
      List<String> outboundTopics,
      List<String> securityModes,
      List<String> runtimeContracts
  ) {
  }
}
