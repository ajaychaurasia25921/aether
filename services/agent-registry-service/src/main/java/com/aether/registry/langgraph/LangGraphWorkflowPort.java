package com.aether.registry.langgraph;

public interface LangGraphWorkflowPort {
  LangGraphCompiledArtifact compile(LangGraphCompileRequest request);

  void validate(LangGraphCompileRequest request);
}
