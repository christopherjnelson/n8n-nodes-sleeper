# Sleeper Trigger behavior

The Sleeper Trigger polls Sleeper's documented public HTTP API. Sleeper does not document webhook
subscriptions for these events, so this is not instant backend delivery and polling frequency
should remain comfortably below Sleeper's published rate guidance. Draft Pick Made, Transaction
Created or Updated, League Status Changed, and NFL Week Changed were introduced in `0.2.0` and are
available in current stable npm `0.2.1`. npm `latest` resolves to `0.2.1`, while `next` remains on
`0.2.0`. Creator Portal and n8n Cloud availability for `0.2.1` remain separate owner-managed,
unverified steps. Phase 2, Phase 3, and Phase 4 have not begun.

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
- The saved maximum is a monotonic watermark for the current configuration. Empty, incomplete, or
  lower responses emit nothing and never reduce it, preventing a later complete response from
  replaying previously emitted picks.
- Failed requests and malformed responses do not advance or reduce state.
- If a draft is genuinely cleared and restarted under the same Draft ID, reset the trigger state by
  changing its configuration or recreating the trigger before watching the restarted draft.

Each emitted item keeps the raw draft-pick fields at the top level and adds only `event` and
`observed_at`. Every item emitted by one poll shares the same observation timestamp. The trigger
does not fetch the player map or join player, roster, team, or user data.

## Transaction Created or Updated

Configure an explicit **League ID** and positive-integer **Round or Week**. The node trims the
League ID while preserving it as an opaque string and requests exactly one documented endpoint per
poll: `GET /league/{league_id}/transactions/{round}`. It does not query NFL state, so there is no
current-week lookup yet.

The complete response must be an array of plain transaction objects. Every object must have a
unique, non-empty string `transaction_id` and a non-negative safe-integer `status_updated`. The
node validates the full response before reading or changing production state, preserves all raw
fields and string IDs, and sorts deterministically by `status_updated` and then `transaction_id`.

- A manual test is only a preview. It does not read, establish, or change production state and
  returns the transaction with the greatest `status_updated`, using the transaction ID as a
  deterministic tie-breaker. An empty response returns no preview. The preview's
  `event: transaction.changed` metadata does not mean a new production change was detected.
- The first production poll establishes every returned transaction ID and timestamp as the
  baseline and emits nothing. An empty response establishes an empty baseline.
- Later polls emit a new ID or an existing ID only when its `status_updated` value increases.
  Equal or lower values do not emit. Detection deliberately does not hash or compare the complete
  raw transaction.
- Missing IDs are retained. Empty, truncated, stale, or reordered responses cannot delete state,
  lower a saved timestamp, or make an unchanged transaction replay when it reappears.
- Changing the event, League ID, or Round or Week creates an isolated baseline and does not replay
  history from the previous configuration.
- Static state stores only the configuration fingerprint and an array mapping transaction IDs to
  their highest observed `status_updated`. It never stores transaction objects. The explicit
  maximum is 1,000 tracked IDs per configuration; exceeding it fails without eviction, partial
  output, or state mutation.
- Failed requests and malformed responses emit nothing and leave state unchanged.

Every changed item keeps the raw transaction fields at the top level and adds only
`event: transaction.changed` and a batch-level `observed_at` timestamp. All items from one poll
share that timestamp. The trigger performs no player, roster, owner, or team enrichment and has no
transaction, status, roster, or owner filters.

## League Status Changed

Configure an explicit **League ID**. The node trims surrounding whitespace, rejects empty values
and control characters, and preserves the ID as opaque text without numeric conversion. Each poll
makes exactly one documented request: `GET /league/{league_id}`. It does not query
`GET /state/nfl` or any roster, user, draft, transaction, or player endpoint.

The complete response must be a plain league object whose raw `status` field is exactly one of
Sleeper's four documented values:

1. `pre_draft`
2. `drafting`
3. `in_season`
4. `complete`

