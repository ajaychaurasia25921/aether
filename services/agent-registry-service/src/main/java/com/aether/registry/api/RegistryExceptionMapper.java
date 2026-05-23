package com.aether.registry.api;

import com.aether.registry.persistence.RegistryRepository.RegistryNotFoundException;
import com.aether.registry.persistence.RegistryRepository.RegistryStorageException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

@Provider
public class RegistryExceptionMapper implements ExceptionMapper<RuntimeException> {
  @Override
  public Response toResponse(RuntimeException exception) {
    if (exception instanceof RegistryNotFoundException) {
      return Response.status(Response.Status.NOT_FOUND)
          .entity(new ErrorResponse("NOT_FOUND", exception.getMessage()))
          .build();
    }
    if (exception instanceof RegistryStorageException) {
      return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
          .entity(new ErrorResponse("REGISTRY_STORAGE_ERROR", exception.getMessage()))
          .build();
    }
    return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
        .entity(new ErrorResponse("INTERNAL_ERROR", "Unexpected registry error"))
        .build();
  }

  public record ErrorResponse(String code, String message) {
  }
}
