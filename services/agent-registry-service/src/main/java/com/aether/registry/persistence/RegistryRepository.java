package com.aether.registry.persistence;

import com.aether.registry.api.dto.AgentDtos.AgentResponse;
import com.aether.registry.api.dto.AgentDtos.AgentVersionResponse;
import com.aether.registry.api.dto.ControlPlaneDtos.AgentListItem;
import com.aether.registry.api.dto.ControlPlaneDtos.DlqListItem;
import com.aether.registry.api.dto.ControlPlaneDtos.ExportJobListItem;
import com.aether.registry.api.dto.ExportDtos.ExportJobResponse;
import com.aether.registry.api.dto.TenantDtos.TenantResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.OffsetDateTime;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import javax.sql.DataSource;

@ApplicationScoped
public class RegistryRepository {
  private final DataSource dataSource;
  private final ObjectMapper objectMapper;

  public RegistryRepository(DataSource dataSource, ObjectMapper objectMapper) {
    this.dataSource = dataSource;
    this.objectMapper = objectMapper;
  }

  public TenantResponse createTenant(String slug, String name) {
    UUID id = UUID.randomUUID();
    String sql = """
        INSERT INTO tenants (id, slug, name, status)
        VALUES (?, ?, ?, 'ACTIVE')
        """;
    executeUpdate(sql, ps -> {
      ps.setObject(1, id);
      ps.setString(2, slug);
      ps.setString(3, name);
    });
    return new TenantResponse(id, slug, name, "ACTIVE");
  }

  public AgentResponse createAgent(UUID tenantId, String slug, String name, String description, UUID ownerUserId) {
    UUID id = UUID.randomUUID();
    String sql = """
        INSERT INTO agents (id, tenant_id, slug, name, description, owner_user_id, status)
        VALUES (?, ?, ?, ?, ?, ?, 'DRAFT')
        """;
    executeUpdate(sql, ps -> {
      ps.setObject(1, id);
      ps.setObject(2, tenantId);
      ps.setString(3, slug);
      ps.setString(4, name);
      ps.setString(5, description);
      ps.setObject(6, ownerUserId);
    });
    return new AgentResponse(id, tenantId, slug, name, description, ownerUserId, "DRAFT");
  }

  public Optional<AgentResponse> findAgent(UUID id) {
    String sql = """
        SELECT id, tenant_id, slug, name, description, owner_user_id, status
        FROM agents
        WHERE id = ?
        """;
    try (Connection connection = dataSource.getConnection();
         PreparedStatement ps = connection.prepareStatement(sql)) {
      ps.setObject(1, id);
      try (ResultSet rs = ps.executeQuery()) {
        if (!rs.next()) {
          return Optional.empty();
        }
        return Optional.of(new AgentResponse(
            rs.getObject("id", UUID.class),
            rs.getObject("tenant_id", UUID.class),
            rs.getString("slug"),
            rs.getString("name"),
            rs.getString("description"),
            rs.getObject("owner_user_id", UUID.class),
            rs.getString("status")
        ));
      }
    } catch (SQLException e) {
      throw new RegistryStorageException("Failed to load agent", e);
    }
  }

  public List<AgentListItem> listAgents() {
    String sql = """
        SELECT
          a.id,
          a.tenant_id,
          a.slug,
          a.name,
          a.description,
          a.status,
          av.version AS latest_version,
          av.runtime_type,
          COALESCE(ej.status, 'NEVER') AS last_export_status
        FROM agents a
        LEFT JOIN LATERAL (
          SELECT id, version, runtime_type
          FROM agent_versions
          WHERE agent_id = a.id
          ORDER BY created_at DESC
          LIMIT 1
        ) av ON true
        LEFT JOIN LATERAL (
          SELECT status
          FROM export_jobs
          WHERE agent_version_id = av.id
          ORDER BY updated_at DESC
          LIMIT 1
        ) ej ON true
        ORDER BY a.created_at DESC
        """;
    List<AgentListItem> agents = new ArrayList<>();
    try (Connection connection = dataSource.getConnection();
         PreparedStatement ps = connection.prepareStatement(sql);
         ResultSet rs = ps.executeQuery()) {
      while (rs.next()) {
        agents.add(new AgentListItem(
            rs.getObject("id", UUID.class),
            rs.getObject("tenant_id", UUID.class),
            rs.getString("slug"),
            rs.getString("name"),
            rs.getString("description"),
            rs.getString("status"),
            rs.getString("latest_version"),
            rs.getString("runtime_type"),
            rs.getString("last_export_status")
        ));
      }
      return agents;
    } catch (SQLException e) {
      throw new RegistryStorageException("Failed to list agents", e);
    }
  }

