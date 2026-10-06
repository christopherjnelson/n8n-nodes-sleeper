# Testing

The primary `pnpm test` gate runs strict TypeScript Vitest contracts for the declarative action node, then every retained `test/*.test.cjs` suite through `node:test`. Retained CommonJS suites cover trigger lifecycle, metadata, examples, release artifacts/workflow, packaging, and legacy helpers; these remain as legacy test exceptions while new template safeguards use Vitest.

## Local gates

Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm review:source`, `pnpm build`, `pnpm scan:source`, `pnpm smoke:load`, `pnpm package:check`, `pnpm release:check`, and `pnpm smoke:install`. Package check validates npm’s JSON file manifest. Release check audits package identity, metadata, workflow guard ordering, scanner pins, and the staged-publishing boundary. Install smoke packs, installs without peer dependencies in a temporary consumer, then loads both registered nodes against the development host dependency.

CI repeats these gates on Node 22.22 and Node 24 with a 20-minute timeout. Live Sleeper calls and editor smoke testing are manual because they depend on external availability and an n8n host. See `docs/community-testing.md` for that checklist.

The actual n8n manual editor smoke for the published `0.2.1` package completed on 2026-09-08. The `0.3.0` candidate was also tested from its packed package in an isolated n8n 2.41.6 instance on Node 24.18.0 on 2026-10-06. Live public GET checks covered NFL/NBA/NHL state, NBA player filtering and trending, the NHL player map, NBA seasonal league/draft lists, and NBA league/draft actions including traded-pick ID precision. The editor rejected a saved NHL position expression before transport while the unfiltered NHL catalog still succeeded. Draft Pick Made activation stored an observed-pick baseline at 378, an unchanged scheduled poll emitted no event, and reactivation after restart restored the same saved state; manual preview returned the expected event shape. The smoke did not wait for a new pick, so future-event transitions remain covered only by unit fixtures.

The template 2.2 marker records the adopted baseline. Its current unversioned follow-up guidance was reviewed against upstream snapshot `596e784cfe69cd8894529b8a81c491921cde9773` on 2026-10-06. Intentional divergences include pnpm instead of npm, the existing manual trusted-stage release workflow with separate owner approval instead of generic direct publishing, retained CommonJS trigger/release regression suites, and the GitHub homepage while the template homepage remains unavailable. Follow `docs/template-migrations.md` when refreshing safeguards.

## Test boundaries

Action-node tests assert public resource and operation values, operation-specific sport visibility, URL encoding, query placement, validation before transport, NBA/NHL payload shapes, player-map output modes, and lossless unsafe-ID parsing for draft traded picks. Trigger regressions cover polling state, duplicate suppression, continue-on-fail behavior, and API errors. The trigger remains programmatic because polling compares persisted state across timer invocations; ordinary REST actions use n8n declarative routing. NBA draft-pick, transaction, and league-status routes share the existing ID-based trigger contracts. No NBA/NHL week trigger is included, and static response fixtures do not claim to verify dynamic transitions.
