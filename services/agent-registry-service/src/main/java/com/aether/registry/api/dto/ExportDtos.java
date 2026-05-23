package com.aether.registry.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public final class ExportDtos {
  private ExportDtos() {
  }

  public record CreateExportRequest(
      @NotBlank String targetFormat,
      @NotNull UUID requestedBy
  ) {
  }

  public record ExportJobResponse(
      UUID exportJobId,
      UUID sagaId,
      UUID agentVersionId,
      String status,
      String targetFormat
  ) {
  }
}
