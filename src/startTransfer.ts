import type { Deps } from './deps';

/**
 * An agent on a call asks a second agent to take it over: the customer is put
 * on hold and the second agent's phone rings.
 */
export async function startTransfer(
  deps: Deps,
  callId: string,
  fromAgentId: string,
  toAgentId: string,
): Promise<void> {
  const call = await deps.calls.load(callId);
  if (!call || call.status === 'ended') {
    throw new Error(`Call ${callId} is not active`);
  }
  if (call.transfer) {
    throw new Error(`Call ${callId} already has a transfer in flight`);
  }
  if (deps.directory.get(toAgentId).status !== 'available') {
    throw new Error(`Agent ${toAgentId} is not available`);
  }
  const customer = call.legs.find((leg) => leg.role === 'customer' && leg.status === 'connected');
  if (!customer) {
    throw new Error(`Call ${callId} has no connected customer to hold`);
  }

  await deps.provider.hold(customer.id);
  customer.status = 'held';

  const toLegId = await deps.provider.dialAgent(call.id, toAgentId);
  call.legs.push({
    id: toLegId,
    role: 'agent',
    agentId: toAgentId,
    status: 'ringing',
    ringingSince: deps.now(),
  });
  call.transfer = { fromAgentId, toAgentId, toLegId, heldLegIds: [customer.id] };
  deps.directory.setRinging(toAgentId, call.id);

  await deps.calls.save(call, call.version);
  deps.log.info(`transfer: ${fromAgentId} is transferring call ${callId} to ${toAgentId}`);
}
