import { describe, expect, it } from 'vitest';
import { startTransfer } from '../src/startTransfer';
import { RING_TIMEOUT_MS, SWEEP_GRACE_MS, sweepStaleRings } from '../src/sweeper';
import { buildDesk, legStatus, seedCall } from './support/desk';

describe('sweeping stale rings', () => {
  it('leaves a leg that is still within its ring time', async () => {
    const desk = buildDesk();
    const call = await seedCall(desk, 'call-1', 'alice');
    await startTransfer(desk.deps, call.callId, 'alice', 'bob');

    desk.advance(RING_TIMEOUT_MS);

    expect(await sweepStaleRings(desk.deps)).toBe(0);
    expect(desk.deps.directory.get('bob').status).toBe('ringing');
  });

  it('ends a leg whose ring should have stopped long ago', async () => {
    const desk = buildDesk();
    const call = await seedCall(desk, 'call-1', 'alice');
    await startTransfer(desk.deps, call.callId, 'alice', 'bob');
    const bobLegId = (await desk.deps.calls.load(call.callId))?.transfer?.toLegId ?? '';

    desk.provider.hangUp(bobLegId);
    desk.advance(RING_TIMEOUT_MS + SWEEP_GRACE_MS + 1);

    expect(await sweepStaleRings(desk.deps)).toBe(1);
    expect(await legStatus(desk, call.callId, bobLegId)).toBe('ended');
    expect(await legStatus(desk, call.callId, call.customerLegId)).toBe('connected');
    expect(desk.deps.directory.get('bob')).toEqual({ status: 'available' });
  });
});
