# Sleeper n8n Node: NBA Support Audit

This document audits hardcoded `'nfl'` values, assumptions, and endpoints throughout the Sleeper n8n node and trigger implementations, and outlines a proposal for unified multi-sport support (specifically adding NBA support) while ensuring backward compatibility.

---

## 1. Call Sites Audit

Findings are categorized by behavior and aspect.

### Category: Endpoint URL

* **`nodes/SleeperTrigger/nflWeekChanged.ts:168`**
  * Hardcoded `/state/nfl` path segment (`pathSegments: ['state', 'nfl']`) when polling sport state.

### Category: Parameter / Option

* **`nodes/Sleeper/descriptions/SportDescription.ts:32-37`**
  * Option list for parameter `sport` contains only `{ name: 'NFL', value: 'nfl' }`.
* **`nodes/Sleeper/descriptions/PlayerDescription.ts:44-49`**
  * Option list for parameter `sport` contains only `{ name: 'NFL', value: 'nfl' }`.
* **`nodes/Sleeper/descriptions/LeagueDescription.ts:72-77`**
  * Option list for parameter `sport` contains only `{ name: 'NFL', value: 'nfl' }`.
* **`nodes/Sleeper/descriptions/DraftDescription.ts:94-99`**
  * Option list for parameter `sport` contains only `{ name: 'NFL', value: 'nfl' }`.
* **`nodes/Sleeper/descriptions/routing.ts:34`**
  * Allowed values for runtime parameter validation restricts `sport` to `['nfl']` (`sport: ['nfl']`).
* **`nodes/Sleeper/utils/validation.ts:3`**
  * Type definition restricts `SleeperSport` to literal `'nfl'` (`export type SleeperSport = 'nfl';`).
* **`nodes/Sleeper/utils/validation.ts:319-326`**
  * Runtime validation explicitly rejects any sport other than `'nfl'` (`if (sport !== 'nfl') throw ...`).

### Category: Descriptive Text

* **`nodes/Sleeper/descriptions/SportDescription.ts:39`**
  * Description specifies: `"The Sleeper sport path value. This release supports NFL only."`
* **`nodes/Sleeper/descriptions/PlayerDescription.ts:51`**
  * Description specifies: `"The Sleeper sport path value. This release supports NFL only."`
* **`nodes/Sleeper/descriptions/LeagueDescription.ts:79`**
  * Description specifies: `"The Sleeper sport path value. This release supports NFL only."`
* **`nodes/Sleeper/descriptions/LeagueDescription.ts:95`**
  * Season parameter description specifies NFL season: `"The four-digit NFL season year. The current year is not substituted automatically."`
* **`nodes/Sleeper/descriptions/DraftDescription.ts:37`**
  * Operation description refers specifically to NFL: `"Retrieve a user's public drafts for an NFL season using a stable user ID"`.
* **`nodes/Sleeper/descriptions/DraftDescription.ts:101`**
  * Description specifies: `"The Sleeper sport path value. This release supports NFL only."`
* **`nodes/Sleeper/descriptions/DraftDescription.ts:117`**
  * Season parameter description specifies NFL season: `"The four-digit NFL season year. The current year is not substituted automatically."`
* **`nodes/Sleeper/descriptions/TransactionDescription.ts:54`**
  * Parameter description assumes NFL conventions: `"Sleeper's round path parameter. For NFL leagues this commonly corresponds to the week; the current week is not selected automatically."`
* **`nodes/Sleeper/Sleeper.node.ts:13`**
  * Node description mentions NFL: `"Retrieve public Sleeper fantasy football and NFL state data without credentials"`.
* **`nodes/Sleeper/utils/validation.ts:324`**
  * Error description string: `"NFL is the only sport supported by this version of the Sleeper node."`
* **`nodes/SleeperTrigger/SleeperTrigger.node.ts:135`**
  * Event description assumes NFL: `"When Sleeper's global NFL week context advances"`.
* **`nodes/SleeperTrigger/SleeperTrigger.node.ts:176`**
  * Parameter description assumes NFL conventions: `"Sleeper's round path parameter. For NFL leagues this commonly corresponds to the week; the current week is not selected automatically."`

### Category: Week Logic

* **`nodes/Sleeper/descriptions/MatchupDescription.ts:22,46-56`**
  * Matchup endpoint queries by `week` (`/league/{leagueId}/matchups/{week}`), assuming weekly matchup scheduling typical of NFL fantasy.
* **`nodes/Sleeper/descriptions/TransactionDescription.ts:21-24,44-55`**
  * Transaction endpoint maps `round` to week semantics (`/league/{leagueId}/transactions/{round}`).
* **`nodes/SleeperTrigger/nflWeekChanged.ts:10-20`**
  * Trigger types and constants assume NFL season phases (`NFL_SEASON_TYPES = ['pre', 'regular', 'post']`) and a `week` number progression.
* **`nodes/SleeperTrigger/nflWeekChanged.ts:93-112`**
  * Cursor comparison logic assumes standard NFL calendar progression: `season -> seasonType rank -> week`.
* **`nodes/SleeperTrigger/SleeperTrigger.node.ts:166-182`**
  * Transaction polling parameter `round` labeled as `"Round or Week"` assuming NFL week grouping.

### Category: Player Lookup

