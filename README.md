# n8n-nodes-sleeper

> [!IMPORTANT]
> This is an unofficial community project and is not affiliated with, endorsed by, or
> sponsored by Sleeper or Blitz Studios.

`n8n-nodes-sleeper` is an n8n community node for retrieving public Sleeper fantasy
football draft, user, league, player, roster, matchup, transaction, playoff, traded-pick,
avatar URL, and NFL state data.

## Status and scope

This project is in early development and has not been published to npm. It is read-only,
requires no credentials, and is NFL-first.

## Operations

| Resource          | Operation           | Required inputs                          | Optional inputs | Purpose and output shape                                                     |
| ----------------- | ------------------- | ---------------------------------------- | --------------- | ---------------------------------------------------------------------------- |
| User              | Get                 | Username or User ID                      | —               | Retrieve one raw Sleeper user object                                         |
| League            | Get                 | League ID                                | —               | Retrieve one raw Sleeper league object                                       |
| League            | Get Many for User   | User ID, Sport (NFL), Season             | —               | Retrieve one raw item per league; an empty result emits no items             |
| League User       | Get Many            | League ID                                | —               | Retrieve one raw item per user participating in the league                   |
| Roster            | Get Many            | League ID                                | —               | Retrieve one raw item per league roster                                      |
| Matchup           | Get Many            | League ID, Week                          | —               | Retrieve one raw item per roster side for the selected week                  |
| Transaction       | Get Many            | League ID, Round or Week                 | —               | Retrieve one raw item per free-agent, waiver, or trade transaction           |
| Playoff           | Get Bracket         | League ID, Bracket Type                  | —               | Retrieve one raw item per winners- or losers-bracket matchup                 |
| Traded Pick       | Get Many            | League ID                                | —               | Retrieve one raw item per league-scoped traded pick                          |
| Draft             | Get                 | Draft ID                                 | —               | Retrieve one raw Sleeper draft object                                        |
| Draft             | Get Many for League | League ID                                | —               | Retrieve one raw item per associated draft                                   |
| Draft             | Get Many for User   | User ID, Sport (NFL), Season             | —               | Retrieve one raw item per user draft for the season                          |
| Draft Pick        | Get Many            | Draft ID                                 | —               | Retrieve one raw item per recorded draft pick                                |
| Draft Traded Pick | Get Many            | Draft ID                                 | —               | Retrieve one raw item per draft-scoped traded-pick record                    |
| Player            | Get Many            | Sport (NFL), Active Only, Output Mode    | Position        | Return the raw keyed map as one item or one complete raw object per player   |
| Player            | Get Trending        | Sport (NFL), Trend Type, Lookback, Limit | —               | Retrieve one raw item per trending player ID and count                       |
| Avatar            | Get URL             | Avatar ID, Image Size                    | —               | Construct one local result containing the avatar ID, size, and fixed CDN URL |
| Sport             | Get State           | Sport (NFL)                              | —               | Retrieve one raw Sleeper state object                                        |

Sleeper usernames may change. Store the stable `user_id` returned by **User → Get** for
later workflow steps, including **League → Get Many for User**, which accepts only a user ID.
Treat Sleeper IDs as strings so JavaScript does not round large values.

Direct operations preserve Sleeper's raw fields, nested objects, arrays, and null values.
League users and rosters remain separate results: the node does not join users to roster
ownership. **Matchup → Get Many** returns team-side records and does not pair records that
share a `matchup_id`. **Transaction → Get Many** uses Sleeper's `round` path parameter, which
commonly corresponds to the NFL week, without selecting a current week automatically.
**Playoff → Get Bracket** supports controlled winners and losers bracket choices.

A league may have multiple drafts, including across seasons or draft types, so **Draft → Get
Many for League** returns every record in Sleeper's order. **Draft → Get Many for User**
requires a stable User ID rather than a username. Draft picks are returned as raw individual
records: embedded player metadata is preserved when present but is not enriched from the
player map. **Draft Traded Pick → Get Many** is scoped to a Draft ID, while **Traded Pick →
Get Many** is scoped to a League ID. No draft actions or mutations are supported.

## Player data

**Player → Get Many** returns Sleeper's object keyed by player ID. The unfiltered response
averages approximately 5 MB, so Sleeper recommends fetching it sparingly and generally no
more than once daily. **Active Only** sends the server-side `active=true` filter when enabled;
disabling it omits that query parameter. The optional **Position** value is sent as a
server-side fantasy-position filter. Filtered responses are smaller than the complete map.

**Single Map**, the conservative default output mode, emits the raw keyed object as one n8n
item. **One Item per Player** preserves each complete raw player object and map order, adding
the string map key as `player_id` only when that property is absent. Existing `player_id`
values are never overwritten. Numeric-looking IDs such as `"1042"` and team-defense IDs such
as `"CAR"` remain strings.

The node performs no hidden player-map caching, request deduplication, or static-data storage:
every incoming item makes its explicitly requested call. For repeated production lookups,
fetch the dataset on a schedule generally no more than daily, store it in an external
datastore or n8n-supported storage such as Postgres, n8n Data Tables, Airtable, or Supabase,
and reuse that stored data downstream.

## Trending players and attribution

**Player → Get Trending** supports controlled Adds and Drops choices. It defaults to a
24-hour lookback and 25 results, returning Sleeper's raw ordered records containing player IDs
and counts. It does not fetch the player map or add player names, teams, positions, rankings,
or other enrichment.

Sleeper requires attribution when you display or republish its trending-player data. Credit
Sleeper visibly in the consuming application, page, report, or other republished output. The
node also shows this guidance in the Get Trending operation and does not add attribution
fields to Sleeper's raw records.

## Avatar URLs

**Avatar → Get URL** constructs Sleeper's documented fixed CDN URL locally for either a
full-size image or thumbnail. It makes no HTTP, HEAD, or existence-check request, does not
download the image, and emits no binary data. Its `{ avatar_id, size, url }` result is a local
convenience result rather than a raw Sleeper API response.

- Full size: `https://sleepercdn.com/avatars/{avatar_id}`
- Thumbnail: `https://sleepercdn.com/avatars/thumbs/{avatar_id}`

The project intentionally does not support:

- Lineup changes
- Adds or drops
- Trades
- Draft actions
- League-setting changes
- Chat
- Sleeper Picks or paid contests
- Triggers

Direct operations also intentionally omit a single-player endpoint, player search, player
enrichment, hidden caching, writes, and mutations. Sleeper does not document a single-player
endpoint; use the externally stored player map when a workflow needs repeated ID lookups.

## Development

Node.js 22.22.0 or newer and pnpm 11 are required.

```bash
pnpm install --frozen-lockfile
pnpm run validate
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm run test
pnpm run build
npm pack --dry-run
```

Use `pnpm run lint:fix` and `pnpm run format:write` for supported automatic fixes. See
[CONTRIBUTING.md](CONTRIBUTING.md) for contribution policies.

## Resources

- [Sleeper API documentation](https://docs.sleeper.com/)
- [n8n community-node documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

MIT. See [LICENSE](LICENSE).
