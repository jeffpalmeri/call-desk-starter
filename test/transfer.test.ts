import { describe, expect, it } from 'vitest';
import { startTransfer } from '../src/startTransfer';
import { handleLegStatus } from '../src/webhook';
import { buildDesk, legStatus, seedCall } from './support/desk';

async function transferInFlight() {
  const desk = buildDesk();
  const call = await seedCall(desk, 'call-1', 'alice');
  await startTransfer(desk.deps, call.callId, 'alice', 'bob');
  const stored = await desk.deps.calls.load(call.callId);
  const bobLegId = stored?.transfer?.toLegId ?? '';
  return { desk, ...call, bobLegId };
}

describe('starting a transfer', () => {
  it('holds the customer and rings the second agent', async () => {
    const { desk, callId, customerLegId, bobLegId } = await transferInFlight();

    expect(desk.provider.isHeld(customerLegId)).toBe(true);
    expect(await legStatus(desk, callId, customerLegId)).toBe('held');
    expect(await legStatus(desk, callId, bobLegId)).toBe('ringing');
    expect(desk.deps.directory.get('bob')).toEqual({ status: 'ringing', callId });
  });

  it('refuses an agent who is not available', async () => {
    const desk = buildDesk();
    const call = await seedCall(desk, 'call-1', 'alice');
    desk.deps.directory.setOnCall('bob', 'call-9');

    await expect(startTransfer(desk.deps, call.callId, 'alice', 'bob')).rejects.toThrow(
      'Agent bob is not available',
    );
    expect(desk.provider.isHeld(call.customerLegId)).toBe(false);
  });

  it('refuses a second transfer while one is in flight', async () => {
    const { desk, callId } = await transferInFlight();

    await expect(startTransfer(desk.deps, callId, 'alice', 'carol')).rejects.toThrow(
      'already has a transfer in flight',
    );
  });
});

describe('giving up a transfer', () => {
  it('takes the customer off hold when the second agent declines', async () => {
    const { desk, callId, customerLegId, bobLegId } = await transferInFlight();

    desk.provider.hangUp(bobLegId);
    const receipt = await handleLegStatus(desk.deps, { callId, legId: bobLegId, status: 'busy' });

    expect(receipt.status).toBe(200);
    expect(desk.provider.isHeld(customerLegId)).toBe(false);
    expect(await legStatus(desk, callId, customerLegId)).toBe('connected');
    expect(desk.deps.directory.get('bob')).toEqual({ status: 'available' });
    expect((await desk.deps.calls.load(callId))?.transfer).toBeUndefined();
  });

  it('frees the second agent when the customer hangs up', async () => {
    const { desk, callId, customerLegId } = await transferInFlight();

    desk.provider.hangUp(customerLegId);
    const receipt = await handleLegStatus(desk.deps, {
      callId,
      legId: customerLegId,
      status: 'completed',
    });

    expect(receipt.status).toBe(200);
    expect(desk.deps.directory.get('bob')).toEqual({ status: 'available' });
    expect(desk.provider.sent(`/legs/${customerLegId}/unhold`)).toBe(0);
  });

  it('leaves the transfer alone when the first agent hangs up', async () => {
    const { desk, callId, agentLegId, bobLegId } = await transferInFlight();

    desk.provider.hangUp(agentLegId);
    await handleLegStatus(desk.deps, { callId, legId: agentLegId, status: 'completed' });

    expect(desk.deps.directory.get('alice')).toEqual({ status: 'available' });
    expect(await legStatus(desk, callId, bobLegId)).toBe('ringing');
    expect((await desk.deps.calls.load(callId))?.transfer?.toAgentId).toBe('bob');
  });
});
