# Releasing

No release command in this document is authorized until the owner explicitly approves Phase 2B.
The workflow at `.github/workflows/release.yml` is manual-only and defaults to `dry-run` with
the `next` dist tag.

## Before a remote repository exists

1. Run every local gate and review the exact npm tarball contents.
2. Confirm the worktree is clean and the intended version is recorded in `package.json` and
   `CHANGELOG.md`.
3. Recheck that `n8n-nodes-sleeper` is available on npm.
4. Do not publish, create a tag, configure npm ownership, or create a token.

## Before the first publish

A brand-new npm package cannot have trusted publishing or staged publishing configured. After
explicit owner approval:

1. Create the public GitHub repository at the exact URL in `package.json`.
2. Push the reviewed commits.
3. Configure branch protection.
4. Create the `npm-release` GitHub environment and require reviewers.
5. Enable 2FA on the npm owner account.
6. Create a short-lived granular npm token limited to the initial publication. Do not use a
   classic token.
7. Store it only as the repository secret `NPM_TOKEN`.
8. Confirm the workflow remains `.github/workflows/release.yml`.
9. Create and push `v<package-version>` only after release approval.
10. Manually run `first-publish` from that tag, enter `n8n-nodes-sleeper` exactly, and select
    `next`.
11. Verify the npm package contents, dist tag, repository link, signatures, and provenance.
12. Revoke the transitional token immediately and remove `NPM_TOKEN` from GitHub.

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
