# Template migrations

Generated repositories do not receive template changes automatically. Review the pinned upstream
template diff, apply only relevant safeguards, run the repository's complete gate set, and update
`.blackswamp/template.json` only after validation.

## Unversioned release-tag and source-review safeguards

- CI and the manual release quality job run the TypeScript AST source review before build. It
  rejects operation modules that only export typed empty `INodeProperties` arrays.
- The trusted-stage and published-verification jobs fetch full history and validate an annotated
  `v<package-version>` tag immediately after checkout and before setup or dependency installation.
  The tag must equal the freshly fetched `origin/main` tip and the selected workflow SHA.
- `pnpm run release:check`, after package inspection, audits the marker, scanner, metadata,
  workflow ordering, and the tokenless staged-release boundary.
- Compiled registration smoke requires exactly one constructible export matching each node
  filename. It does not silently load an arbitrary first constructor.
- Published-package scanner propagation retries have one 360-second total budget, bound each
  process to the remaining budget, and require exit status zero plus explicit scanner success.
- Scanner retry classification remains fail-closed: only matching missing-version metadata and
  provenance-source repository 404 responses retry; generic scanner-analysis 404s are terminal.

These follow-ups do not change the template marker independently; the baseline remains 2.2.0.

## 2.2.0

- Added the isolated `pnpm run dev` launcher on port 5690 and documented manual navigation to the
  local editor with a disk-backed user folder.
- Added `.codex-scratch` to ignore rules for local smoke artifacts.

The optional template Discord notification was not adopted. The package keeps pnpm and its manual
trusted-stage workflow: npm OIDC creates an immutable stage, and the owner approves it separately.
No token fallback, direct publish command, or automated stage approval is allowed.

## 2.1.1

- Updated the pinned official scanner to 0.38.0 and preserved TypeScript 5.9.3 as the project
  compiler. The frozen lockfile must resolve `node_modules/.bin/tsc` to the project's pinned
  TypeScript installation after install.
- Confirmed both node manifests use the supported `Development` category.

## Intentional local differences

- The legacy `test/*.test.cjs` suites remain for trigger, packaging, and release regression coverage;
  new template-alignment contracts are added in TypeScript/Vitest.
- Release checks preserve the stricter requirement that a release tag equals the current `main`
  tip, plus the exact workflow SHA, rather than merely appearing in main's history.
- Generic scanner-analysis 404 errors remain terminal even if upstream template retry behavior is
  broader; only recognized publication propagation responses retry.
- The template's catalog homepage returned HTTP 404 on 2026-09-08, so package metadata continues
  to use the GitHub repository homepage pending a verified live catalog page.
