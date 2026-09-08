# Release readiness

## 0.2.1 post-publication checkpoint — 2026-09-08

- Stable `n8n-nodes-sleeper@0.2.1` was published at `2026-09-08T05:59:49.733Z`; npm maps
  `latest → 0.2.1` and retains `next → 0.2.0`. Registry SHA-1 is
  `0aea958390dbcbd31642bef1e8ba8c9b2177db42`, and integrity is
  `sha512-vKxBD/SpJFCn7cQBjcF5N+FLzKe7pXkWfJxmsEPY8AgMDnE1ftVgv8d2G2X/cMs1uxHEK6m2jy1wtX2K9TRBaQ==`.
- Annotated tag `v0.2.1` has tag object `dd13a4d160cd01862abed7433e18255f02f88e9d`
  and peels to release/main commit `d8beba091de16715cb9574bfd45e4751af23c5be`.
- Main CI `34192040787` and dry-run `34192333086` succeeded. Trusted-stage run `34192643479`
  succeeded exactly once and created stage `0c5efd9b-fea8-4e85-86c5-5def5e60c533`; the owner
  approved it separately. Provenance is recorded in Sigstore log `2755305364`.
- Read-only verifier `34193865267` passed exact tag/main, metadata, SLSA v1 provenance, registry
  tarball boundary, isolated install, two-node load, and icon checks. The official scanner reported
  exactly `Package n8n-nodes-sleeper@0.2.1 has passed all security checks`.
- The registry tarball contains 36 files and is 27,848 bytes. All four packaged 48×48 icons match
  SHA-256 `6b0012a943317a7cd7abda4bbf4e02ce7c8180ba6a63bef320a40b3ef3103f29`.
