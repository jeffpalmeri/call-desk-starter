import { completeLeg } from './completeLeg';
import type { Deps } from './deps';

export interface LegStatusCallback {
  callId: string;
  legId: string;
  status: string;
}

const ENDED_STATUSES = new Set(['completed', 'busy', 'no-answer', 'canceled', 'failed']);

/**
 * POST /provider/leg-status. The provider reports each change of a leg here
 * and reads our status code as the receipt.
 */
export async function handleLegStatus(
  deps: Deps,
  callback: LegStatusCallback,
): Promise<{ status: number }> {
  if (!ENDED_STATUSES.has(callback.status)) {
    return { status: 200 };
  }
  try {
    await completeLeg(deps, callback.callId, callback.legId);
    return { status: 200 };
  } catch (error) {
    deps.log.error(`leg-status: could not end leg ${callback.legId}`, error);
    return { status: 500 };
  }
}
