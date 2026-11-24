import { describe, expect, it } from 'vitest';
import { handleLegStatus } from '../src/webhook';
import { buildDesk, legStatus, seedCall } from './support/desk';

describe('POST /provider/leg-status', () => {
  it('ignores a status that does not end the leg', async () => {
    const desk = buildDesk();
    const call = await seedCall(desk, 'call-1', 'alice');

    const receipt = await handleLegStatus(desk.deps, {
      callId: call.callId,
      legId: call.agentLegId,
      status: 'in-progress',
    });

    expect(receipt.status).toBe(200);
    expect(await legStatus(desk, call.callId, call.agentLegId)).toBe('connected');
  });

  it('ends the call with its last leg and frees the agent', async () => {
    const desk = buildDesk();
    const call = await seedCall(desk, 'call-1', 'alice');

    await handleLegStatus(desk.deps, {
      callId: call.callId,
      legId: call.customerLegId,
      status: 'completed',
    });
    expect((await desk.deps.calls.load(call.callId))?.status).toBe('active');

    await handleLegStatus(desk.deps, {
      callId: call.callId,
      legId: call.agentLegId,
      status: 'completed',
    });
    expect((await desk.deps.calls.load(call.callId))?.status).toBe('ended');
    expect(desk.deps.directory.get('alice')).toEqual({ status: 'available' });
  });

  it('accepts the same end twice', async () => {
    const desk = buildDesk();
    const call = await seedCall(desk, 'call-1', 'alice');
    const callback = { callId: call.callId, legId: call.agentLegId, status: 'completed' };

    await handleLegStatus(desk.deps, callback);
    const versionAfterFirst = (await desk.deps.calls.load(call.callId))?.version;
    const receipt = await handleLegStatus(desk.deps, callback);

    expect(receipt.status).toBe(200);
    expect((await desk.deps.calls.load(call.callId))?.version).toBe(versionAfterFirst);
  });

  it('accepts an end for a call it does not know', async () => {
    const desk = buildDesk();

    const receipt = await handleLegStatus(desk.deps, {
      callId: 'call-404',
      legId: 'leg-404',
      status: 'completed',
    });

    expect(receipt.status).toBe(200);
  });
});