  public AgentVersionResponse createAgentVersion(UUID agentId, String version, String runtimeType, String configHash, UUID createdBy) {
    UUID id = UUID.randomUUID();
    String sql = """
        INSERT INTO agent_versions (id, agent_id, version, status, runtime_type, config_hash, created_by)
        VALUES (?, ?, ?, 'DRAFT', ?, ?, ?)
        """;
    executeUpdate(sql, ps -> {
      ps.setObject(1, id);
      ps.setObject(2, agentId);
      ps.setString(3, version);
      ps.setString(4, runtimeType);
      ps.setString(5, configHash);
      ps.setObject(6, createdBy);
    });
    return new AgentVersionResponse(id, agentId, version, "DRAFT", runtimeType, configHash);
  }

  public ExportJobResponse requestExport(UUID agentId, UUID agentVersionId, String targetFormat, UUID requestedBy) {
    UUID exportJobId = UUID.randomUUID();
    UUID sagaId = UUID.randomUUID();
    UUID messageId = UUID.randomUUID();
    UUID outboxId = UUID.randomUUID();
    UUID tenantId = loadTenantIdForAgentVersion(agentId, agentVersionId);

    try (Connection connection = dataSource.getConnection()) {
      boolean previousAutoCommit = connection.getAutoCommit();
      connection.setAutoCommit(false);
      try {
        insertExportJob(connection, exportJobId, agentVersionId, sagaId, targetFormat, requestedBy);
        insertExportRequestedOutboxEvent(connection, outboxId, messageId, sagaId, exportJobId, agentId, agentVersionId, tenantId, targetFormat, requestedBy);
        connection.commit();
      } catch (Exception e) {
        connection.rollback();
        throw e;
      } finally {
        connection.setAutoCommit(previousAutoCommit);
      }
    } catch (Exception e) {
      throw new RegistryStorageException("Failed to request export", e);
    }

    return new ExportJobResponse(exportJobId, sagaId, agentVersionId, "PENDING", targetFormat);
  }

