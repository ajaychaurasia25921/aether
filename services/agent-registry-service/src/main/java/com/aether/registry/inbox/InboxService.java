package com.aether.registry.inbox;

import com.aether.registry.persistence.RegistryRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@ApplicationScoped
public class InboxService {
  private final RegistryRepository repository;

  public InboxService(RegistryRepository repository) {
    this.repository = repository;
  }

  public boolean beginProcessing(String messageId, String topic, String consumerName, String payload) {
    return repository.recordInboxReceived(messageId, topic, consumerName, sha256(payload));
  }

  public void markProcessed(String messageId, String consumerName) {
    repository.markInboxProcessed(messageId, consumerName);
  }

  public void markFailed(String messageId, String consumerName, String errorMessage) {
    repository.markInboxFailed(messageId, consumerName, errorMessage);
  }

  public void markIgnored(String messageId, String consumerName) {
    repository.markInboxIgnored(messageId, consumerName);
  }

  private String sha256(String value) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      return "sha256:" + HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 digest is not available", e);
    }
  }
}
