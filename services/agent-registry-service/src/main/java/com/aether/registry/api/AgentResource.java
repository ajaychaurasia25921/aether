package com.aether.registry.api;

import com.aether.registry.api.dto.AgentDtos.AgentResponse;
import com.aether.registry.api.dto.AgentDtos.AgentVersionResponse;
import com.aether.registry.api.dto.AgentDtos.CreateAgentRequest;
import com.aether.registry.api.dto.AgentDtos.CreateAgentVersionRequest;
import com.aether.registry.api.dto.ExportDtos.CreateExportRequest;
import com.aether.registry.api.dto.ExportDtos.ExportJobResponse;
import com.aether.registry.persistence.RegistryRepository;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.UUID;

@Path("/api/v1/agents")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class AgentResource {
  private final RegistryRepository repository;

  public AgentResource(RegistryRepository repository) {
    this.repository = repository;
  }

  @POST
  @RolesAllowed({"platform-admin", "tenant-admin", "agent-designer"})
  public Response createAgent(@Valid CreateAgentRequest request) {
    AgentResponse response = repository.createAgent(
        request.tenantId(),
        request.slug(),
        request.name(),
        request.description(),
        request.ownerUserId()
    );
    return Response.status(Response.Status.CREATED).entity(response).build();
  }

  @GET
  @Path("/{agentId}")
  @RolesAllowed({"platform-admin", "tenant-admin", "agent-designer", "operator", "auditor", "viewer"})
  public AgentResponse getAgent(@PathParam("agentId") UUID agentId) {
    return repository.findAgent(agentId)
        .orElseThrow(() -> new NotFoundException("Agent not found"));
  }

  @POST
  @Path("/{agentId}/versions")
  @RolesAllowed({"platform-admin", "tenant-admin", "agent-designer"})
  public Response createVersion(@PathParam("agentId") UUID agentId, @Valid CreateAgentVersionRequest request) {
    AgentVersionResponse response = repository.createAgentVersion(
        agentId,
        request.version(),
        request.runtimeType(),
        request.configHash(),
        request.createdBy()
    );
    return Response.status(Response.Status.CREATED).entity(response).build();
  }

  @POST
  @Path("/{agentId}/versions/{agentVersionId}/export")
  @RolesAllowed({"platform-admin", "tenant-admin", "agent-designer", "operator"})
  public Response requestExport(
      @PathParam("agentId") UUID agentId,
      @PathParam("agentVersionId") UUID agentVersionId,
      @Valid CreateExportRequest request
  ) {
    ExportJobResponse response = repository.requestExport(
        agentId,
        agentVersionId,
        request.targetFormat(),
        request.requestedBy()
    );
    return Response.status(Response.Status.ACCEPTED).entity(response).build();
  }
}
