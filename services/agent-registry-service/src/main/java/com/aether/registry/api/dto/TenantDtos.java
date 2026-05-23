package com.aether.registry.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public final class TenantDtos {
  private TenantDtos() {
  }

  public record CreateTenantRequest(
      @NotBlank String slug,
      @NotBlank String name
  ) {
  }

  public record TenantResponse(
      UUID id,
      String slug,
      String name,
      String status
  ) {
  }
}
