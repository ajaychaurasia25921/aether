'use client';

import { useSyncExternalStore } from 'react';
import type { AgentDetail, RuntimeExecution } from '@/lib/types';

export interface AegisState {
  selectedAgent?: AgentDetail;
  executions: RuntimeExecution[];
  selectedExecutionId?: string;
  exportFormat: 'OCI_BUNDLE' | 'DOCKER' | 'KUBERNETES' | 'HELM';
}

const initialState: AegisState = {
  executions: [],
  exportFormat: 'OCI_BUNDLE',
};

let state = initialState;
const listeners = new Set<() => void>();

export function getAegisState() {
  return state;
}

export function setAegisState(update: Partial<AegisState>) {
  state = { ...state, ...update };
  listeners.forEach((listener) => listener());
}

export function useAegisStore<T>(selector: (value: AegisState) => T): T {
  return useSyncExternalStore(
      subscribe,
      () => selector(state),
      () => selector(initialState)
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
