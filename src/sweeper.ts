import { completeLeg } from './completeLeg';
import type { Deps } from './deps';

export const RING_TIMEOUT_MS = 45_000;
export const SWEEP_GRACE_MS = 30_000;

/**
 * Runs once a minute. The provider stops a ring after RING_TIMEOUT_MS and
 * tells us; a leg still ringing in our records well past that means the
 * message never reached us, so the leg is ended here.
 */
export async function sweepStaleRings(deps: Deps): Promise<number> {
  const cutoff = deps.now() - RING_TIMEOUT_MS - SWEEP_GRACE_MS;
  let ended = 0;
  for (const call of await deps.calls.listActive()) {
    for (const leg of call.legs) {
      if (leg.status !== 'ringing' || leg.ringingSince === undefined || leg.ringingSince > cutoff) {
        continue;
      }
      try {
        await completeLeg(deps, call.id, leg.id);
        ended += 1;
      } catch (error) {
        deps.log.error(`sweep: could not end leg ${leg.id}`, error);
      }
    }
  }
  return ended;
}
