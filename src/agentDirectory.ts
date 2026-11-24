export type AgentStatus = 'available' | 'ringing' | 'on_call';

export interface AgentEntry {
  status: AgentStatus;
  callId?: string;
}

/**
 * Who can be offered a call right now. Routing and the transfer picker read
 * this; an agent who is not 'available' is never offered a call.
 */
export class AgentDirectory {
  private readonly entries = new Map<string, AgentEntry>();

  get(agentId: string): AgentEntry {
    return this.entries.get(agentId) ?? { status: 'available' };
  }

  setRinging(agentId: string, callId: string): void {
    this.entries.set(agentId, { status: 'ringing', callId });
  }

  setOnCall(agentId: string, callId: string): void {
    this.entries.set(agentId, { status: 'on_call', callId });
  }

  release(agentId: string): void {
    this.entries.set(agentId, { status: 'available' });
  }
}
