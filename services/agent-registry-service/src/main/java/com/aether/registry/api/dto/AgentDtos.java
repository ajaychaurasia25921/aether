package com.aether.registry.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public final class AgentDtos {
  private AgentDtos() {
  }

  public record CreateAgentRequest(
      @NotNull UUID tenantId,
      @NotBlank String slug,
      @NotBlank String name,
      String description,
      @NotNull UUID ownerUserId
  ) {
  }

  public record AgentResponse(
      UUID id,
      UUID tenantId,
      String slug,
      String name,
      String description,
      UUID ownerUserId,
      String status
  ) {
  }

  public record CreateAgentVersionRequest(
      @NotBlank String version,
      @NotBlank String runtimeType,
      @NotBlank String configHash,
      @NotNull UUID createdBy
  ) {
  }

  public record AgentVersionResponse(
      UUID id,
      UUID agentId,
      String version,
      String status,
      String runtimeType,
      String configHash
  ) {
  }
}
