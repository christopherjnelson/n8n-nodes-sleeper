# n8n-nodes-sleeper

> [!IMPORTANT]
> This is an unofficial community project and is not affiliated with, endorsed by, or
> sponsored by Sleeper or Blitz Studios.

`n8n-nodes-sleeper` is a read-only n8n community node for public Sleeper fantasy football
and NFL state data. It uses Sleeper's documented public endpoints, needs no credentials, and
has no runtime dependencies.

## Status

The package is not yet published to npm. The direct action node is feature complete for the
planned `0.1.0` prerelease. Triggers and higher-level convenience operations remain possible
future work; this project does not claim n8n verification.

## Features

- 18 deterministic read operations across 14 resources
- Exact opaque string IDs, per-input execution, paired-item metadata, and `continueOnFail()`
- Raw Sleeper response fields without hidden joins, enrichment, caching, or truncation
- NFL-only visible sport choices and no credentials, writes, or private endpoints
- `usableAsTool: true` for n8n AI agents without bundling an AI dependency

## Installation

### Current local development

Clone this repository, install the locked development dependencies, and start the disposable
development instance:

```bash
pnpm install --frozen-lockfile
pnpm run dev --custom-user-folder /tmp/n8n-nodes-sleeper-dev
```

This is the only supported installation route before publication. Do not install development
builds into an active n8n service.

### After npm publication

After an approved release exists, self-hosted n8n users can install `n8n-nodes-sleeper`
through **Settings → Community Nodes**. Availability in n8n Cloud requires separate n8n
verification and is not implied by npm publication.

## Supported operations

| Resource          | Operation           | Required inputs                          | Optional inputs | Output shape                                       |
| ----------------- | ------------------- | ---------------------------------------- | --------------- | -------------------------------------------------- |
| User              | Get                 | Username or User ID                      | —               | One raw user object                                |
| League            | Get                 | League ID                                | —               | One raw league object                              |
| League            | Get Many for User   | User ID, Sport, Season                   | —               | One item per league; an empty array emits no items |
| League User       | Get Many            | League ID                                | —               | One raw participating-user item                    |
| Roster            | Get Many            | League ID                                | —               | One raw roster item                                |
| Matchup           | Get Many            | League ID, Week                          | —               | One raw item per roster side                       |
| Transaction       | Get Many            | League ID, Round or Week                 | —               | One raw transaction item                           |
| Playoff           | Get Bracket         | League ID, Bracket Type                  | —               | One raw bracket-matchup item                       |
| Traded Pick       | Get Many            | League ID                                | —               | One league-scoped traded-pick item                 |
| Draft             | Get                 | Draft ID                                 | —               | One raw draft object                               |
| Draft             | Get Many for League | League ID                                | —               | One raw item per associated draft                  |
| Draft             | Get Many for User   | User ID, Sport, Season                   | —               | One raw item per user draft                        |
| Draft Pick        | Get Many            | Draft ID                                 | —               | One raw item per recorded pick                     |
| Draft Traded Pick | Get Many            | Draft ID                                 | —               | One draft-scoped traded-pick item                  |
| Player            | Get Many            | Sport, Active Only, Output Mode          | Position        | One keyed map or one item per player-map entry     |
| Player            | Get Trending        | Sport, Trend Type, Lookback Hours, Limit | —               | One raw player-ID/count item                       |
| Sport             | Get State           | Sport                                    | —               | One raw NFL state object                           |
| Avatar            | Get URL             | Avatar ID, Image Size                    | —               | One local `{ avatar_id, size, url }` object        |

Usernames can change. Save the stable `user_id` returned by **User → Get** for later user
lookups. League and draft IDs are opaque strings and must not be converted to numbers.

League users and rosters are separate API results; this node does not join them. **Matchup →
Get Many** emits one record per roster side and does not pair records sharing a `matchup_id`.
**Transaction → Get Many** uses Sleeper's `round` path parameter, which commonly corresponds
to an NFL week. **Draft Traded Pick → Get Many** is draft-scoped; **Traded Pick → Get Many**
is league-scoped.

## Usage examples

The repository includes importable, inactive workflows with no credentials:

- [Get NFL state](examples/get-nfl-state.json)
- [Resolve a sample username and retrieve leagues](examples/get-user-leagues.json)
- [Get trending adds with explicit attribution](examples/get-trending-players.json)

