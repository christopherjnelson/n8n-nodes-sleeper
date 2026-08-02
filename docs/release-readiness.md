# Release readiness

- Date tested: 2026-08-02 (America/New_York)
- Operating system: openSUSE Tumbleweed, Linux 7.1.3-1-default, x86_64
- Node.js: 24.18.0
- pnpm: 11.15.0
- npm: 11.16.0
- n8n: 2.32.7
- `@n8n/node-cli`: 0.42.0

## Phase 2B-2 prerelease preparation

- Audited dependency base commit: `26733c7b321db1309b8a85253ba89e8fae67a031`.
- Release-preparation commit: `89b5f865e4bda8a1e2d7d25620207af057d26df0`.
- Final release commit after correcting the explicit tarball path in `release.yml`:
  `c89de5c7506a49bdb6465d9d1f48123e8ceaa736`.
- Annotated tag: `v0.1.0`, tag object `fc69ca480c04047f51da420393fb2399fc08dde6`,
  targeting the final release commit exactly.
- Intended npm dist-tag: `next`. npm also created its required `latest` key for this first and
  only package version despite publication using `--tag next`. An authorized GitHub Actions
  removal attempt returned `E400`; the owner explicitly accepted this npm registry constraint.
- Pre-documentation release dry run: GitHub Actions run `30734575981`, success, on
  `26733c7b321db1309b8a85253ba89e8fae67a031`. Its 28-file artifact was byte-for-byte identical
  to the independently packed local tarball, and both publication jobs were skipped.
- Final corrected dry run: GitHub Actions run `30735471914`, success, on the final release
  commit. The artifact remained byte-for-byte identical to the approved tarball.
- The owner supplied the exact irreversible confirmation `PUBLISH 0.1.0 TO NEXT` before the tag
  and npm secret were created.
- Successful first-publication run: `30735834076`, using the protected `npm-release`
  environment and `npm publish --provenance --access public --tag next` from `v0.1.0`.
- The temporary GitHub environment secret was removed, both environment and repository secret
  counts returned to zero, and the owner confirmed revocation of both temporary npm tokens.

## Post-publication verification

- Public package: `https://www.npmjs.com/package/n8n-nodes-sleeper/v/0.1.0`.
- Registry tarball: 28 files, 16,933 bytes compressed, 79,749 bytes unpacked.
- Registry SHA-1: `0d5ab631a5417be3cb736e155cc5a775c1f5f495`.
- Independent SHA-256: `ba8b6bbb9993e3997b7a595e2930d29437287b28910ea515997c2520336b10fb`.
- Registry integrity:
  `sha512-qvQIA1pE8mRJidVByBcf86bMYY1wR5VD1p0wECWZsG/koNB2FRryOmZRqQ/Ve03zY+Sw5icyewONkN42GpR5Tg==`.
- The independently downloaded registry tarball was byte-for-byte identical to the approved
  local and GitHub Actions artifacts. Its file list, metadata, notices, and both icons matched.
- SLSA provenance names the public repository, `.github/workflows/release.yml`, tag `v0.1.0`,
  final release commit `c89de5c7506a49bdb6465d9d1f48123e8ceaa736`, GitHub-hosted runner,
  and successful run `30735834076` attempt 1.
- `npm audit signatures` verified registry signatures for 94 packages and attestations for six
  packages in a clean installation project.
- `npm install n8n-nodes-sleeper@next` succeeded in a clean temporary project and resolved the
  package to exactly `0.1.0`.
- A bare standalone npm install auto-installed the wildcard host peer `n8n-workflow@2.16.0`.
  Its separate transitive tree reported four high and one moderate advisory. Those dependencies
  are absent from the Sleeper tarball; supported n8n `2.32.7` supplies its own newer workflow
  runtime. This host-peer behavior is retained as a reviewed post-publication finding.
- GitHub release `v0.1.0` is a prerelease, is not GitHub's latest release, contains no attached
  local tarball, and points through the exact tag to the final release commit.

## Dependency-alert triage

GitHub reported 10 open Dependabot alerts before remediation: three high, five moderate, and two
low. All were transitive lockfile findings. The high alerts and eight other alerts were resolved
with supported direct dependency updates; no override or forced resolution was used.

