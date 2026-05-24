package com.aether.registry.api;

import com.aether.registry.api.dto.TenantDtos.CreateTenantRequest;
import com.aether.registry.api.dto.TenantDtos.TenantResponse;
import com.aether.registry.persistence.RegistryRepository;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/v1/tenants")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class TenantResource {
  private final RegistryRepository repository;

  public TenantResource(RegistryRepository repository) {
    this.repository = repository;
  }

  @POST
  @RolesAllowed({"platform-admin", "tenant-admin"})
  public Response createTenant(@Valid CreateTenantRequest request) {
    TenantResponse response = repository.createTenant(request.slug(), request.name());
    return Response.status(Response.Status.CREATED).entity(response).build();
  }
}
