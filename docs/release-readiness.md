# Release readiness

## Current status — 2026-10-07

- Stable version `0.3.0` was published on npm on 2026-10-07 from annotated tag `v0.3.0`, which
  targets commit `744f8a85f372795655c1c5772bc672dfcb66950a`. Release run `37698692473` completed
  successfully, including direct OIDC publication, published-package verification, and GitHub
  Release creation. The normal
  [v0.3.0 GitHub Release](https://github.com/christopherjnelson/n8n-nodes-sleeper/releases/tag/v0.3.0)
  was published at `2026-10-07T22:59:15Z`.
- Historical pre-feature source checkpoint `e0db716` passed main CI run `37662041024` and release
  dry-run run `37662058905`. That checkpoint records source and runtime validation before the
  final release commit. The final tagged-release gates are recorded in run `37698692473`; current
  workflow history remains available from the
  [CI workflow](https://github.com/christopherjnelson/n8n-nodes-sleeper/actions/workflows/ci.yml)
  and [Release workflow](https://github.com/christopherjnelson/n8n-nodes-sleeper/actions/workflows/release.yml).
- Release run `37698692473` passed the full quality and package gates on the tagged source, including 101 Vitest tests, 105 Node tests, formatting, lint, typecheck, source review, build, source scan, load/install smoke, package check, and release audit. Its inspected tarball SHA-256 is `9fbc45af6046a09c493899b210751507c457d2f408bcb704f44af946a44a93df`.
- The published npm tarball, prepared local package, and Actions quality artifact were byte-identical (37 files, 33 in `dist/`). npm's signature audit reported no invalid or missing signatures. The SLSA attestation identifies `refs/tags/v0.3.0`, `release.yml`, run `37698692473` attempt 1, and source commit `744f8a85f372795655c1c5772bc672dfcb66950a`.
- The all-action response-contract changes postdate package `d56637bf08c1a1354838e2029d34eb2a2bb752378b65c5c2924087997a437f33`. The prior compiled package (`945144467a2caee29aec1ffbd10e6578788f93e184c17864b83c9b42fb869b5c`) passed the 2026-10-07 n8n 2.42.4 / Node 24.18.0 runtime smoke documented in [testing](testing.md). The earlier runtime smoke is separate from the exact tagged-release checks.
- The 2026-10-06 packed-package editor check used n8n 2.41.6 / Node 24.18.0 and validated the
  supported action/API paths and trigger baseline behavior. On 2026-10-07, the editor picker check
  confirmed the updated shared summary, 18 actions, and four trigger events. Neither check waited
  for a future Sleeper event transition.
- Current verified published selectors are `latest → 0.3.0` and `next → 0.2.0`, checked on
  2026-10-07 after publication. The published-package scanner and release verifier passed; the npm
  SLSA provenance predicate is `https://slsa.dev/provenance/v1`.
- No new n8n Cloud availability or Creator Portal update is claimed for `0.3.0`.

## 0.3.0 stable release

- Version `0.3.0` adds bounded NBA/NHL action support and lossless unsafe opaque-ID output for Draft Traded Pick.
- The Player → Get Many local output controls and NFL/NBA static Position dropdowns are included. The earlier 207-test and `d56637...` runtime checkpoints predate the final response-contract changes and remain historical. The 96 Vitest/104 Node counts and associated gates are an earlier response-contract checkpoint; the final release run passed 101 Vitest and 105 Node tests on the tagged source.
- The official published-package scanner, registry metadata/provenance checks, packed package inspection, and published install/load checks passed in release run `37698692473`. npm verified `latest → 0.3.0` and `next → 0.2.0` after publication.
- No NBA/NHL week trigger is included; the existing NFL Week Changed event remains NFL-only.
- Template guidance was reviewed on 2026-10-06 against upstream source snapshot `596e784cfe69cd8894529b8a81c491921cde9773` (baseline 2.2 plus its unversioned follow-up), then against direct-release commit `b5ab481ccfc25dcc546e4b12629f5c7bfdfb0e87` on 2026-10-07. The package retains pnpm and the exact npm Trusted Publisher workflow/environment names `release.yml` and `npm-release`.
- The earlier smoke-tested 37-file package (`SHA-256 a5422199fb90b1fecc53d7704c2f9719791e7af909112d9aea8a1a2e529659c6`) was loaded in isolated n8n 2.41.6 / Node 24.18.0 on 2026-10-06. Its editor smoke verified NFL/NBA/NHL state, NBA player/trending and seasonal list routes, NHL player catalog, NBA league/draft operations, exact unsafe traded-pick ID preservation, and the stale NHL Position guard: the invalid saved filter failed locally without reaching its downstream sentinel, while the unfiltered NHL catalog completed. For Draft Pick Made, activation established a baseline at observed pick number 378, an unchanged scheduled poll emitted no event, and reactivation after restart restored the same saved state; manual preview also returned the expected event shape. No future external event transition was asserted. The repeatable editor procedure is in [manual testing](manual-testing.md).
- GitHub's latest 2026-10-06 lockfile snapshot lists 27 open Dependabot alerts: 7 high, 17 moderate, and 3 low, all classified as development dependencies. The current alert list is available in the [repository Dependabot dashboard](https://github.com/christopherjnelson/n8n-nodes-sleeper/security/dependabot). The package has no runtime dependencies; `n8n-workflow` remains a host peer dependency. The sports change adds no unrelated dependency upgrades.

## Historical records

Dated release, security, and validation checkpoints are preserved in
[the release history](archive/release-history.md).
