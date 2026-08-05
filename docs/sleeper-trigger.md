# Sleeper Trigger behavior

The Sleeper Trigger polls Sleeper's documented public HTTP API. Sleeper does not document webhook
subscriptions for these events, so polling frequency should remain comfortably below Sleeper's
published rate guidance.

## Draft Pick Made

The node requests `GET /draft/{draft_id}/picks`, validates and sorts the complete response by
`pick_no`, and stores only a configuration fingerprint and the highest observed pick number.

- A manual test does not change production state. It previews the highest available pick, or
  returns no data when the draft has no picks.
- The first production poll establishes a baseline and emits nothing, preventing historical picks
  from firing when a workflow is activated.
- Later polls emit every pick above the saved maximum in ascending `pick_no` order. Reordered or
  identical API responses do not create duplicates, and gaps in pick numbers are allowed.
- Changing the event or Draft ID establishes a new baseline without replaying the previous
  configuration's records.
- If the current maximum falls below the saved maximum, the node treats the draft as reset,
  establishes the lower maximum as the new baseline, and emits nothing.
- Failed requests and malformed responses do not advance state.

Each emitted item keeps the raw draft-pick fields at the top level and adds only `event` and
`observed_at`. The trigger does not fetch the player map or join player, roster, team, or user data.
