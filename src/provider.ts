export interface ProviderRequest {
  method: 'POST';
  path: string;
  body?: Record<string, string>;
}

export interface ProviderResponse {
  status: number;
  body?: Record<string, string>;
}

/** Sends one request to the telephony provider's REST API. */
export type Transport = (request: ProviderRequest) => Promise<ProviderResponse>;

export interface Provider {
  /** Rings an agent into a call and returns the new leg's id. */
  dialAgent(callId: string, agentId: string): Promise<string>;
  hold(legId: string): Promise<void>;
  unhold(legId: string): Promise<void>;
}

export class HttpProvider implements Provider {
  constructor(private readonly send: Transport) {}

  async dialAgent(callId: string, agentId: string): Promise<string> {
    const response = await this.send({
      method: 'POST',
      path: `/calls/${callId}/legs`,
      body: { agentId },
    });
    const legId = response.body?.legId;
    if (response.status !== 201 || !legId) {
      throw new Error(`Failed to dial agent ${agentId} via provider`);
    }
    return legId;
  }

  async hold(legId: string): Promise<void> {
    const response = await this.send({ method: 'POST', path: `/legs/${legId}/hold` });
    if (response.status !== 200) {
      throw new Error(`Failed to hold leg ${legId} via provider`);
    }
  }

  async unhold(legId: string): Promise<void> {
    const response = await this.send({ method: 'POST', path: `/legs/${legId}/unhold` });
    if (response.status !== 200) {
      throw new Error(`Failed to unhold leg ${legId} via provider`);
    }
  }
}
