import type { AgentDirectory } from './agentDirectory';
import type { CallStore } from './callStore';
import type { Provider } from './provider';

export interface Logger {
  info(message: string): void;
  error(message: string, error?: unknown): void;
}

export interface Deps {
  calls: CallStore;
  directory: AgentDirectory;
  provider: Provider;
  log: Logger;
  now: () => number;
}
