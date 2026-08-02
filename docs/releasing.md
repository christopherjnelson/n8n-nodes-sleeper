# Releasing

No release command in this document is authorized until the owner explicitly approves Phase 2B-2.
The workflow at `.github/workflows/release.yml` is manual-only and defaults to `dry-run` with
the `next` dist tag.

## Repository publication status

The source is public at
`https://github.com/christopherjnelson/n8n-nodes-sleeper`. GitHub Actions CI passed on the
initial pushed history, private vulnerability reporting is enabled, and the `npm-release`
environment accepts only tags matching `v*`. The environment has no required reviewer because a
sole-maintainer reviewer rule could deadlock recovery, and it has no npm secret.

The npm package remains unpublished. No Git tag, GitHub release, npm token, npm trusted publisher,
or npm ownership has been created or configured.

## Before the first publish

A brand-new npm package cannot have trusted publishing or staged publishing configured. After
separate, explicit Phase 2B-2 owner approval:

1. Enable 2FA on the npm owner account.
2. Create a short-lived granular npm token limited to the initial publication. Do not use a
   classic token.
3. Store it only as the repository secret `NPM_TOKEN`.
4. Confirm the workflow remains `.github/workflows/release.yml`.
5. Create and push `v<package-version>` only after release approval.
6. Manually run `first-publish` from that tag, enter `n8n-nodes-sleeper` exactly, and select
   `next`.
7. Verify the npm package contents, dist tag, repository link, signatures, and provenance.
8. Revoke the transitional token immediately and remove `NPM_TOKEN` from GitHub.

The first-publish job uses `npm publish --provenance --access public --tag <tag>` with the
temporary token. It cannot run from a branch, cannot infer a tag, and refuses an already
published version.

## After the package exists

1. Configure npm trusted publishing for the exact public GitHub owner/repository,
   `release.yml`, and `npm-release` environment.
2. Prefer granting `--allow-stage-publish` only when the team wants npm's human approval gate;
   grant `--allow-publish` only when direct trusted publication is an explicit policy choice.
3. Confirm the case-sensitive `repository` URL in `package.json` exactly matches GitHub.
4. Remove `NPM_TOKEN` from GitHub and restrict traditional token publishing on npm.
5. Keep the workflow filename stable because npm binds trust to that filename.
6. Use `trusted-publish` only after the trust relationship exists. The job has no
   `NODE_AUTH_TOKEN` and authenticates with GitHub OIDC.
7. Verify provenance after every release with npm's package page and `npm audit signatures` in
   a clean consumer project.

Trusted publishing requires a GitHub-hosted runner, `id-token: write`, Node 22.14 or newer,
and npm 11.5.1 or newer. The workflow uses newer versions. npm automatically generates
provenance for trusted publication; the explicit `--provenance` flag records the project's
intent.

## Optional staged publishing

npm staged publishing adds a human 2FA approval after CI uploads a package but before it becomes
public. It requires an existing package, Node 22.14 or newer, and npm 11.15.0 or newer. It is
therefore unavailable for the first publication. If adopted later, change the reviewed trusted
job deliberately from `npm publish` to `npm stage publish`, grant only trusted
`--allow-stage-publish`, review the staged tarball, and approve it interactively with 2FA. Do
not silently fall back from staged to direct publication.

## Dist-tag policy

Use `next` for `0.x` community testing. Use `latest` only after explicit stable-release approval;
never promote a prerelease silently.

## Rollback

npm versions are immutable. For a bad release, stop promotion, deprecate the faulty version,
publish a fixed new version, and document the incident in `CHANGELOG.md`. Never attempt to
reuse the same version.
