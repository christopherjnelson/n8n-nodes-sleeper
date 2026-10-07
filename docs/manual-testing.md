# Manual editor smoke test

This guide covers the merged `0.3.0` source candidate in the local n8n editor. The packed-package
and public API smoke ran on n8n 2.41.6 on 2026-10-06; a separate picker-label check ran on n8n
2.42.4 on 2026-10-07. It does not install an npm release or establish that future Sleeper events
will occur. Use public Sleeper endpoints; the node needs no credentials.

## Open the editor

From the repository root, start the development editor if it is not already running:

```bash
npm run dev
```

Open `http://localhost:5690` manually. The task-runner broker uses port `5691`. The command uses
the installed n8n node CLI and its existing user profile. Keep the editor instance already in use;
do not start a second n8n service.

## Check node discovery

1. Open the general **+ / What happens next?** picker, search for **Sleeper**, and open its family
   entry. Confirm the shared summary reads “Read public Sleeper fantasy data and start workflows
   with polling triggers.” The details view lists **Actions (18)** and **Triggers (4)**.
2. Open **Actions (18)** and confirm its operations are grouped under 14 resources. In an action
   parameter editor, the resource selector contains those 14 resource choices; it does not show
   all 18 operations as resource choices.
3. Start a workflow with **Add first step**, search for **Sleeper**, and inspect **Triggers (4)**.
   Confirm the four events are Draft Pick Made, Transaction Created or Updated, League Status
   Changed, and NFL Week Changed. The picker may also show a collapsed **Actions (18)** heading;
   confirm it has no action entries in this trigger-first list.
4. Confirm no credential is requested.

## Check action nodes against public data

In an n8n workflow, choose **⋯ → Import from File** and import the inactive examples below. Run
them manually. They cover NFL/NBA/NHL state, NBA/NHL player catalogs, trending players, and
seasonal leagues for a sample user. The sample username in the user-leagues workflow is marked for
replacement; use a public username you are comfortable querying.

- [NFL state](../examples/get-nfl-state.json)
- [NBA state](../examples/get-nba-state.json)
- [NHL state](../examples/get-nhl-state.json)
- [NBA players](../examples/get-nba-players.json)
- [NHL players](../examples/get-nhl-players.json)
- [Trending players](../examples/get-trending-players.json)
- [User leagues](../examples/get-user-leagues.json)

Confirm each state action returns one raw state object. For **Player → Get Trending**, select NBA,
run Adds and Drops with a 24-hour lookback and limit 10, and confirm each output contains raw
`player_id`/`count` items. IDs, counts, and ordering change over time.

For additional NBA checks, use these observed public fixtures, rechecked on 2026-10-07. They can
change or disappear, so empty or changed results are not by themselves a product defect:

| Season | League ID             | Draft ID              |
| ------ | --------------------- | --------------------- |
| 2026   | `1382095100900802562` | `1382095101836136448` |
| 2025   | `1292471924214988800` | `1292471925934661632` |
| 2024   | `1118308938883117056` | `1118308940040785920` |

Use user ID `202219876658454528` with **League → Get Many for User** and **Draft → Get Many for
User**, selecting Sport `NBA` and the season above. These return one item per matching league or
draft. The observations returned one league for each season, whose `total_rosters` values were 10
(2024), 6 (2025), and 14 (2026); **Draft → Get Many for User** returned three drafts for 2026 in
the 2026-10-06 check. These counts can change. For the 2026 league/draft IDs above, additional
expected result shapes are:

| Check                             | Expected observed result                                                |
| --------------------------------- | ----------------------------------------------------------------------- |
| League → Get                      | One raw league object with NBA sport and season fields                  |
| Draft → Get                       | One raw draft object                                                    |
| Draft → Get Many for League       | One item per associated draft                                           |
| League User → Get Many            | 14 raw league-user items                                                |
| Roster → Get Many                 | 14 raw roster items                                                     |
| Matchup → Get Many, Week `1`      | 14 raw roster-side items; shared `matchup_id` values are not combined   |
| Traded Pick → Get Many            | 28 raw league-scoped traded-pick items                                  |
| Draft Pick → Get Many             | 378 raw recorded-pick items in the observed draft                       |
| Draft Traded Pick → Get Many      | Raw draft-scoped traded-pick items; inspect opaque IDs as exact strings |
| Transaction → Get Many, Round `1` | 14 raw transaction items from that explicit round                       |
| Playoff → Get Bracket             | Raw bracket-match objects for the selected bracket type                 |

The draft-traded-pick response contains an opaque numeric ID that exceeds JavaScript's safe integer
range. Confirm the emitted value is the exact string `"1382095101836136448"` wherever that ID is
returned; it must not be rounded or changed to a JSON number.

These are observed fixture results, not stable contracts or endorsements. Avoid sharing returned
user names, league names, or full execution data in public reports.

For NBA **Player → Get Many**, test Position `PG` and confirm it filters the `fantasy_positions`
array. A player whose primary `position` is `SG` can still match if `fantasy_positions` includes
`PG`; this control does not mean primary-position-only. Test the output in both Single Map and One
Item per Player modes if both are relevant to your workflow.

For NHL, confirm **Sport → Get State** returns one raw state object, and **Player → Get Many**
works without Position. A saved nonempty NHL Position is
expected to fail locally before an HTTP request because tested NHL position queries returned no
results. NHL **Sport → Get State** omits `leg` and `league_season`, fields present in the observed
NFL/NBA state objects. The node returns the raw response without filling absent fields.

## Preview the four polling triggers

Create a temporary workflow with a Sleeper Trigger and use the editor's manual test/preview action.
Do not activate a production workflow for this smoke test.

| Event                          | Configuration                              | Expected preview                                                                                                                                              |
| ------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Draft Pick Made                | Draft ID `1382095101836136448`             | One item for the highest available pick (observed `pick_no` 378) with raw pick fields plus `event: draft.pick_made` and `observed_at`                         |
| Transaction Created or Updated | League ID `1382095100900802562`, Round `1` | One item for the greatest `status_updated`, with raw transaction fields plus `event: transaction.changed` and `observed_at`; no item if the response is empty |
| League Status Changed          | League ID `1382095100900802562`            | One raw league item plus `event: league.status_changed` and `observed_at`                                                                                     |
| NFL Week Changed               | No event-specific input                    | One raw NFL state item plus `event: nfl.week_changed` and `observed_at`                                                                                       |

A preview is a shape and connectivity check only. It does not establish production polling state or
prove that a future event was detected. Keep this workflow inactive; do not leave a Sleeper polling
workflow running. Unit tests cover state transitions, while manual checks have not validated a
future external event. Do not wait for or simulate a real Sleeper event.

## Report results

Record the package source/version, n8n and Node.js versions, operation/event, sanitized inputs,
and whether the result was a manual preview or an activated poll. Share concise, redacted evidence
through the [issue forms](https://github.com/christopherjnelson/n8n-nodes-sleeper/issues/new/choose).
Never include credentials, cookies, private league identifiers, usernames, or complete execution
payloads in a public issue.