* **`nodes/Sleeper/descriptions/PlayerDescription.ts:24`**
  * Player fetch route `/players/{{$parameter.sport}}` dynamically uses `$parameter.sport`, but option dropdown and validation currently force `'nfl'`.
* **`nodes/Sleeper/descriptions/PlayerDescription.ts:81-101`**
  * Position filter documentation highlights NFL-specific fantasy position codes (`QB`).

### Category: Trigger

* **`nodes/SleeperTrigger/SleeperTrigger.node.ts:14,134`**
  * Trigger exposes event `nflWeekChanged` (`NFL Week Changed`) instead of a generic sport state/week trigger.
* **`nodes/SleeperTrigger/SleeperTrigger.node.ts:199-201`**
  * Polling delegates to `pollNflWeekChanged(this)`.
* **`nodes/SleeperTrigger/SleeperTrigger.node.ts:236`**
  * Static data cleanup specifically deletes `highestObservedNflWeekCursor`.
* **`nodes/SleeperTrigger/leagueStatusChanged.ts:104`**
  * Static data cleanup explicitly references `delete staticData.highestObservedNflWeekCursor`.
* **`nodes/SleeperTrigger/transactionChanged.ts:199`**
  * Static data cleanup explicitly references `delete staticData.highestObservedNflWeekCursor`.
* **`nodes/SleeperTrigger/nflWeekChanged.ts:10-12,166-172`**
  * File and event are named around NFL (`NFL_WEEK_CHANGED_EVENT = 'nflWeekChanged'`, `nfl.week_changed`), and fingerprint hardcodes `'nfl'`: `JSON.stringify([NFL_WEEK_CHANGED_EVENT, 'nfl'])`.

### Category: Example (Docs)

* **`docs/api-matrix.md:10,15,22,23,24`**
  * Table rows for `Draft / Get Many for User`, `League / Get Many for User`, `Player / Get Many`, `Player / Get Trending`, and `Sport / Get State` list `NFL` explicitly under visible controls / minimum state instead of a generic sport dimension.
* **`docs/sleeper-trigger.md:6,39,75-76,109,113-154`**
  * Trigger documentation describes NFL-only behavior (`GET /state/nfl`, `nflWeekChanged`, cursor fields specific to NFL season structure).

---

## 2. Proposal: Unified Sport Parameter & Type Definition

To support NBA without regressions or duplicated definitions across description files, create a single source of truth for sports support:

1. **Shared Sport Type & Constants (`nodes/Sleeper/utils/validation.ts` or a new `nodes/Sleeper/types/sport.ts`)**:
   ```typescript
   export const SUPPORTED_SPORTS = ['nfl', 'nba'] as const;
   export type SleeperSport = (typeof SUPPORTED_SPORTS)[number];
   ```
2. **Reusable Node Property Definition (`nodes/Sleeper/descriptions/common.ts` or `SportDescription.ts`)**:
   Define a reusable `sportProperty` helper or descriptor object:
   ```typescript
   export const sportProperty: INodeProperties = {
     displayName: 'Sport',
     name: 'sport',
     type: 'options',
     required: true,
     options: [
       { name: 'NFL', value: 'nfl' },
       { name: 'NBA', value: 'nba' },
     ],
     default: 'nfl',
     description: 'The Sleeper sport path value.',
   };
   ```
3. **Reference in Descriptions & Routing**:
   * Replace the duplicated inline `sport` definitions in `SportDescription.ts`, `PlayerDescription.ts`, `LeagueDescription.ts`, and `DraftDescription.ts` with references to the shared property (merging appropriate `displayOptions`).
   * Update `allowedValues.sport` in `nodes/Sleeper/descriptions/routing.ts` to `['nfl', 'nba']` (or derive from `SUPPORTED_SPORTS`).
   * Update `getSport()` in `nodes/Sleeper/utils/validation.ts` to accept `'nba'`.
4. **Preserving Backward Compatibility**:
   * **NFL must remain the default value** (`default: 'nfl'`) across all parameters.
   * All existing workflow configurations omitting the parameter or relying on defaults will continue targeting the NFL API without disruption.

---

## 3. NBA-Specific Quirks (Future Implementation Notes)

When implementing NBA support in subsequent phases, the following differences from NFL must be addressed:

* **Season Structure & Schedule Granularity**:
  * NBA fantasy often operates on daily or matchup-period schedules rather than fixed, weekly game weeks (such as 82-game regular seasons spanning daily lineups).
  * The `round` and `week` parameters used in `/matchups/{week}` and `/transactions/{round}` represent different time buckets or match periods in NBA compared to NFL.
* **Player Dataset Payload Size**:
  * Sleeper's NBA player dataset (`/players/nba`) has distinct active/inactive roster sizes, different volume and structure than NFL, and can present different memory/payload size profiles.
* **Position Codes & Stat Keys**:
  * Player positions for NBA (`PG`, `SG`, `SF`, `PF`, `C`, `G`, `F`, `UTIL`) differ from NFL (`QB`, `RB`, `WR`, `TE`, `K`, `DEF`).
  * Stat categories and scoring settings (points, rebounds, assists, blocks, steals, turnovers, categories vs. points leagues) differ entirely from NFL fantasy scoring metrics.
* **Trigger Considerations**:
  * `NFL Week Changed` is specific to NFL state progression. Supporting NBA will require either a generalized `Sport State Changed` trigger with a sport selector or a dedicated `NBA State Changed` trigger accommodating NBA season stages.
