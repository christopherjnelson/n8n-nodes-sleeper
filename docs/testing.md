# Testing

The primary `pnpm test` gate runs strict TypeScript Vitest contracts for the declarative action node, then every retained `test/*.test.cjs` suite through `node:test`. Retained CommonJS suites cover trigger lifecycle, metadata, examples, release artifacts/workflow, packaging, and legacy helpers; these remain as legacy test exceptions while new template safeguards use Vitest.

## Local gates

Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm review:source`, `pnpm build`, `pnpm scan:source`, `pnpm smoke:load`, `pnpm package:check`, `pnpm release:check`, and `pnpm smoke:install`. Package check validates npm’s JSON file manifest. Release check audits package identity, metadata, workflow guard ordering, scanner pins, and the staged-publishing boundary. Install smoke packs, installs without peer dependencies in a temporary consumer, then loads both registered nodes against the development host dependency.

CI repeats these gates on Node 22.22 and Node 24 with a 20-minute timeout. Live Sleeper calls and editor smoke testing are manual because they depend on external availability and an n8n host. See `docs/community-testing.md` for that checklist.

The owner confirmed completion of the actual n8n manual editor smoke for the `0.2.1` refresh on 2026-09-08. Future live and editor checks remain manual gates.

The template 2.2 marker records the adopted baseline. Intentional divergences include pnpm instead of npm, the existing manual trusted-stage release workflow with separate owner approval instead of generic direct publishing, retained CommonJS trigger/release regression suites, and the GitHub homepage while the template homepage remains unavailable. Follow `docs/template-migrations.md` when refreshing safeguards.

## Test boundaries

Action-node tests assert public resource and operation values, request defaults, URL encoding, query placement, validation before transport, and the two intentional response transforms. Trigger regressions cover polling state, duplicate suppression, continue-on-fail behavior, and API errors. The trigger remains programmatic because polling compares persisted state across timer invocations; ordinary REST actions use n8n declarative routing.