  public List<OutboxEvent> findPendingOutboxEvents(int limit) {
    String sql = """
        SELECT id, topic, payload::text, headers::text
        FROM outbox_events
        WHERE status = 'PENDING'
        ORDER BY created_at
        LIMIT ?
        FOR UPDATE SKIP LOCKED
        """;
    List<OutboxEvent> events = new ArrayList<>();
    try (Connection connection = dataSource.getConnection();
         PreparedStatement ps = connection.prepareStatement(sql)) {
      ps.setInt(1, limit);
      try (ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
          events.add(new OutboxEvent(
              rs.getObject("id", UUID.class),
              rs.getString("topic"),
              rs.getString("payload"),
              rs.getString("headers")
          ));
        }
      }
      return events;
    } catch (SQLException e) {
      throw new RegistryStorageException("Failed to load pending outbox events", e);
    }
  }

  public void markOutboxEventPublished(UUID id) {
    String sql = """
        UPDATE outbox_events
        SET status = 'PUBLISHED', published_at = now()
        WHERE id = ? AND status = 'PENDING'
        """;
    executeUpdate(sql, ps -> ps.setObject(1, id));
  }

  public void markOutboxEventFailed(UUID id) {
    String sql = """
        UPDATE outbox_events
        SET status = 'FAILED', retry_count = retry_count + 1
        WHERE id = ? AND status = 'PENDING'
        """;
    executeUpdate(sql, ps -> ps.setObject(1, id));
  }

  public boolean recordInboxReceived(String messageId, String topic, String consumerName, String payloadHash) {
    UUID id = UUID.randomUUID();
    String sql = """
        INSERT INTO inbox_events (id, message_id, topic, consumer_name, payload_hash, status)
        VALUES (?, ?, ?, ?, ?, 'RECEIVED')
        """;
    try (Connection connection = dataSource.getConnection();
         PreparedStatement ps = connection.prepareStatement(sql)) {
      ps.setObject(1, id);
      ps.setString(2, messageId);
      ps.setString(3, topic);
      ps.setString(4, consumerName);
      ps.setString(5, payloadHash);
      ps.executeUpdate();
      return true;
    } catch (SQLException e) {
      if ("23505".equals(e.getSQLState())) {
        return false;
      }
      throw new RegistryStorageException("Failed to record inbox event", e);
    }
  }

  public void markInboxProcessed(String messageId, String consumerName) {
    String sql = """
        UPDATE inbox_events
        SET status = 'PROCESSED', processed_at = now()
        WHERE message_id = ? AND consumer_name = ?
        """;
    executeUpdate(sql, ps -> {
      ps.setString(1, messageId);
      ps.setString(2, consumerName);
    });
  }

  public void markInboxIgnored(String messageId, String consumerName) {
    String sql = """
        UPDATE inbox_events
        SET status = 'IGNORED', processed_at = now()
        WHERE message_id = ? AND consumer_name = ? AND status = 'RECEIVED'
        """;
    executeUpdate(sql, ps -> {
      ps.setString(1, messageId);
      ps.setString(2, consumerName);
    });
  }

  public void markInboxFailed(String messageId, String consumerName, String errorMessage) {
    String sql = """
        UPDATE inbox_events
        SET status = 'FAILED', processed_at = now(), error_message = ?
        WHERE message_id = ? AND consumer_name = ?
        """;
    executeUpdate(sql, ps -> {
      ps.setString(1, errorMessage);
      ps.setString(2, messageId);
      ps.setString(3, consumerName);
    });
  }

  public void completeExportJob(UUID exportJobId, String artifactUri) {
    String sql = """
        UPDATE export_jobs
        SET status = 'COMPLETED', artifact_uri = ?, updated_at = now()
        WHERE id = ?
        """;
    executeUpdate(sql, ps -> {
      ps.setString(1, artifactUri);
      ps.setObject(2, exportJobId);
    });
  }

  public void failExportJob(UUID exportJobId, String errorMessage) {
    String sql = """
        UPDATE export_jobs
        SET status = 'FAILED', error_message = ?, updated_at = now()
        WHERE id = ?
        """;
    executeUpdate(sql, ps -> {
      ps.setString(1, errorMessage);
      ps.setObject(2, exportJobId);
    });
  }

  public void insertDlqEvent(
      String originalTopic,
      String dlqTopic,
      String consumerName,
      String messageId,
      UUID sagaId,
      UUID correlationId,
      String failureClass,
      String failureMessage,
      int retryCount,
      boolean replayEligible,
      String payload,
      String headers
  ) {
    UUID id = UUID.randomUUID();
    String sql = """
        INSERT INTO dlq_events (
          id, original_topic, dlq_topic, consumer_name, message_id, saga_id, correlation_id,
          failure_class, failure_message, retry_count, replay_eligible, payload, headers
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb)
        """;
    executeUpdate(sql, ps -> {
      ps.setObject(1, id);
      ps.setString(2, originalTopic);
      ps.setString(3, dlqTopic);
      ps.setString(4, consumerName);
      ps.setString(5, messageId);
      ps.setObject(6, sagaId);
      ps.setObject(7, correlationId);
      ps.setString(8, failureClass);
      ps.setString(9, failureMessage);
      ps.setInt(10, retryCount);
      ps.setBoolean(11, replayEligible);
      ps.setString(12, payload);
      ps.setString(13, headers);
    });
  }

  public List<ExportJobListItem> listExportJobs() {
    String sql = """
        SELECT
          ej.id,
          ej.saga_id,
          ej.agent_version_id,
          a.name AS agent_name,
          av.version,
          ej.status,
          ej.target_format,
          ej.artifact_uri,
          ej.error_message,
          ej.updated_at
        FROM export_jobs ej
        JOIN agent_versions av ON av.id = ej.agent_version_id
        JOIN agents a ON a.id = av.agent_id
        ORDER BY ej.updated_at DESC
        """;
    List<ExportJobListItem> jobs = new ArrayList<>();
    try (Connection connection = dataSource.getConnection();
         PreparedStatement ps = connection.prepareStatement(sql);
         ResultSet rs = ps.executeQuery()) {
      while (rs.next()) {
        jobs.add(new ExportJobListItem(
            rs.getObject("id", UUID.class),
            rs.getObject("saga_id", UUID.class),
            rs.getObject("agent_version_id", UUID.class),
            rs.getString("agent_name"),
            rs.getString("version"),
            rs.getString("status"),
            rs.getString("target_format"),
            rs.getString("artifact_uri"),
            rs.getString("error_message"),
            rs.getObject("updated_at", OffsetDateTime.class)
        ));
      }
      return jobs;
    } catch (SQLException e) {
      throw new RegistryStorageException("Failed to list export jobs", e);
    }
  }

  public List<DlqListItem> listDlqEvents() {
    String sql = """
        SELECT id, original_topic, dlq_topic, consumer_name, failure_class, failure_message,
               retry_count, replay_eligible, dead_lettered_at
        FROM dlq_events
        WHERE replayed_at IS NULL
        ORDER BY dead_lettered_at DESC
        """;
    List<DlqListItem> events = new ArrayList<>();
    try (Connection connection = dataSource.getConnection();
         PreparedStatement ps = connection.prepareStatement(sql);
         ResultSet rs = ps.executeQuery()) {
      while (rs.next()) {
        events.add(new DlqListItem(
            rs.getObject("id", UUID.class),
            rs.getString("original_topic"),
            rs.getString("dlq_topic"),
            rs.getString("consumer_name"),
            rs.getString("failure_class"),
            rs.getString("failure_message"),
            rs.getInt("retry_count"),
            rs.getBoolean("replay_eligible"),
            rs.getObject("dead_lettered_at", OffsetDateTime.class)
        ));
      }
      return events;
    } catch (SQLException e) {
      throw new RegistryStorageException("Failed to list DLQ events", e);
    }
  }

  public boolean markDlqEventReplayed(UUID dlqEventId) {
    String sql = """
        UPDATE dlq_events
        SET replayed_at = now()
        WHERE id = ? AND replay_eligible = true AND replayed_at IS NULL
        """;
    try (Connection connection = dataSource.getConnection();
         PreparedStatement ps = connection.prepareStatement(sql)) {
      ps.setObject(1, dlqEventId);
      return ps.executeUpdate() == 1;
    } catch (SQLException e) {
      throw new RegistryStorageException("Failed to mark DLQ event for replay", e);
    }
  }

  private UUID loadTenantIdForAgentVersion(UUID agentId, UUID agentVersionId) {
    String sql = """
        SELECT a.tenant_id
        FROM agents a
        JOIN agent_versions av ON av.agent_id = a.id
        WHERE a.id = ? AND av.id = ?
        """;
    try (Connection connection = dataSource.getConnection();
         PreparedStatement ps = connection.prepareStatement(sql)) {
      ps.setObject(1, agentId);
      ps.setObject(2, agentVersionId);
      try (ResultSet rs = ps.executeQuery()) {
        if (!rs.next()) {
          throw new RegistryNotFoundException("Agent version not found for agent");
        }
        return rs.getObject("tenant_id", UUID.class);
      }
    } catch (SQLException e) {
      throw new RegistryStorageException("Failed to validate agent version", e);
    }
  }

  private void insertExportJob(Connection connection, UUID exportJobId, UUID agentVersionId, UUID sagaId, String targetFormat, UUID requestedBy) throws SQLException {
    String sql = """
        INSERT INTO export_jobs (id, agent_version_id, saga_id, requested_by, status, target_format)
        VALUES (?, ?, ?, ?, 'PENDING', ?)
        """;
    try (PreparedStatement ps = connection.prepareStatement(sql)) {
      ps.setObject(1, exportJobId);
      ps.setObject(2, agentVersionId);
      ps.setObject(3, sagaId);
      ps.setObject(4, requestedBy);
      ps.setString(5, targetFormat);
      ps.executeUpdate();
    }
  }

  private void insertExportRequestedOutboxEvent(
      Connection connection,
      UUID outboxId,
      UUID messageId,
      UUID sagaId,
      UUID exportJobId,
      UUID agentId,
      UUID agentVersionId,
      UUID tenantId,
      String targetFormat,
      UUID requestedBy
  ) throws Exception {
    String payload = objectMapper.writeValueAsString(Map.of(
        "exportJobId", exportJobId,
        "agentId", agentId,
        "agentVersionId", agentVersionId,
        "tenantId", tenantId,
        "targetFormat", targetFormat,
        "requestedBy", requestedBy
    ));
    String headers = objectMapper.writeValueAsString(Map.of(
        "messageId", messageId,
        "sagaId", sagaId,
        "correlationId", sagaId,
        "schemaVersion", "1.0"
    ));
    String sql = """
        INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, topic, payload, headers)
        VALUES (?, 'agent_version', ?, 'agent.export.requested', 'agent.export.requested', ?::jsonb, ?::jsonb)
        """;
    try (PreparedStatement ps = connection.prepareStatement(sql)) {
      ps.setObject(1, outboxId);
      ps.setObject(2, agentVersionId);
      ps.setString(3, payload);
      ps.setString(4, headers);
      ps.executeUpdate();
    }
  }

  private void executeUpdate(String sql, StatementBinder binder) {
    try (Connection connection = dataSource.getConnection();
         PreparedStatement ps = connection.prepareStatement(sql)) {
      binder.bind(ps);
      ps.executeUpdate();
    } catch (SQLException e) {
      throw new RegistryStorageException("Registry database write failed", e);
    }
  }

  @FunctionalInterface
  private interface StatementBinder {
    void bind(PreparedStatement preparedStatement) throws SQLException;
  }

  public record OutboxEvent(UUID id, String topic, String payload, String headers) {
  }

  public static class RegistryStorageException extends RuntimeException {
    public RegistryStorageException(String message, Throwable cause) {
      super(message, cause);
    }
  }

  public static class RegistryNotFoundException extends RuntimeException {
    public RegistryNotFoundException(String message) {
      super(message);
    }
  }
}