- The owner completed the manual n8n editor smoke on 2026-09-08. The stable GitHub release is
  [v0.2.1](https://github.com/christopherjnelson/n8n-nodes-sleeper/releases/tag/v0.2.1).
- Creator Portal submission/update and n8n Cloud/catalog availability for `0.2.1` remain separate
  owner-managed steps and have not been verified or claimed complete.

## 0.2.1 pre-release dependency audit — 2026-09-08

- `pnpm audit --prod` reports zero known vulnerabilities. The package has no runtime dependencies,
  and its validated npm tarball excludes development dependencies and `node_modules`.
- Same-line overrides safely resolve the development-only advisories for `tmp` at `0.2.7`
  (`@n8n/scan-community-package`), `nanoid` at `3.3.18` (n8n tooling/workflow paths), and `qs` at
  `6.16.0` (`@n8n/node-cli` paths). The frozen lockfile and all development, build, scanner,
  package, and isolated-install gates pass with those resolutions.
- The full development audit retains two moderate advisories. `uuid <11.1.1`
  (`@n8n/node-cli → @n8n/ai-node-sdk → @n8n/ai-utilities → @langchain/classic → uuid`, and the
  corresponding `@langchain/community → @langchain/classic → uuid` and
  `@langchain/community → uuid` paths) would require a cross-major override. `stream-json <=3.4.0`
  (`@n8n/node-cli → @n8n/ai-node-sdk → @n8n/ai-utilities → @n8n/backend-network` →
  `@n8n/backend-common → stream-json`) cannot be safely moved from its 1.x dependency line to 3.x.
  Neither development-only path enters the published package, so both remain for their upstream
  owners rather than being forced across incompatible major versions.

## Current project status — 2026-09-08

- `n8n-nodes-sleeper` remains verified by n8n, but Creator Portal and n8n Cloud/catalog updates for
  `0.2.1` have not been verified and remain separate owner-managed work.
- npm `0.2.1` is public and stable with `latest → 0.2.1`; `next` intentionally remains on `0.2.0`.
  Default installs receive `0.2.1`.
- Public `0.2.1` preserves the complete Phase 1 Sleeper Trigger and all 18 action operations while
  migrating the actions to declarative routing. Exact self-hosted testing uses `@0.2.1`.
- Owner manual editor evaluation, stable publication, post-publication verification, and the stable
  GitHub release are complete. No `0.2.1` n8n Cloud availability is claimed.
- The dated sections below are preserved as historical checkpoint evidence. Their npm tags,
  verification state, and outstanding actions describe those checkpoints rather than current
  project status.

## 0.2.0 stable-promotion checkpoint — 2026-08-08

- The owner completed real-instance evaluation and approved stable promotion of the existing
  immutable `n8n-nodes-sleeper@0.2.0` artifact.
- npm `latest` was moved from `0.1.1` to `0.2.0`; `next` remained on `0.2.0`. The package was not
  rebuilt, republished, or versioned again. Registry SHA-1 remains
  `d7e0695de6e53c75ba6bdf6df25d9b3cd6437094`, and integrity remains
  `sha512-5VnXGc5thL9UMiUGOxtrM5XDdCevw6/+0TurWyL3QLARWJIrEvOfE/63Zx4QWhyATYrtu6WkPJldXxwyoyxigA==`.
- Existing GitHub release ID `367310296` for `v0.2.0` was converted from prerelease to a normal,
  non-draft release. Annotated tag object `16e437daf302c8d12fdb0529e8a5556271fe0359`
  still targets `b29d5cdb30cc78ca1a3a0cec283684cbb26e9752`.
- The n8n verified-node update remains a separate pending step; no n8n Cloud `0.2.0` availability
  is claimed.

## 0.2.0 post-publication checkpoint — 2026-08-08

- Release-preparation PR [#7](https://github.com/christopherjnelson/n8n-nodes-sleeper/pull/7)
  merged as release commit `b29d5cdb30cc78ca1a3a0cec283684cbb26e9752`.
- Immutable annotated tag `v0.2.0` has tag object
  `16e437daf302c8d12fdb0529e8a5556271fe0359` and targets that exact release commit.
- Release dry-run `31277532987` succeeded on the release commit. Trusted-stage run `31278388675`
  succeeded from `v0.2.0` using GitHub OIDC and the `npm-release` environment, with no npm token or
  direct publish fallback.
- The trusted stage created package `884be48d-7812-4fc6-ab05-0d8a0a5a7fa7`; the owner separately
  approved it with npm 2FA. npm `0.2.0` is public with provenance transparency-log index
  `2386973219`, `next → 0.2.0`, and `latest → 0.1.1`.
- The 35-file public registry tarball independently matched the local candidate, GitHub dry-run,
  and trusted-stage artifact byte-for-byte. Its SHA-256 is
  `19977e8a69f5dcd5d655bb201caa9d48e00dd74bd7d652428bc1311536018c16`.
- All 182 automated tests and the repository gates passed. A clean public-registry install loaded
  in stock n8n `2.33.7` as 2 nodes and 0 credentials, exposing 18 actions and 4 triggers.
- Sport → Get State succeeded against the live public API. Scheduled trigger polling activated and
  repeated normally; unchanged state created no executions.
- Reusing the same n8n user folder after restart restored and reactivated the workflow. Persisted
  static state survived, unchanged state did not replay, and the execution count stayed unchanged.
- Still pending: owner real-instance evaluation, `latest` promotion, the GitHub prerelease-to-normal
  release transition, and the n8n verified-node update/Creator Portal process.

## Historical 0.2.0 release-candidate preparation checkpoint — 2026-08-08

- Phase 1 is implementation-complete with all four polling events and no changes to the existing
  18 action operations.
- Main source commit before version preparation:
  `fe410fd6e5d87a29a15978ef051d0f6c7ed855fa`.
- The synchronized pre-bump baseline passed 182 tests plus n8n validation, typecheck, lint,
  formatting, build, package inspection, and `git diff --check`.
- Public npm `0.1.1` remains the verified version available in n8n Cloud. Source `0.2.0` is not yet
  published to npm or submitted as an n8n update.
- No `v0.2.0` tag or GitHub release exists. No npm stage has been created, and no npm dist-tag has
  changed: `latest → 0.1.1` and `next → 0.1.1`.
- No Creator Portal update has been made for `0.2.0`.

## Historical release ledger

- Date tested: 2026-08-02 (America/New_York)
- Operating system: openSUSE Tumbleweed, Linux 7.1.3-1-default, x86_64
- Node.js: 24.18.0
- pnpm: 11.15.0
- npm: 11.16.0
- n8n: 2.32.7
- `@n8n/node-cli`: 0.42.0

## Historical checkpoint: Phase 2B-4 v0.1.1 Creator Portal metadata correction

- n8n Creator Portal manual review found two codex metadata issues: the node identifier lacked
  its class-derived suffix, and `Developer Tools` was not a supported category.
- Release commit `19f24c3c4d0a70b86a978dad3c08bf09aa9de3ef` changed the codex `node` value to
  `n8n-nodes-sleeper.sleeper` and categories to exactly `["Development"]`. No runtime,
  credential, operation, parameter, output, icon, dependency, or workflow-facing behavior
  changed.
- The final local suite contained 98 passing tests. Main-branch CI run `30826603193` and release
  dry-run workflow `30826693788` both completed successfully.
- The unchanged annotated `v0.1.1` tag targets the release commit exactly. Trusted-stage run
  `30827973997` authenticated through GitHub OIDC and created the staged package without an npm
  token; the owner approved staged package `63c0b8b9-fdea-4b00-b6a9-d8aeb0d6e16a` separately
  with npm 2FA.
- Public package metadata, tarball, signatures, and provenance were verified after approval. The
  registry tarball contains 28 files, is 17,354 bytes compressed, and has SHA-256
  `2eb66b1926027c269628fda5f695dbc143592d3ddea6bdda3a0e9b4fbf627b02`; provenance identifies
  the exact repository, workflow, tag, and release commit.
- At this checkpoint, npm dist-tags were `next → 0.1.1` and `latest → 0.1.0`. No stable promotion
  or intentional `latest` mutation occurred during that checkpoint.
- Trusted publishing and separate staged-package approval were proven end to end. At this
  historical checkpoint, Creator Portal resubmission remained a manual owner action; verification
  was completed later, as recorded in the current-status section above.

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
- The then-current light and dark node icons rendered in node search and remained recognizable at n8n's
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

This historical checkpoint reviewed the former SVG assets. They were superseded in Unreleased by
the exact 48×48 frame extracted from the Sleeper-controlled favicon; current provenance and hashes
are recorded in `docs/branding.md`.

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
- At this Phase 2B-2 checkpoint, trusted publishing had not yet been configured; Phase 2B-3
  records the later configuration.
- Submit to n8n only in a later explicitly approved phase; no submission or verification is
  currently claimed.

The disposable n8n startup emitted upstream optional-peer/deprecation warnings, noted that its
internal Python runner virtual environment was absent, and warned that future n8n versions will
prefer containerized development. These did not prevent the JavaScript node, UI, imports, or
smoke executions. They do not add dependencies to this package.

## Phase 2B-3 trusted staging and community-testing preparation

### Trusted publication controls

- Workflow migration commit: `f3730ee97462ce31f42ade1cb743d0daf087adda`. GitHub Actions CI
  run `30751070611` passed its canonical `build` job.
- `.github/workflows/release.yml` is manual-only and exposes only default `dry-run` and protected
  `trusted-stage` modes. The dry run uses no environment, npm authentication, or OIDC permission.
- The protected job grants `contents: read` and `id-token: write`, uses a GitHub-hosted runner and
  the `npm-release` environment, verifies an exact annotated version tag and unpublished version,
  runs every gate, verifies the packed tarball, and stops after `npm stage publish`.
- Direct `npm publish`, token environment variables, token fallbacks, automated stage approval,
  `latest` promotion, and dist-tag mutation commands are absent from the workflow.
- npm trust tuple: GitHub Actions, `christopherjnelson`, `n8n-nodes-sleeper`, workflow filename
  `release.yml`, environment `npm-release`, and `npm stage publish` allowed without direct
  `npm publish`.
- Verification level: **owner-confirmed**. The owner supplied the required exact checkpoint
  `TRUSTED PUBLISHER CONFIGURED STAGE-ONLY; TOKENS DISALLOWED`. npm's authenticated settings and
  current `npm trust list`/`npm stage list` cannot be read anonymously, and no persistent local
  credential was created to automate that check.
- Publishing Access is therefore recorded as owner-confirmed **Require two-factor authentication
  and disallow tokens**, not independently agent-verified. The workflow and documentation need no
  token; repository and environment secret and variable counts remain zero.
- At this Phase 2B-3 preparation checkpoint, a true OIDC authentication and stage test remained
  unproven. Phase 2B-4 above records the later successful `0.1.1` trusted stage and publication.
- The `npm-release` environment still permits only `v*` deployment tags, has no credential
  variables, and retains administrator recovery without a sole-maintainer reviewer deadlock.

### Public selector and n8n installation validation

Fresh disposable npm projects tested `n8n-nodes-sleeper@0.1.0`,
`n8n-nodes-sleeper@next`, and the unqualified `n8n-nodes-sleeper` selector with npm 11.16.0
and Node.js 24.18.0 on Linux 7.1.3-1-default x86_64. Each resolved version `0.1.0`, registry
integrity
`sha512-qvQIA1pE8mRJidVByBcf86bMYY1wR5VD1p0wECWZsG/koNB2FRryOmZRqQ/Ve03zY+Sw5icyewONkN42GpR5Tg==`,
and tarball SHA-256 `ba8b6bbb9993e3997b7a595e2930d29437287b28910ea515997c2520336b10fb`.

A separate disposable n8n `2.32.7` instance installed the unqualified public package through
n8n's Community Nodes service and reported `0.1.0`:

- Sleeper registered exactly once, requested no credentials, and exposed all 14 resources and
  18 operations.
- Both n8n icon routes matched the built SVG SHA-256
  `244b4127fdfa0ec189637a750620674077d35a643f27a837e1180080366b2ed2`.
- Sport → Get State succeeded against the live public endpoint with one state item.
- Player → Get Trending succeeded for NFL Adds, 24 hours, limit 5, with five ordered raw
  player-ID/count items.
- Avatar → Get URL succeeded locally for a synthetic ID and produced the correctly encoded
  thumbnail URL.
- No Player → Get Many workflow ran, so no player-map request was made.
- The temporary owner, workflows, cookies, database, installed package, process, and test folder
  were removed after the smoke pass.

### Community intake and compatibility decision

- `docs/community-testing.md` documents normal, `next`, and exact-version installation, requested
  evidence, privacy rules, limitations, and prerelease success criteria without claiming existing
  tester counts.
- Structured bug, compatibility, and feature-request issue forms collect environment and
  reproduction data. Blank issues are disabled, and security reports route to private
  vulnerability reporting.
- Pinned public coordination issue:
  `https://github.com/christopherjnelson/n8n-nodes-sleeper/issues/1`, created only after the
  documentation and forms reached `main` and CI run `30752259170` passed.
- Verified intake labels: `community-testing`, `bug`, `compatibility`, `documentation`,
  `enhancement`, `security`, `upstream`, and `needs-reproduction`. Existing useful default labels
  were preserved.
- The existing GitHub `v0.1.0` prerelease notes now link to the guide and pinned issue. Its tag,
  prerelease status, and release identity were not changed.
- CI retains its single canonical Node.js 22.22.0 `build` check. A Node 22/24 matrix was not added
  because it would change the branch-protection check name and obscure the required canonical
  status. The release workflow and the full local Phase 2B-3 pass also exercise Node.js 24.
- No n8n verification submission was made and no verification status is claimed.

### Phase 2B-3 local package evidence

- At this checkpoint, the mocked, artifact, documentation, and workflow contract suite contained
  97 tests after the new issue-form coverage was included.
- Independent dry-run package: 28 files, 17,278 bytes compressed, 80,669 bytes unpacked, SHA-1
  `7c5a3d9f6aa4089641413c46d9eb5e19f7b02d99`, and integrity
  `sha512-cA0Bef7RrdCtOK0npTS0JSIRxsJkG0BQ3VzVU1x36rFeHStRQr4KKbnnsqpYZTSf69v+8z6XIid0dq1aUUtIUA==`.
  The expected size change is limited to the packaged README; the allowlisted 28-file shape is
  unchanged.
- The only open Dependabot alert remains reviewed moderate development-only `uuid` alert #8.
- At this checkpoint, npm dist-tags remained `latest → 0.1.0` and `next → 0.1.0`; no mutation
  command ran. Phase 2B-4 records the later `next → 0.1.1` state.
