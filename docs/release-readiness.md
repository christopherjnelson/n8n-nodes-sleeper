# Phase 2A release readiness

- Date tested: 2026-08-02 (America/New_York)
- Operating system: openSUSE Tumbleweed, Linux 7.1.3-1-default, x86_64
- Node.js: 24.18.0
- pnpm: 11.15.0
- npm: 11.16.0
- n8n: 2.32.7
- `@n8n/node-cli`: 0.42.0

## Isolated test method

The node was loaded with the official CLI on `127.0.0.1:5689` using a disposable user folder:

```bash
N8N_PORT=5689 \
N8N_LISTEN_ADDRESS=127.0.0.1 \
N8N_DIAGNOSTICS_ENABLED=false \
N8N_VERSION_NOTIFICATIONS_ENABLED=false \
N8N_TEMPLATES_ENABLED=false \
N8N_PERSONALIZATION_ENABLED=false \
N8N_HIRING_BANNER_ENABLED=false \
N8N_SECURE_COOKIE=false \
pnpm run dev --custom-user-folder /tmp/n8n-sleeper-phase2a
```

A synthetic owner account was required and created only in the disposable instance. Playwright
1.62.1 drove the installed Google Chrome in headless mode. The process, browser state, database,
and rendered icon previews were removed after testing; port 5689 was released.

## Automated gates

All Phase 2A validation gates passed:

| Gate                        | Command                                            | Result      |
| --------------------------- | -------------------------------------------------- | ----------- |
| Locked install              | `pnpm install --frozen-lockfile`                   | Pass        |
| Official n8n validation     | `pnpm run validate`                                | Pass        |
| Typecheck                   | `pnpm run typecheck`                               | Pass        |
| Lint                        | `pnpm run lint`                                    | Pass        |
| Formatting                  | `pnpm run format:check`                            | Pass        |
| Mocked/artifact tests       | `pnpm run test`                                    | Pass, 93/93 |
| Build                       | `pnpm run build`                                   | Pass        |
| Project package check       | `pnpm run package:check`                           | Pass        |
| Independent package dry run | `npm pack --dry-run --json` with a temporary cache | Pass        |
| Whitespace                  | `git diff --check`                                 | Pass        |

## Interactive UI findings

- `Sleeper` appeared exactly once in node search and could be added without credentials.
- The node picker displayed 18 actions grouped under the expected 14 resources.
- Every resource and operation panel was selected. Display conditions, required inputs, and
  defaults matched the metadata contracts without overlapping or empty property regions.
- NFL was the only sport. Active Only was on, Player Output Mode was Single Map, trending was
  Adds/24/25, Bracket Type was Winners, Avatar Image Size was Full Size, and week/round were 1.
- The trending attribution notice rendered. Internal `resultLimit` appeared only as **Limit**.
- The node subtitle rendered as **Read-only public data**. `usableAsTool: true` remained in
  metadata, with no credential or AI runtime dependency.
- The original light and dark icons rendered in node search and remained recognizable at n8n's
  small display size.
- All three examples imported in n8n 2.32.7 with their Sleeper and core node types resolved.

## Smoke-test matrix

No response payload or execution database was retained.

| Resource | Operation    | Test type          | Request inputs                              | Expected result class         | Observed result                                      | Status |
| -------- | ------------ | ------------------ | ------------------------------------------- | ----------------------------- | ---------------------------------------------------- | ------ |
| Sport    | Get State    | Live success       | NFL                                         | One raw state object          | One item with current season/week state              | Pass   |
| Player   | Get Trending | Live success       | NFL, Adds, 24 hours, limit 3                | Split raw ID/count items      | Three ordered ID/count items; attribution visible    | Pass   |
| Player   | Get Many     | Live success       | NFL, Active Only, Position `QB`, Single Map | One bounded keyed map         | One keyed-map item; unfiltered map was not requested | Pass   |
| Avatar   | Get URL      | Local-only success | Synthetic avatar ID, Full Size              | One local URL object; no HTTP | Expected ID, size, and encoded CDN URL               | Pass   |

## Icon review

Both SVGs use a square `0 0 64 64` view box and an original crescent/orbit plus abstract
football-lace motif. Temporary renders were reviewed at 16, 24, 32, 60, and 128 pixels in
light and dark contexts. The files contain no scripts, animation, external references, embedded
raster data, text/fonts, filters, or metadata. Both metadata references resolve and both icons
are included by the package allowlist.

## Package contents

Examples and development/release documentation are intentionally repository-only. The npm
tarball is restricted to package metadata, README, LICENSE, CHANGELOG, compiled node code,
compiled descriptions/transport/helpers, node metadata, and both icons. The final dry run contains
27 entries, is 16,378 bytes compressed, and is 78,513 bytes unpacked. It contains no examples,
tests, source TypeScript, source maps, declaration files, release documentation, or credentials.

The default npm cache is read-only in the validation sandbox, so both package inspections used
`npm_config_cache=/tmp/n8n-sleeper-npm-cache`. This changes only npm's local cache location, not the
packed files or package metadata.

## Known mocked-only operations

The public smoke pass deliberately did not discover or use arbitrary user or league data. User,
League, League User, Roster, Matchup, Transaction, Playoff, Traded Pick, Draft, Draft Pick, and
Draft Traded Pick success/error contracts remain covered by mocked tests rather than live
success data. This is intentional and avoids personal identifiers and unnecessary requests.

## Package and registry review

- Runtime dependencies: none.
- Package version: `0.1.0`, appropriate for the intended first public prerelease.
- npm name check: the registry returned HTTP 404 for `n8n-nodes-sleeper` on 2026-08-02. This is
  evidence of availability at check time, not a reservation.
- Repository/homepage/bugs metadata targets the intended public GitHub repository. Exact,
  case-sensitive remote matching cannot be verified until that repository exists.
- Current npm guidance adds staged publishing as the preferred human-approval option after a
  package exists; it cannot be used for the first package publication.

## Remaining human checks and release blockers

- Create and verify the exact public GitHub repository and enable private vulnerability
  reporting.
- Review repository metadata after the remote exists and configure branch protection.
- Configure the `npm-release` environment and required reviewers.
- Approve the matching Git tag and short-lived granular first-publication token.
- After first publication, verify provenance, revoke the token, configure npm trusted
  publishing, and decide between direct and staged trusted publication.
- Submit to n8n only in a later explicitly approved phase; no verification is currently claimed.

The disposable n8n startup emitted upstream optional-peer/deprecation warnings, noted that its
internal Python runner virtual environment was absent, and warned that future n8n versions will
prefer containerized development. These did not prevent the JavaScript node, UI, imports, or
smoke executions. They do not add dependencies to this package.
