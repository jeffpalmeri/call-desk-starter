import type { Deps } from './deps';
import type { Call, Leg, Transfer } from './types';

/**
 * Records that a leg is over. A transfer in flight is given up when the agent
 * it was ringing or the party it was holding leaves. The call ends with its
 * last leg.
 */
export async function completeLeg(deps: Deps, callId: string, legId: string): Promise<void> {
  const call = await deps.calls.load(callId);
  const leg = call?.legs.find((each) => each.id === legId);
  if (!call || !leg || leg.status === 'ended') {
    return;
  }

  leg.status = 'ended';

  if (call.transfer && endsTransfer(call.transfer, leg)) {
    await giveUpTransfer(deps, call, call.transfer);
  }
  if (leg.agentId) {
    deps.directory.release(leg.agentId);
  }
  if (call.legs.every((each) => each.status === 'ended')) {
    call.status = 'ended';
  }

  await deps.calls.save(call);
  deps.log.info(`call ${callId}: leg ${legId} ended`);
}

function endsTransfer(transfer: Transfer, leg: Leg): boolean {
  return leg.id === transfer.toLegId || transfer.heldLegIds.includes(leg.id);
}

async function giveUpTransfer(deps: Deps, call: Call, transfer: Transfer): Promise<void> {
  for (const heldLegId of transfer.heldLegIds) {
    const held = call.legs.find((each) => each.id === heldLegId);
    if (held?.status !== 'held') {
      continue;
    }
    await deps.provider.unhold(held.id);
    held.status = 'connected';
  }
  deps.directory.release(transfer.toAgentId);
  call.transfer = undefined;
}
