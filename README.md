# n8n-nodes-sleeper

[![CI](https://github.com/christopherjnelson/n8n-nodes-sleeper/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/christopherjnelson/n8n-nodes-sleeper/actions/workflows/ci.yml)

> [!IMPORTANT]
> This is an unofficial community project and is not affiliated with, endorsed by, or
> sponsored by Sleeper or Blitz Studios.

`n8n-nodes-sleeper` is a read-only n8n community node for public Sleeper fantasy football
and NFL state data. It uses Sleeper's documented public endpoints, needs no credentials, and
has no runtime dependencies.

## Status

The source repository is public at
[github.com/christopherjnelson/n8n-nodes-sleeper](https://github.com/christopherjnelson/n8n-nodes-sleeper).
`n8n-nodes-sleeper` remains a verified n8n community node. npm `0.2.1` is the stable release and
contains the complete Phase 1 Sleeper Trigger: Draft Pick Made, Transaction Created or Updated,
League Status Changed, and NFL Week Changed. npm's `latest` tag selects stable `0.2.1`; `next`
remains on the separate `0.2.0` testing channel. An unqualified/default npm install
receives stable `0.2.1`.

Owner real-instance evaluation is complete and npm `0.2.1` is the stable/default release. The
currently approved n8n Cloud version may lag npm and may not include the Sleeper Trigger; confirm
the installed package version before relying on trigger availability.

## Features

- 18 deterministic read operations across 14 resources
- Exact opaque string IDs, per-input execution, paired-item metadata, and `continueOnFail()`
- Raw Sleeper response fields without hidden joins, enrichment, caching, or truncation
- NFL-only documented public API scope with zero credentials and zero runtime dependencies
- Four Phase 1 polling triggers with first-run baselines and monotonic anti-replay state
- `usableAsTool: true` for n8n AI agents without bundling an AI dependency

## Installation

### n8n Cloud

Search for **Sleeper** from the node picker or canvas. The verified action node is available
directly in n8n Cloud, but the currently approved Cloud version may lag npm and may not include
the Sleeper Trigger. Confirm the installed version in your environment.

### Self-hosted n8n

Where Community Nodes are supported, open **Settings → Community Nodes** and enter:

```text
n8n-nodes-sleeper
```

This ordinary/default selector follows npm `latest` and installs stable version `0.2.1`.

### npm

The default package selector resolves to the current stable release, `0.2.1`:

```bash
npm install n8n-nodes-sleeper
```

The retained `next` selector follows the prerelease channel and may differ from stable:

```bash
npm install n8n-nodes-sleeper@next
```

For a reproducible exact-version install:

```bash
npm install n8n-nodes-sleeper@0.2.1
```

See the [community-testing guide](docs/community-testing.md) for requested test evidence and
privacy rules.

### Local development

Clone this repository, install the locked development dependencies, and start the disposable
development instance:

```bash
pnpm install --frozen-lockfile
pnpm run dev --custom-user-folder /tmp/n8n-nodes-sleeper-dev
```

Do not install development builds into an active n8n service.

## Credentials

No credentials are required. The node uses Sleeper's public, read-only API and CDN endpoints.

## Operations

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
| Avatar            | Get URL             | Avatar ID, Image Size                    | —               | One validated `{ avatar_id, size, url }` object    |

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

## Community workflow examples

The separate [Sleeper workflow collection](https://github.com/christopherjnelson/n8n-workflows/tree/master/sleeper)
includes **Preseason League Command Center** and **Daily Trending Players Digest to Discord**.
Their own setup guides cover the additional n8n configuration and credentials they require.

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

The action node validates required and controlled values before transport, then delegates HTTP
execution and service errors to n8n's declarative request framework. Invalid player-map shapes
produce a focused node-operation error. Empty array responses emit no fabricated placeholder item.

## Troubleshooting

Confirm opaque IDs are passed as strings and controlled inputs use one of the choices shown in
the editor. **Avatar → Get URL** validates the image with a `HEAD` request, so a missing image or
CDN outage is reported as a request failure. Use the
[issue forms](https://github.com/christopherjnelson/n8n-nodes-sleeper/issues/new/choose) for
reproducible defects and [private vulnerability reporting](https://github.com/christopherjnelson/n8n-nodes-sleeper/security/advisories/new)
for security reports.

## Privacy and public data

Sleeper exposes public user and league data without authentication. This node does not log in,
access private accounts, or request private endpoints. Workflows can still store, transform,
or forward returned public data, so workflow owners remain responsible for downstream data
handling and retention.

## Community testing

Release feedback remains welcome from clean, supported self-hosted n8n environments. Follow the
[community-testing guide](docs/community-testing.md), then use the
[structured issue forms](https://github.com/christopherjnelson/n8n-nodes-sleeper/issues/new/choose)
for compatibility results, reproducible bugs, or feature requests. Report suspected security
issues only through
[private vulnerability reporting](https://github.com/christopherjnelson/n8n-nodes-sleeper/security/advisories/new).

## AI-tool use

The node can be selected as an n8n AI tool. Operations remain deterministic and read-only, and
the package contains no AI runtime dependency. Give agents specific user, league, or draft IDs
and bounded player queries; do not ask an agent to infer private or unknown identifiers.

## Compatibility

- Package engine: Node.js 22.22.0 or newer
- Isolated UI and workflow testing: n8n 2.32.7
- Development CLI: `@n8n/node-cli` 0.46.4
- Development package manager: pnpm 11.15.0

These are tested versions, not a promise of compatibility with every version admitted by a
peer dependency range.

## Limitations

The package supports only NFL in its visible interface. It intentionally omits authentication,
lineup changes, adds/drops, trades, draft actions, league-setting changes, chat, Sleeper Picks,
paid contests, player search, single-player lookup, composite standings, scoreboards, roster
resolution, activity feeds, enrichment, and hidden caching.

Phase 1 polling-trigger implementation is complete and publicly available as stable npm `0.2.1`.
Creator Portal and n8n Cloud updates remain separate owner-managed steps and are not yet verified.
Phase 2, Phase 3, and Phase 4 have not begun.

**Avatar → Get URL** makes a `HEAD` request to the documented CDN URL before emitting it. The
operation therefore fails when the image is missing or the CDN is unavailable; it emits URL
metadata rather than binary image data.

Ordinary action operations use n8n declarative routing. The Sleeper Trigger remains programmatic
because polling compares validated responses with persisted state across scheduled invocations.

## Development

```bash
pnpm install --frozen-lockfile
pnpm run validate
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm run test
pnpm run build
pnpm run scan:source
pnpm run smoke:load
pnpm run package:check
pnpm run smoke:install
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for scope and contribution rules and
[docs/release-readiness.md](docs/release-readiness.md) for the latest local assessment.

## Release and provenance

Releases are manual, tag-gated GitHub Actions runs. Versions `0.1.1`, `0.2.0`, and `0.2.1` proved the
trusted-stage path end to end: GitHub OIDC created each staged package and the owner approved it
separately with npm 2FA. The workflow has no direct-publish or token fallback, and developer
machines do not publish. See [docs/releasing.md](docs/releasing.md).

## Contributing

Contributions must preserve the read-only public-API scope, exact workflow values, zero runtime
dependencies, and all automated gates. Security reports follow [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).

## Attribution

Sleeper API data and names remain the property of their respective owners. Trending-data users
must provide the attribution required by Sleeper's API documentation.

The node icon is the current Sleeper-controlled robot favicon, extracted without visual changes
from the multi-size icon served by Sleeper's homepage. See [branding documentation](docs/branding.md).

## Non-affiliation

This project is unofficial. It is not affiliated with, endorsed by, sponsored by, or produced
by Sleeper or Blitz Studios. Sleeper owns the robot favicon used as the node icon; its inclusion
does not imply endorsement.

## Resources

- [Sleeper API documentation](https://docs.sleeper.com/)
- [n8n community nodes](https://docs.n8n.io/integrations/community-nodes/)
- [n8n community-node verification guidelines](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
