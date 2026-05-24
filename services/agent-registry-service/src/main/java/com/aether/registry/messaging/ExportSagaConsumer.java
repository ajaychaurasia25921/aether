package com.aether.registry.messaging;

import com.aether.registry.inbox.InboxService;
import com.aether.registry.persistence.RegistryRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smallrye.reactive.messaging.annotations.Blocking;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.UUID;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.jboss.logging.Logger;

@ApplicationScoped
public class ExportSagaConsumer {
  private static final Logger LOG = Logger.getLogger(ExportSagaConsumer.class);
  private static final String CONSUMER_NAME = "agent-registry-export-saga-consumer";

  private final ObjectMapper objectMapper;
  private final InboxService inboxService;
  private final RegistryRepository repository;
  private final DlqRouter dlqRouter;

  public ExportSagaConsumer(
      ObjectMapper objectMapper,
      InboxService inboxService,
      RegistryRepository repository,
      DlqRouter dlqRouter
  ) {
    this.objectMapper = objectMapper;
    this.inboxService = inboxService;
    this.repository = repository;
    this.dlqRouter = dlqRouter;
  }

  @Incoming("agent-export-completed")
  @Blocking
  public void consumeCompleted(String rawMessage) {
    consume(rawMessage, true);
  }

  @Incoming("agent-export-failed")
  @Blocking
  public void consumeFailed(String rawMessage) {
    consume(rawMessage, false);
  }

  private void consume(String rawMessage, boolean completed) {
    EventEnvelope envelope = parse(rawMessage);
    String messageId = envelope.messageId().toString();
    if (!inboxService.beginProcessing(messageId, envelope.topic(), CONSUMER_NAME, rawMessage)) {
      inboxService.markIgnored(messageId, CONSUMER_NAME);
      LOG.debugf("Ignored duplicate event %s from topic %s", messageId, envelope.topic());
      return;
    }

    try {
      UUID exportJobId = requiredUuid(envelope, "exportJobId");
      if (completed) {
        String artifactUri = requiredText(envelope, "artifactUri");
        repository.completeExportJob(exportJobId, artifactUri);
      } else {
        String errorMessage = requiredText(envelope, "errorMessage");
        repository.failExportJob(exportJobId, errorMessage);
      }
      inboxService.markProcessed(messageId, CONSUMER_NAME);
    } catch (Exception e) {
      inboxService.markFailed(messageId, CONSUMER_NAME, e.getMessage());
      dlqRouter.route(envelope, CONSUMER_NAME, e);
    }
  }

  private EventEnvelope parse(String rawMessage) {
    try {
      return objectMapper.readValue(rawMessage, EventEnvelope.class);
    } catch (Exception e) {
      throw new IllegalArgumentException("Event envelope is not valid JSON", e);
    }
  }

  private UUID requiredUuid(EventEnvelope envelope, String fieldName) {
    String value = requiredText(envelope, fieldName);
    try {
      return UUID.fromString(value);
    } catch (IllegalArgumentException e) {
      throw new IllegalArgumentException("Payload field " + fieldName + " must be a UUID", e);
    }
  }

  private String requiredText(EventEnvelope envelope, String fieldName) {
    if (!envelope.payload().hasNonNull(fieldName)) {
      throw new IllegalArgumentException("Payload field " + fieldName + " is required");
    }
    return envelope.payload().get(fieldName).asText();
  }
}
