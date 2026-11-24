# call-desk

The part of a phone system that keeps track of live calls for a support team: who is on each
call, who is on hold, and which agents can be offered the next one.

This is a cut-down service for a working session. The HTTP server, the database and the
scheduler are left out; the functions they would call are here, with an in-memory store.

## Running it

```bash
npm install
npm test
npm run typecheck
npm run demo        # plays one ordinary transfer and prints the records at each step
```

## How it fits together

A **call** has **legs**, one per party: the customer and each agent. The telephony provider
owns the real audio. We tell it what to do through its REST API (`src/provider.ts`) and it
tells us what happened by calling our webhook (`src/webhook.ts`).

| File                    | What it does                                                                |
| ----------------------- | --------------------------------------------------------------------------- |
| `src/startTransfer.ts`  | An agent hands a call to a second agent: hold the customer, ring the agent  |
| `src/completeLeg.ts`    | Records that a leg is over, gives up a transfer in flight, ends the call    |
| `src/webhook.ts`        | `POST /provider/leg-status`, the provider's report of each leg change       |
| `src/sweeper.ts`        | Runs once a minute; ends legs that are still ringing long after they should |
| `src/agentDirectory.ts` | Which agents are available, ringing or on a call                            |
| `src/callStore.ts`      | Stands in for the calls table                                               |

Answering a transfer is handled by another service and is not in this repo.

## What the provider does

- When the customer hangs up, the provider ends every other leg of that call itself.
- It reports each leg's end to `POST /provider/leg-status`. A 2xx answer is the receipt. On
  any other answer it tries again 3 more times over about a minute, then drops the message.
- REST answers: `200` done, `404` the leg no longer exists, `429` or `5xx` try again later.
- `unhold` on a leg that is not on hold answers `200`.
- It stops a ring after 45 seconds and reports the leg as `no-answer`.

## The task

See `TICKET.md`.
