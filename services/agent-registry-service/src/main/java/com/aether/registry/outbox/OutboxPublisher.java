package com.aether.registry.outbox;

import com.aether.registry.messaging.EventEnvelope;
import com.aether.registry.persistence.RegistryRepository;
import com.aether.registry.persistence.RegistryRepository.OutboxEvent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.scheduler.Scheduled;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.jboss.logging.Logger;

@ApplicationScoped
public class OutboxPublisher {
  private static final Logger LOG = Logger.getLogger(OutboxPublisher.class);
  private static final int BATCH_SIZE = 25;

  private final RegistryRepository repository;
  private final ObjectMapper objectMapper;
  private final Emitter<String> exportRequestedEmitter;

  public OutboxPublisher(
      RegistryRepository repository,
      ObjectMapper objectMapper,
      @Channel("agent-export-requested") Emitter<String> exportRequestedEmitter
  ) {
    this.repository = repository;
    this.objectMapper = objectMapper;
    this.exportRequestedEmitter = exportRequestedEmitter;
  }

  @Scheduled(every = "5s", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
  void publishPendingEvents() {
    List<OutboxEvent> events = repository.findPendingOutboxEvents(BATCH_SIZE);
    for (OutboxEvent event : events) {
      publish(event)
          .subscribe()
          .with(
              ignored -> repository.markOutboxEventPublished(event.id()),
              failure -> handlePublishFailure(event, failure)
          );
    }
  }

  private Uni<Void> publish(OutboxEvent event) {
    if (!"agent.export.requested".equals(event.topic())) {
      LOG.warnf("Unsupported outbox topic %s for event %s", event.topic(), event.id());
      repository.markOutboxEventFailed(event.id());
      return Uni.createFrom().voidItem();
    }
    return Uni.createFrom().item(() -> serializeEnvelope(event))
        .onItem()
        .transformToUni(payload -> Uni.createFrom().completionStage(exportRequestedEmitter.send(payload)))
        .replaceWithVoid();
  }

  private void handlePublishFailure(OutboxEvent event, Throwable failure) {
    LOG.errorf(failure, "Failed to publish outbox event %s to topic %s", event.id(), event.topic());
  }

  private String serializeEnvelope(OutboxEvent event) {
    try {
      JsonNode headers = objectMapper.readTree(event.headers());
      JsonNode payload = objectMapper.readTree(event.payload());
      EventEnvelope envelope = new EventEnvelope(
          UUID.fromString(requiredHeader(headers, "messageId")),
          UUID.fromString(requiredHeader(headers, "sagaId")),
          UUID.fromString(requiredHeader(headers, "correlationId")),
          requiredHeader(headers, "schemaVersion"),
          event.topic(),
          payload,
          Map.of(
              "messageId", requiredHeader(headers, "messageId"),
              "sagaId", requiredHeader(headers, "sagaId"),
              "correlationId", requiredHeader(headers, "correlationId"),
              "schemaVersion", requiredHeader(headers, "schemaVersion")
          )
      );
      return objectMapper.writeValueAsString(envelope);
    } catch (Exception e) {
      throw new IllegalArgumentException("Outbox event " + event.id() + " cannot be serialized", e);
    }
  }

  private String requiredHeader(JsonNode headers, String fieldName) {
    if (!headers.hasNonNull(fieldName)) {
      throw new IllegalArgumentException("Missing outbox header " + fieldName);
    }
    return headers.get(fieldName).asText();
  }
}
