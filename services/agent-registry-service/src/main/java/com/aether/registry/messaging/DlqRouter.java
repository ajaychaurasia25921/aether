package com.aether.registry.messaging;

import com.aether.registry.persistence.RegistryRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Map;
import java.util.UUID;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.jboss.logging.Logger;

@ApplicationScoped
public class DlqRouter {
  private static final Logger LOG = Logger.getLogger(DlqRouter.class);
  private static final String DLQ_TOPIC = "agent.export.dlq";

  private final RegistryRepository repository;
  private final ObjectMapper objectMapper;
  private final Emitter<String> dlqEmitter;

  public DlqRouter(
      RegistryRepository repository,
      ObjectMapper objectMapper,
      @Channel("agent-export-dlq") Emitter<String> dlqEmitter
  ) {
    this.repository = repository;
    this.objectMapper = objectMapper;
    this.dlqEmitter = dlqEmitter;
  }

  public void route(EventEnvelope envelope, String consumerName, Throwable failure) {
    String failureClass = failure.getClass().getSimpleName();
    String failureMessage = failure.getMessage() == null ? failureClass : failure.getMessage();
    boolean replayEligible = isReplayEligible(failure);
    try {
      String payload = objectMapper.writeValueAsString(envelope.payload());
      String headers = objectMapper.writeValueAsString(envelope.headers());
      repository.insertDlqEvent(
          envelope.topic(),
          DLQ_TOPIC,
          consumerName,
          envelope.messageId().toString(),
          envelope.sagaId(),
          envelope.correlationId(),
          failureClass,
          failureMessage,
          1,
          replayEligible,
          payload,
          headers
      );
      String dlqPayload = objectMapper.writeValueAsString(Map.of(
          "originalTopic", envelope.topic(),
          "messageId", envelope.messageId(),
          "sagaId", envelope.sagaId(),
          "correlationId", envelope.correlationId(),
          "consumerName", consumerName,
          "failureClass", failureClass,
          "failureMessage", failureMessage,
          "replayEligible", replayEligible,
          "payload", envelope.payload()
      ));
      Uni.createFrom().completionStage(dlqEmitter.send(dlqPayload))
          .subscribe()
          .with(ignored -> { }, sendFailure -> LOG.errorf(sendFailure, "Failed to publish DLQ event"));
    } catch (Exception e) {
      LOG.errorf(e, "Failed to route message %s to DLQ", envelope.messageId());
    }
  }

  private boolean isReplayEligible(Throwable failure) {
    return !(failure instanceof IllegalArgumentException);
  }
}
