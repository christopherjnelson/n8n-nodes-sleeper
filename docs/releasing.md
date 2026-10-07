# Releasing

The permanent release path is tag-gated, tokenless, and publishes directly through GitHub OIDC.
Pushing a reviewed annotated `v<package-version>` tag starts `.github/workflows/release.yml`;
there is no manual dispatch, staged-package approval, or dist-tag selection. Stable publication
uses `latest`.

## Trusted-publisher binding

npm is configured by the package owner with this exact trust tuple:

- Provider: GitHub Actions
- Organization or user: `christopherjnelson`
- Repository: `n8n-nodes-sleeper`
- Workflow filename: `release.yml`
- Environment: `npm-release`
- Allowed action: direct `npm publish` and dist-tag updates

The filename in npm is only `release.yml`, not its repository path. Names and casing must remain
exact. The package owner has updated npm's Trusted Publisher permissions to allow direct
publication and dist-tag changes. Publishing remains tokenless through GitHub OIDC; do not add a
token fallback. GitHub's `setup-node` action sets a dummy `NODE_AUTH_TOKEN` even without a secret;
the release helper treats that exact dummy value as empty and removes only npm's matching auth
placeholder so OIDC can authenticate.

The `npm-release` GitHub environment accepts only `v*` tags. It intentionally has no required
reviewer because a sole-maintainer reviewer rule could deadlock recovery; administrator recovery
remains available. Do not broaden its deployment policy or add credential variables.

## Release procedure

Use this procedure only for a legitimate, reviewed new package version:

1. Update the version and changelog, then run every local quality and package gate.
2. Review and approve the source and CI on the exact release commit. Create a new annotated
   `v<package-version>` tag and push it; never move, delete, or reuse an existing release tag.
3. The tag push runs quality gates, checks that the tag is annotated and matches the package
   version, verifies the version is not already published, builds and inspects the exact package,
   then publishes directly to npm with provenance and the `latest` tag through GitHub OIDC in the
   `npm-release` environment.
4. A separate read-only job verifies registry metadata, repository identity, SLSA provenance,
   packed node/icon contents, and the official published-package scanner's exact success text.
   If verification fails, use GitHub Actions' **Re-run failed jobs**; the successful publication
   job is not repeated.
5. The GitHub Release is created only after publication verification succeeds. Record the release
   evidence and any manual n8n/Creator Portal follow-up.

The workflow fails for a version that is already public. npm versions are immutable; never try to
publish the same version again or move its tag.

## Historical staged-release evidence

Versions `0.1.1`, `0.2.0`, and `0.2.1` used the former trusted-stage flow. These records explain
past publication evidence only; the active procedure above uses direct OIDC publication.

### v0.1.1

Version `0.1.1` proved this process end to end. The trust binding used workflow filename
`release.yml` and environment `npm-release`; GitHub OIDC created the staged package, and the
owner approved it separately with npm 2FA. An earlier environment-field misspelling caused
`ENEEDAUTH` because npm saves trusted-publisher values without validating them. After correcting
that field, the immutable annotated `v0.1.1` tag was safely reused because it still targeted the
same reviewed commit; the tag was never moved or recreated.

### v0.2.0

Version `0.2.0` proved the unchanged release path again. The dry run succeeded, the immutable
annotated tag passed the workflow checks, and the protected trusted-stage job used GitHub OIDC to
create the staged package through the `npm-release` environment. The owner approved that stage
separately with npm 2FA. After publication, the public registry tarball matched the validated local,
dry-run, and trusted-stage candidate byte-for-byte. These are version-specific results, not new
generic release requirements.

### v0.2.1

Version `0.2.1` used annotated tag object `dd13a4d160cd01862abed7433e18255f02f88e9d`
at main commit `d8beba091de16715cb9574bfd45e4751af23c5be`. Main CI `34192040787`, dry-run
`34192333086`, and the single trusted-stage run `34192643479` succeeded. That stage had ID
`0c5efd9b-fea8-4e85-86c5-5def5e60c533`, and the owner approved it separately with npm 2FA.
Read-only verifier `34193865267` then passed registry metadata, SLSA v1 provenance, package
boundary/install/load/icon checks, and the official scanner's exact success requirement.

## Tooling requirements

Trusted publishing requires a GitHub-hosted runner, `id-token: write`, Node.js 22.14 or newer,
and npm 11.5.1 or newer. The workflow pins Node.js 24.18.0 and npm 11.19.0, grants
`contents: read` and `id-token: write` to the publication job, and relies on npm-generated
provenance.

The source and built-package scanner is pinned to `@n8n/scan-community-package` 0.38.0. The
published-package verifier retries only the exact missing-version metadata response and a 404
from the provenance source repository. Generic scanner-analysis errors, including 404 responses,
are terminal. Retries share a 360-second deadline, each scanner process is bounded by the
remaining time, and success requires both exit status zero and the
scanner's explicit success text. Other failures are terminal.

## Dist-tag policy

The automated release publishes to `latest`; the workflow has no alternate dist-tag input and
does not run a separate promotion step. npm was last verified on 2026-10-07 with `next` at `0.2.0`
and `latest` at stable `0.2.1`. Those selectors are dated registry evidence and must be checked
live before relying on them. As of 2026-10-07, the merged `0.3.0` source was unpublished.

## Template homepage divergence

The template recommends a live node-catalog homepage. The expected catalog URL,
`https://blackswampai.com/n8n-nodes/sleeper/`, returned HTTP 404 when checked on 2026-09-08.
Until that page is live and verified, package metadata intentionally retains the public GitHub
repository as its homepage. This is a release-documentation divergence from the template.

## Historical note

Version `0.1.0` required a one-time token publication because trusted publishing could only be
configured after a package existed. That temporary token and GitHub secret were removed and
revoked. This is historical evidence, not an available release path.

## Recovery

npm versions are immutable. If a version is already public, publish a fixed new version and
document the incident in `CHANGELOG.md`. Never reuse a version or move its tag.
