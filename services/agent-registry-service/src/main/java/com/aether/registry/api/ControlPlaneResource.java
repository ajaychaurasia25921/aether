package com.aether.registry.api;

import com.aether.registry.api.dto.ControlPlaneDtos.AgentListResponse;
import com.aether.registry.api.dto.ControlPlaneDtos.DlqListResponse;
import com.aether.registry.api.dto.ControlPlaneDtos.ExecutionPlaneStatusResponse;
import com.aether.registry.api.dto.ControlPlaneDtos.ExportJobListResponse;
import com.aether.registry.api.dto.ControlPlaneDtos.ReplayResponse;
import com.aether.registry.persistence.RegistryRepository;
import jakarta.annotation.security.PermitAll;
import jakarta.annotation.security.RolesAllowed;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import java.util.UUID;

@Path("/api/v1/control-plane")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class ControlPlaneResource {
  private final RegistryRepository repository;

  public ControlPlaneResource(RegistryRepository repository) {
    this.repository = repository;
  }

  @GET
  @Path("/agents")
  @RolesAllowed({"platform-admin", "tenant-admin", "agent-designer", "operator", "auditor", "viewer"})
  public AgentListResponse listAgents() {
    return new AgentListResponse(repository.listAgents());
  }

  @GET
  @Path("/exports")
  @RolesAllowed({"platform-admin", "tenant-admin", "agent-designer", "operator", "auditor", "viewer"})
  public ExportJobListResponse listExportJobs() {
    return new ExportJobListResponse(repository.listExportJobs());
  }

  @GET
  @Path("/dlq")
  @RolesAllowed({"platform-admin", "operator", "auditor"})
  public DlqListResponse listDlq() {
    return new DlqListResponse(repository.listDlqEvents());
  }

  @POST
  @Path("/dlq/{dlqEventId}/replay")
  @RolesAllowed({"platform-admin", "operator"})
  public ReplayResponse replayDlq(@PathParam("dlqEventId") UUID dlqEventId) {
    boolean replayEligible = repository.markDlqEventReplayed(dlqEventId);
    return new ReplayResponse(dlqEventId, replayEligible ? "REPLAY_REQUESTED" : "BLOCKED", replayEligible);
  }

  @GET
  @Path("/execution-plane/status")
  @PermitAll
  public ExecutionPlaneStatusResponse executionPlaneStatus() {
    return new ExecutionPlaneStatusResponse(
        "agent-registry-service",
        "Quarkus / Gradle",
        "Kafka event-driven export saga",
        "Saga + Inbox + Outbox + DLQ",
        List.of("agent.export.completed", "agent.export.failed"),
        List.of("agent.export.requested", "agent.export.dlq"),
        List.of("Keycloak OIDC Authorization Code + PKCE", "Keycloak M2M client_credentials"),
        List.of("LangGraphWorkflowPort", "LangGraphCompileRequest", "LangGraphCompiledArtifact")
    );
  }
}
