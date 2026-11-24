import { AgentDirectory } from '../../src/agentDirectory';
import { CallStore } from '../../src/callStore';
import type { Deps } from '../../src/deps';
import { HttpProvider } from '../../src/provider';
import type { ProviderRequest, ProviderResponse, Transport } from '../../src/provider';

/** The provider's REST API, in memory: it knows which legs exist and which are held. */
export class FakeProvider {
  readonly requests: ProviderRequest[] = [];
  private readonly legs = new Map<string, { held: boolean }>();
  private nextLegNumber = 1;

  readonly transport: Transport = async (request): Promise<ProviderResponse> => {
    this.requests.push(request);
    if (/^\/calls\/[^/]+\/legs$/.test(request.path)) {
      return { status: 201, body: { legId: this.addLeg() } };
    }
    const action = /^\/legs\/([^/]+)\/(hold|unhold)$/.exec(request.path);
    if (!action) {
      return { status: 400 };
    }
    const leg = this.legs.get(action[1] ?? '');
    if (!leg) {
      return { status: 404 };
    }
    leg.held = action[2] === 'hold';
    return { status: 200 };
  };

  addLeg(): string {
    const legId = `leg-${this.nextLegNumber}`;
    this.nextLegNumber += 1;
    this.legs.set(legId, { held: false });
    return legId;
  }

  /** The party hung up, or the provider ended the leg. */
  hangUp(legId: string): void {
    this.legs.delete(legId);
  }

  isHeld(legId: string): boolean {
    return this.legs.get(legId)?.held ?? false;
  }

  sent(path: string): number {
    return this.requests.filter((request) => request.path === path).length;
  }
}

export interface Desk {
  deps: Deps;
  provider: FakeProvider;
  advance(ms: number): void;
}

export function buildDesk(): Desk {
  const provider = new FakeProvider();
  let now = Date.UTC(2026, 0, 6, 14, 0, 0);
  const deps: Deps = {
    calls: new CallStore(),
    directory: new AgentDirectory(),
    provider: new HttpProvider(provider.transport),
    log: { info: () => undefined, error: () => undefined },
    now: () => now,
  };
  return {
    deps,
    provider,
    advance: (ms) => {
      now += ms;
    },
  };
}

export interface SeededCall {
  callId: string;
  customerLegId: string;
  agentLegId: string;
}

/** A customer talking to one agent. */
export async function seedCall(desk: Desk, callId: string, agentId: string): Promise<SeededCall> {
  const customerLegId = desk.provider.addLeg();
  const agentLegId = desk.provider.addLeg();
  await desk.deps.calls.save({
    id: callId,
    version: 0,
    status: 'active',
    legs: [
      { id: customerLegId, role: 'customer', status: 'connected' },
      { id: agentLegId, role: 'agent', agentId, status: 'connected' },
    ],
  });
  desk.deps.directory.setOnCall(agentId, callId);
  return { callId, customerLegId, agentLegId };
}

export async function legStatus(desk: Desk, callId: string, legId: string): Promise<string> {
  const call = await desk.deps.calls.load(callId);
  const leg = call?.legs.find((each) => each.id === legId);
  if (!leg) {
    throw new Error(`No leg ${legId} on call ${callId}`);
  }
  return leg.status;
}