Replace the clearly marked sample username before running the user-leagues example. The
examples are repository resources and are intentionally excluded from the npm tarball.

## Player data guidance

**Player → Get Many** returns Sleeper's object keyed by player ID. The unfiltered response is
approximately 5 MB, so Sleeper recommends fetching it sparingly and generally no more than
once daily. **Active Only** sends the server-side `active=true` filter; **Position** sends a
server-side fantasy-position filter. Sleeper documents no single-player endpoint.

**Single Map**, the default, emits the keyed object as one n8n item. **One Item per Player**
preserves each raw player object and map order, adding the string map key as `player_id` only
when that field is absent. The node performs no caching, deduplication, or static-data storage.
For repeated lookups, fetch a bounded dataset on a schedule and store it externally.

## Trending players and attribution

**Player → Get Trending** defaults to Adds, a 24-hour lookback, and 25 results. Results contain
raw player IDs and counts; the node does not fetch the player map or add names or rankings.
Sleeper requires attribution when you display or republish its trending-player data. Credit
Sleeper in the consuming application, page, report, or downstream output.

## Rate guidance

Keep request frequency well below Sleeper's documented limit of roughly 1,000 calls per
minute. Avoid polling static league or player data unnecessarily, and keep player queries
bounded with Active Only and Position whenever possible.

## Error behavior

The node validates identifiers and controlled choices before transport, uses a 30-second
timeout, and reports not-found, rate-limit, service, timeout, and connection failures as
n8n-native errors. With **Continue On Fail**, it emits a paired error item and continues with
later input items. Empty array responses emit no fabricated placeholder item.

## Privacy and public data

Sleeper exposes public user and league data without authentication. This node does not log in,
access private accounts, or request private endpoints. Workflows can still store, transform,
or forward returned public data, so workflow owners remain responsible for downstream data
handling and retention.

## AI-tool use

The node can be selected as an n8n AI tool. Operations remain deterministic and read-only, and
the package contains no AI runtime dependency. Give agents specific user, league, or draft IDs
and bounded player queries; do not ask an agent to infer private or unknown identifiers.

## Compatibility

- Package engine: Node.js 22.22.0 or newer
- Isolated UI and workflow testing: n8n 2.32.7
- Development CLI: `@n8n/node-cli` 0.42.0
- Development package manager: pnpm 11.15.0

These are tested versions, not a promise of compatibility with every version admitted by a
peer dependency range.

## Limitations

The node supports only NFL in its visible interface. It intentionally omits authentication,
lineup changes, adds/drops, trades, draft actions, league-setting changes, chat, Sleeper Picks,
paid contests, triggers, player search, single-player lookup, composite standings, scoreboards,
roster resolution, activity feeds, enrichment, and hidden caching.

**Avatar → Get URL** constructs a documented fixed CDN URL locally. It makes no HTTP request,
does not verify that the image exists, and emits no binary data.

## Development

```bash
pnpm install --frozen-lockfile
pnpm run validate
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm run test
pnpm run build
pnpm run package:check
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for scope and contribution rules and
[docs/release-readiness.md](docs/release-readiness.md) for the latest local assessment.

## Release and provenance

Releases are manual, tag-gated GitHub Actions runs. The first publication uses a short-lived
granular npm token because a brand-new package cannot yet have a trusted publisher. Later
releases use npm trusted publishing (or staged trusted publishing after owner approval) with
OIDC and provenance. Developer machines do not publish. See
[docs/releasing.md](docs/releasing.md).

## Contributing

Contributions must preserve the read-only public-API scope, exact workflow values, zero runtime
dependencies, and all automated gates. Security reports follow [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).

## Attribution

Sleeper API data and names remain the property of their respective owners. Trending-data users
must provide the attribution required by Sleeper's API documentation.

## Non-affiliation

This project is unofficial. It is not affiliated with, endorsed by, sponsored by, or produced
by Sleeper or Blitz Studios. The original node icon does not use Sleeper's logo, mascot, app
icon, or copied brand artwork.

## Official resources

- [Sleeper API documentation](https://docs.sleeper.com/)
- [n8n community nodes](https://docs.n8n.io/integrations/community-nodes/)
- [n8n community-node verification guidelines](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
