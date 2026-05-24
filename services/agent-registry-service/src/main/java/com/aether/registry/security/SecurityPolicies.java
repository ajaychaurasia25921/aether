package com.aether.registry.security;

import java.util.Set;

public final class SecurityPolicies {
  public static final String CLIENT_SCOPE_AGENT_READ = "agent:read";
  public static final String CLIENT_SCOPE_AGENT_EXPORT = "agent:export";
  public static final String CLIENT_SCOPE_EVENT_PUBLISH = "event:publish";

  public static final Set<String> AGENT_WRITE_ROLES = Set.of("platform-admin", "tenant-admin", "agent-designer");
  public static final Set<String> EXPORT_ROLES = Set.of("platform-admin", "tenant-admin", "agent-designer", "operator");
  public static final Set<String> READ_ROLES = Set.of(
      "platform-admin",
      "tenant-admin",
      "agent-designer",
      "operator",
      "auditor",
      "viewer"
  );

  private SecurityPolicies() {
  }
}
