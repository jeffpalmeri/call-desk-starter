export type LegRole = 'customer' | 'agent';

export type LegStatus = 'ringing' | 'connected' | 'held' | 'ended';

/** One party's connection to a call. The id is the provider's id for it. */
export interface Leg {
  id: string;
  role: LegRole;
  agentId?: string;
  status: LegStatus;
  ringingSince?: number;
}

/** A transfer that has been started and not yet answered or given up. */
export interface Transfer {
  fromAgentId: string;
  toAgentId: string;
  toLegId: string;
  heldLegIds: string[];
}

export interface Call {
  id: string;
  version: number;
  status: 'active' | 'ended';
  legs: Leg[];
  transfer?: Transfer;
}
