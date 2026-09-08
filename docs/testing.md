# Testing

The primary `pnpm test` gate runs strict TypeScript Vitest contracts for the declarative action node, then every retained `test/*.test.cjs` suite through `node:test`. Retained CommonJS suites cover trigger lifecycle, metadata, examples, release artifacts/workflow, packaging, and legacy helpers; obsolete action-executor suites were removed.

## Local gates

Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm scan:source`, `pnpm smoke:load`, `pnpm package:check`, and `pnpm smoke:install`. Package check validates npm’s JSON file manifest. Install smoke packs, installs without peer dependencies in a temporary consumer, then loads both registered nodes against the development host dependency.

CI repeats these gates on Node 22.22 and Node 24 with a 20-minute timeout. Live Sleeper calls and editor smoke testing are manual because they depend on external availability and an n8n host. See `docs/community-testing.md` for that checklist.

The owner confirmed completion of the actual n8n manual editor smoke for this Unreleased refresh on 2026-09-08. Future live and editor checks remain manual gates.

The template 2.1 marker is retained because its development safeguards are present. Intentional divergences are pnpm instead of npm and the existing manual trusted-stage release workflow instead of generic direct publishing.

## Test boundaries

Action-node tests assert public resource and operation values, request defaults, URL encoding, query placement, validation before transport, and the two intentional response transforms. Trigger regressions cover polling state, duplicate suppression, continue-on-fail behavior, and API errors. The trigger remains programmatic because polling compares persisted state across timer invocations; ordinary REST actions use n8n declarative routing.
