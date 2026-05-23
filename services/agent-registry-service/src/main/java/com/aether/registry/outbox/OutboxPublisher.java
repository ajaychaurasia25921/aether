package com.aether.registry.outbox;

import com.aether.registry.persistence.RegistryRepository;
import com.aether.registry.persistence.RegistryRepository.OutboxEvent;
import io.quarkus.scheduler.Scheduled;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.jboss.logging.Logger;

@ApplicationScoped
public class OutboxPublisher {
  private static final Logger LOG = Logger.getLogger(OutboxPublisher.class);
  private static final int BATCH_SIZE = 25;

  private final RegistryRepository repository;
  private final Emitter<String> exportRequestedEmitter;

  public OutboxPublisher(
      RegistryRepository repository,
      @Channel("agent-export-requested") Emitter<String> exportRequestedEmitter
  ) {
    this.repository = repository;
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
    return Uni.createFrom().completionStage(exportRequestedEmitter.send(event.payload()))
        .replaceWithVoid();
  }

  private void handlePublishFailure(OutboxEvent event, Throwable failure) {
    LOG.errorf(failure, "Failed to publish outbox event %s to topic %s", event.id(), event.topic());
  }
}
