// Plays one ordinary transfer and prints our records after each step.
// Run with: npm run demo
import type { Deps } from './src/deps';
import { startTransfer } from './src/startTransfer';
import { handleLegStatus } from './src/webhook';
import { buildDesk, seedCall } from './test/support/desk';

const desk = buildDesk();
const deps: Deps = {
  ...desk.deps,
  log: {
    info: (message) => console.log(`    log: ${message}`),
    error: (message, error) => console.log(`    log: ${message} ${String(error)}`),
  },
};

async function show(): Promise<void> {
  const call = await deps.calls.load('call-1');
  const legs = (call?.legs ?? [])
    .map((leg) => `${leg.agentId ?? 'customer'}=${leg.status}`)
    .join(', ');
  const agents = ['alice', 'bob']
    .map((agentId) => `${agentId}=${deps.directory.get(agentId).status}`)
    .join(', ');
  console.log(`    call:      ${call?.status}; ${legs}`);
  console.log(`    directory: ${agents}`);
}

console.log('1. A customer is talking to Alice.');
const call = await seedCall(desk, 'call-1', 'alice');
await show();

console.log('\n2. Alice starts a transfer to Bob.');
await startTransfer(deps, call.callId, 'alice', 'bob');
const bobLegId = (await deps.calls.load(call.callId))?.transfer?.toLegId ?? '';
await show();

console.log('\n3. Bob declines. The provider reports his leg as busy.');
desk.provider.hangUp(bobLegId);
await handleLegStatus(deps, { callId: call.callId, legId: bobLegId, status: 'busy' });
await show();

console.log('\n4. The customer hangs up. The provider ends both remaining legs and reports each.');
desk.provider.hangUp(call.customerLegId);
desk.provider.hangUp(call.agentLegId);
await handleLegStatus(deps, { callId: call.callId, legId: call.customerLegId, status: 'completed' });
await handleLegStatus(deps, { callId: call.callId, legId: call.agentLegId, status: 'completed' });
await show();