| Alert | Package     | Severity | Advisory              | Vulnerable / fixed           | Relationship and exposure                                                                                                                                     | Resolution                                                          |
| ----- | ----------- | -------- | --------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| #1    | `undici`    | Moderate | `GHSA-2mjp-6q6p-2qxm` | `<6.24.0` / `6.24.0`         | Transitive development dependency of `release-it`; excluded from the tarball and not run by CI or publication                                                 | Resolved by `release-it` 21.0.1 (`undici` 7.29.0)                   |
| #2    | `undici`    | High     | `GHSA-f269-vfmq-vjvj` | `>=6.0.0 <6.24.0` / `6.24.0` | Same release-tool path; its WebSocket parser was not exercised by project gates                                                                               | Resolved by `release-it` 21.0.1                                     |
| #3    | `undici`    | Moderate | `GHSA-4992-7rv2-5pvq` | `<6.24.0` / `6.24.0`         | Same release-tool path; no project use of the `upgrade` option                                                                                                | Resolved by `release-it` 21.0.1                                     |
| #6    | `lodash`    | Moderate | `GHSA-f23m-r3pf-42rh` | `<=4.17.23` / `4.18.0`       | Transitive through the development copy of `n8n-workflow`; absent from the tarball                                                                            | Resolved by `n8n-workflow` 2.32.1 (`lodash` 4.18.1)                 |
| #7    | `lodash`    | High     | `GHSA-r5fr-rjxr-66jc` | `4.x <=4.17.23` / `4.18.0`   | Same development path; this project never invokes `_.template` with imports                                                                                   | Resolved by `n8n-workflow` 2.32.1                                   |
| #8    | `uuid`      | Moderate | `GHSA-w5hq-g745-h8pq` | `<11.1.1` / `11.1.1`         | Remaining path is `@n8n/node-cli` → AI utilities → LangChain; excluded from the tarball, not used by this non-AI node, and not exercised by CI or publication | Open pending a supported upstream CLI/LangChain update; no override |
| #9    | `form-data` | High     | `GHSA-hmw2-7cc7-3qxx` | `>=4.0.0 <4.0.6` / `4.0.6`   | Transitive through the development copy of `n8n-workflow`; no multipart request path is used                                                                  | Resolved by `n8n-workflow` 2.32.1 (`form-data` 4.0.6)               |
| #10   | `undici`    | Low      | `GHSA-35p6-xmwp-9g52` | `<6.27.0` / `6.27.0`         | Transitive development release-tool path only                                                                                                                 | Resolved by `release-it` 21.0.1                                     |
| #12   | `undici`    | Moderate | `GHSA-p88m-4jfj-68fv` | `<6.27.0` / `6.27.0`         | Transitive development release-tool path only                                                                                                                 | Resolved by `release-it` 21.0.1                                     |
| #13   | `undici`    | Low      | `GHSA-g8m3-5g58-fq7m` | `<6.27.0` / `6.27.0`         | Transitive development release-tool path only                                                                                                                 | Resolved by `release-it` 21.0.1                                     |

An independent `pnpm audit` initially found these alerts plus three newer high-severity `undici`
advisories not yet represented in the repository's Dependabot list. After remediation it reports
zero critical, high, or low findings and one moderate finding: the same upstream `uuid` path in
the official n8n development CLI. GitHub likewise reports only alert #8 open.

## Pre-publication isolated test method

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
| Mocked/artifact tests       | `pnpm run test`                                    | Pass, 94/94 |
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
- The light and dark football icons rendered in node search and remained recognizable at n8n's
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

## Published-package isolated n8n validation

n8n `2.32.7` ran on `127.0.0.1:56983` with a new temporary user folder, a disposable owner,
telemetry and personalization disabled, and no production credentials or workflows. n8n's
environment-managed community-package loader installed `n8n-nodes-sleeper@next` from the public
registry and reported installed version `0.1.0`.

- The loaded catalog contained exactly one `n8n-nodes-sleeper.sleeper` registration.
- All 14 resources and 18 operations loaded, with zero Sleeper credentials.
- Both theme icon endpoints rendered files matching the published SVG hashes.
- Avatar → Get URL succeeded locally for a synthetic ID and emitted the expected encoded
  thumbnail URL.
- Sport → Get State succeeded against the public API and returned the current 2026 preseason
  state.
- Player → Get Trending succeeded for Adds, 24 hours, limit 3, returning exactly three raw
  ordered ID/count items.
- No Player → Get Many workflow ran, so no unfiltered player-map request was made.
- The n8n process, temporary database, installed package, owner, workflows, cookies, and npm
  cache were removed after testing.

## Icon review

Both SVGs use a square `0 0 24 24` view box and incorporate the MIT-licensed Tabler Icons
`ball-american-football` paths on a custom rounded-square background. Temporary renders were
reviewed at 16, 24, 32, 60, and 128 pixels in light and dark contexts. The files contain no
scripts, animation, external references, embedded raster data, text/fonts, filters, or metadata.
Both metadata references resolve and both icons are included by the package allowlist.

## Package contents

Examples and development/release documentation are intentionally repository-only. The npm
tarball is restricted to package metadata, README, LICENSE, CHANGELOG, compiled node code,
the third-party notice, compiled descriptions/transport/helpers, node metadata, and both icons. The
release-preparation dry run contains 28 entries, is 16,933 bytes compressed, and is 79,749 bytes
unpacked. It
contains no examples, tests, source TypeScript, source maps, declaration files, release
documentation, or credentials.

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
- npm public access is independently demonstrated by anonymous metadata, tarball retrieval, and
  clean installation of `n8n-nodes-sleeper@next`.
- Repository/homepage/bugs metadata matches the public repository at
  `https://github.com/christopherjnelson/n8n-nodes-sleeper`.
- Current npm guidance adds staged publishing as the preferred human-approval option after a
  package exists; it cannot be used for the first package publication.

## GitHub publication controls

- The exact public GitHub repository exists with `main` as its default branch.
- GitHub Actions CI passed on the dependency-remediation commit in run `30734535665`.
- GitHub private vulnerability reporting is enabled and verified.
- The `npm-release` environment exists without secrets or reviewers and accepts deployments only
  from tags matching `v*`.
- At the Phase 2B-2 preflight check, the npm package was unpublished and no Git tag or GitHub
  release existed.

## Next phase boundary

- Phase 2B-2 publication, provenance, public installation, isolated n8n testing, credential
  cleanup, and GitHub prerelease creation are complete.
- The owner accepted npm's unavoidable `latest` key for the sole published version after the
  registry rejected its removal. This is a documented deviation from the requested dist-tag
  state; `next` also resolves to `0.1.0`, and no explicit promotion command was run.
- Configure npm trusted publishing only in Phase 2B-3. No trusted publisher exists yet.
- Submit to n8n only in a later explicitly approved phase; no submission or verification is
  currently claimed.

The disposable n8n startup emitted upstream optional-peer/deprecation warnings, noted that its
internal Python runner virtual environment was absent, and warned that future n8n versions will
prefer containerized development. These did not prevent the JavaScript node, UI, imports, or
smoke executions. They do not add dependencies to this package.
