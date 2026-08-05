# Releasing

The permanent release path is manual, tag-gated, tokenless, and staged. The workflow at
`.github/workflows/release.yml` supports only `dry-run` and `trusted-stage`; `dry-run` is the
default and neither mode approves a staged package.

## Trusted-publisher binding

npm is configured by the package owner with this exact trust tuple:

- Provider: GitHub Actions
- Organization or user: `christopherjnelson`
- Repository: `n8n-nodes-sleeper`
- Workflow filename: `release.yml`
- Environment: `npm-release`
- Allowed action: `npm stage publish` only; direct `npm publish` is not allowed

The filename in npm is only `release.yml`, not its repository path. Names and casing must remain
exact, and only one trusted publisher may be configured. The package's Publishing Access setting
is owner-confirmed as **Require two-factor authentication and disallow tokens**. Repository and
environment secret counts are zero, and the workflow contains no token fallback.

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
   `n8n-nodes-sleeper`, and keep the prerelease dist-tag choice at `next`.
4. Let the protected GitHub-hosted job verify the annotated tag, selected source, unpublished
   version, quality gates, and exact tarball before GitHub OIDC runs `npm stage publish`.
5. Inspect the staged package on npm. Approval is a separate owner action and must be completed
   manually with 2FA through npm's website or supported interactive tooling.
6. After approval, verify the public version, tarball, signatures, provenance, and intended
   dist-tags from a clean consumer environment.
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

## Tooling requirements

Trusted publishing requires a GitHub-hosted runner, `id-token: write`, Node.js 22.14 or newer,
and npm 11.5.1 or newer. Staged publishing requires npm 11.15.0 or newer. The workflow pins
Node.js 24 and npm 11.16.0, grants `contents: read` and `id-token: write` only to the protected
stage job, and relies on npm-generated provenance for trusted publication.

## Dist-tag policy

Future prerelease and community-testing versions use `next`. Use `latest` only after explicit
stable-release approval; never promote a prerelease silently. npm currently maps both `next` and
`latest` to `0.1.1`. No dist-tag should be mutated without an explicitly approved release or
promotion task.

## Historical note

Version `0.1.0` required a one-time token publication because trusted and staged publishing can
only be configured after a package exists. That temporary token and GitHub secret were removed
and revoked. This is historical evidence, not an available release path.

## Recovery

npm versions are immutable. For a bad release, do not approve a pending stage. If the version is
already public, stop promotion, deprecate it when appropriate, publish a fixed new version, and
document the incident in `CHANGELOG.md`. Never reuse a version or move its tag.
