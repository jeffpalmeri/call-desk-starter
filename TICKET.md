# DESK-412: Agents stuck "ringing" after Tuesday's deploy

**Reported by:** Support
**Priority:** High

## What happened

During Tuesday's deploy the call service was restarting from 14:02 to 14:04 UTC. Three
customers hung up while they were being transferred in that window.

Since then the three agents those transfers were ringing have shown as "ringing" in the
directory, so they are not offered any calls. Their phones are not ringing. Support has been
clearing them by hand as they notice. Two of the three have been cleared and are taking calls
again; the third is still stuck.

## What we see

The provider's log shows all three calls closed at 14:03.

Our log has this once a minute for each of the three calls, and it has not stopped:

```
sweep: could not end leg leg-88213 Error: Failed to unhold leg leg-88207 via provider
```

## What we need

Agents must not get stuck like this, and it must not need anyone to clean up by hand.

One note from the support lead: "Please be careful with anything touching hold. A customer
sitting on hold with nobody coming back to them is the worst thing we do to people."
