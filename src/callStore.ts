import type { Call } from './types';

export class VersionConflictError extends Error {
  constructor(callId: string) {
    super(`Call ${callId} was changed by another writer`);
    this.name = 'VersionConflictError';
  }
}

/** Stands in for the calls table. Every read hands out a copy. */
export class CallStore {
  private readonly calls = new Map<string, Call>();

  async load(callId: string): Promise<Call | undefined> {
    const call = this.calls.get(callId);
    return call ? structuredClone(call) : undefined;
  }

  async listActive(): Promise<Call[]> {
    return [...this.calls.values()]
      .filter((call) => call.status === 'active')
      .map((call) => structuredClone(call));
  }

  /**
   * Writes the call and bumps its version. Pass the version you loaded to
   * have the write refused when another writer saved in between.
   */
  async save(call: Call, expectedVersion?: number): Promise<void> {
    const storedVersion = this.calls.get(call.id)?.version ?? 0;
    if (expectedVersion !== undefined && expectedVersion !== storedVersion) {
      throw new VersionConflictError(call.id);
    }
    this.calls.set(call.id, structuredClone({ ...call, version: storedVersion + 1 }));
  }
}
