# Releasing

The permanent release path is manual, tag-gated, tokenless, and staged. The workflow at
`.github/workflows/release.yml` supports `dry-run`, `trusted-stage`, and `verify-published`;
`dry-run` is the default and no mode approves a staged package.

## Trusted-publisher binding

npm is configured by the package owner with this exact trust tuple:

- Provider: GitHub Actions
- Organization or user: `christopherjnelson`
- Repository: `n8n-nodes-sleeper`
- Workflow filename: `release.yml`
- Environment: `npm-release`
- Allowed action: `npm stage publish` only; direct `npm publish` is not allowed

The filename in npm is only `release.yml`, not its repository path. Names and casing must remain
exact. npm supports up to ten trusted-publisher configurations per package; this does not imply
that the owner changed this package's single documented binding. The package's Publishing Access
setting is owner-confirmed as **Require two-factor authentication and disallow tokens**.
Repository and environment secret counts are zero, and the workflow contains no token fallback.

The `npm-release` GitHub environment accepts only `v*` tags. It intentionally has no required
reviewer because a sole-maintainer reviewer rule could deadlock recovery; administrator recovery
remains available. Do not broaden its deployment policy or add credential variables.

## Safe dry run

Dispatch `release.yml` from `main` with the default `dry-run` mode and the exact package-name
confirmation. The unprotected dry-run job uses no npm authentication and no OIDC permission. It
installs the frozen lockfile, runs all validation gates, builds, inspects and packs the package,
and uploads the tarball as a workflow artifact. It never stages or publishes.

## Future release procedure

Use this procedure only for a legitimate, reviewed new package version:

1. Update the version and changelog, then run every local quality and package gate.
2. Review and approve the source, create an annotated `v<package-version>` tag, and push it
   without moving or reusing an existing tag.
3. Dispatch `release.yml` from that exact tag with `trusted-stage`, confirm
   `n8n-nodes-sleeper`, and choose the explicitly approved dist-tag. Use `latest` for the approved
   stable `0.2.1` release; the safe default remains `next`.
4. Let the protected GitHub-hosted job verify the annotated tag, selected source, unpublished
   version, quality gates, and exact tarball before GitHub OIDC runs `npm stage publish`.
5. Inspect the staged package on npm. Approval is a separate owner action and must be completed
   manually with 2FA through npm's website or supported interactive tooling.
6. After approval, dispatch the same immutable tag with `verify-published`. This fresh,
   read-only job verifies registry metadata, repository identity, `latest → 0.2.1`, SLSA
   provenance v1, packed node/icon contents, and the official published-package scanner's exact
   success text. It neither stages nor publishes again.
7. Create or update the GitHub release for the unchanged version tag and document the evidence.

Never automate stage approval, fall back to a traditional token, or replace staging with direct
publication. The workflow rejects an already published version, so `0.1.1` cannot be staged
again.

## Proven v0.1.1 trusted stage

Version `0.1.1` proved this process end to end. The trust binding used workflow filename
`release.yml` and environment `npm-release`; GitHub OIDC created the staged package, and the
owner approved it separately with npm 2FA. An earlier environment-field misspelling caused
`ENEEDAUTH` because npm saves trusted-publisher values without validating them. After correcting
that field, the immutable annotated `v0.1.1` tag was safely reused because it still targeted the
same reviewed commit; the tag was never moved or recreated.

## Proven v0.2.0 trusted stage

Version `0.2.0` proved the unchanged release path again. The dry run succeeded, the immutable
annotated tag passed the workflow checks, and the protected trusted-stage job used GitHub OIDC to
create the staged package through the `npm-release` environment. The owner approved that stage
separately with npm 2FA. After publication, the public registry tarball matched the validated local,
dry-run, and trusted-stage candidate byte-for-byte. These are version-specific results, not new
generic release requirements.

## Tooling requirements

Trusted publishing requires a GitHub-hosted runner, `id-token: write`, Node.js 22.14 or newer,
and npm 11.5.1 or newer. Staged publishing requires npm 11.15.0 or newer. The workflow pins
Node.js 24 and npm 11.16.0, grants `contents: read` and `id-token: write` only to the protected
stage job, and relies on npm-generated provenance for trusted publication.

The published scanner is pinned to `@n8n/scan-community-package` 0.34.0. Its verifier retries
only the scanner's exact missing-version metadata response and the full provenance-repository
404 message, for six bounded attempts. Generic 403, 404, rate-limit, timeout, and scanner failures
are terminal.

## Dist-tag policy

Future prerelease and community-testing versions use `next`. Use `latest` only after explicit
stable-release approval; never promote a prerelease silently. npm currently maps `next` to `0.2.0`
and `latest` to `0.2.0` after the explicitly approved stable promotion. No dist-tag should be
mutated without an explicitly approved release or promotion task.

## Template homepage divergence

The template recommends a live node-catalog homepage. The expected catalog URL,
`https://blackswampai.com/n8n-nodes/sleeper/`, returned HTTP 404 when checked on 2026-09-08.
Until that page is live and verified, package metadata intentionally retains the public GitHub
repository as its homepage. This is a release-documentation divergence, not a change to the pnpm
or staged-release safeguards.

## Historical note

Version `0.1.0` required a one-time token publication because trusted and staged publishing can
only be configured after a package exists. That temporary token and GitHub secret were removed
and revoked. This is historical evidence, not an available release path.

## Recovery

npm versions are immutable. For a bad release, do not approve a pending stage. If the version is
already public, stop promotion, deprecate it when appropriate, publish a fixed new version, and
document the incident in `CHANGELOG.md`. Never reuse a version or move its tag.