That order is the node's explicit lifecycle ranking and anti-replay policy. Unknown future status
values and malformed responses fail with an n8n-native error before production state is read or
changed. The complete raw league object is preserved at the top level, including `league_id` as
returned, and the node adds only `event: league.status_changed` and `observed_at`.

- A manual test fetches once and returns exactly one preview of the current league status. It does
  not read, establish, or change production static data. The metadata describes the selected
  trigger event; a manual preview is not proof that a production transition occurred.
- The first production poll validates the response, stores the current status as a baseline, and
  emits nothing, so an already-established lifecycle state does not fire on activation.
- Later polls emit one item only when the current status has a greater lifecycle rank than the
  saved status. Skipped intermediate states are allowed, such as `pre_draft` to `in_season`.
- Equal statuses emit nothing. Lower statuses are treated as stale or out of order: they emit
  nothing and never lower the saved watermark. A later return to the already-saved higher status
  therefore cannot replay.
- Static data is constant-size and stores only the configuration fingerprint (event plus trimmed
  League ID) and `highestObservedLeagueStatus`. Full league objects, histories, and timestamps are
  never stored.
- Failed requests, malformed responses, and unknown statuses emit nothing and leave state
  unchanged.

The node does not attempt to detect an intentional lifecycle regression under the same League ID.
To watch a genuine new backward lifecycle under that ID, reset trigger state by changing or
recreating the trigger configuration. Phase 1C adds no UI reset, current NFL-state lookup, webhook
delivery, filters, or player, roster, owner, team, or other enrichment. It always uses exactly one
request per poll.

## NFL Week Changed

This event has no event-specific parameters. It always watches Sleeper's global NFL state and uses
only n8n's **Poll Times** configuration. Each manual or production poll makes exactly one
documented `GET /state/nfl` request. It makes no league, player, roster, transaction, draft,
schedule, or enrichment request and does not use webhook delivery.

The complete response must be a plain object with these cursor fields:

- `season`: a non-empty decimal-digit string representing a non-negative integer. It is compared
  numerically without precision loss but remains an unchanged string in raw output and static
  state.
- `season_type`: exactly `pre`, `regular`, or `post`.
- `week`: a non-negative safe integer. Week 0 is valid.

The explicit season-type ranks are `pre = 0`, `regular = 1`, and `post = 2`. The constant-size
cursor is `{ season, seasonType, week }` and compares in this precedence: numeric season, season
type rank, then week. This permits a week-number reset when `pre` advances to `regular`, `regular`
advances to `post`, or a newer season begins. A skipped week or phase emits exactly one current
state item; the node never synthesizes missing intermediate events.

- A manual test validates and returns exactly one current raw NFL-state preview. It does not read,
  establish, or change production static data, and the preview does not claim that a transition
  occurred.
- The first production poll validates the complete response, stores the configuration fingerprint
  `["nflWeekChanged","nfl"]` and current cursor as a baseline, and emits nothing.
- Later production polls emit once only when the cursor advances. Equal cursors emit nothing.
  Lower weeks in the same phase, lower season types in the same season, and lower seasons are
  stale or backward: they emit nothing and never lower the saved cursor. Returning to the saved
  cursor cannot replay; later true forward movement emits normally.
- Every output preserves the complete raw NFL-state object at the top level and adds only
  `event: nfl.week_changed` and one ISO-8601 UTC `observed_at`. No prior values, cursor metadata,
  deltas, inferred league week, wrapper, paired-item metadata, or enrichment are added.
- Failed requests, malformed state, unknown future season types, and invalid saved state never
  produce partial output. A malformed compatible saved cursor is replaced with a fresh baseline
  only after the current API response validates.

Sleeper documents `week` as the week value, `leg` separately as the week of the regular season,
and `display_week` as a UI/display field that can differ from `week`. NFL Week Changed therefore
tracks the season-aware `week` field. Changes to `leg` or `display_week` alone do not emit; both
fields remain untouched raw output fields.
