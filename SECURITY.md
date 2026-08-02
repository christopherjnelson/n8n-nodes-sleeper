# Security policy

## Supported versions

Until the first public release, only the latest reviewed `0.1.x` prerelease line is intended to
receive security fixes. No unpublished commit should be treated as a supported production
release.

## Reporting a vulnerability

Do not open a public issue for an active vulnerability and do not paste credentials, tokens,
cookies, private identifiers, or other secrets into an issue.

This repository does not yet exist publicly, so GitHub private vulnerability reporting is not
currently available. After publication, use the repository's **Security → Report a
vulnerability** form if the owner has enabled it. Enabling and verifying that private channel
is a required human release check; this document does not claim it is already enabled.

Until that channel exists, retain the report privately and contact the repository owner through
an already-established private channel. Do not guess an address or disclose the vulnerability
publicly merely because no dedicated security address has been published.

Include the affected version or commit, impact, reproduction steps, relevant configuration,
and a minimal proof of concept with secrets removed. Reports may cover node code, package
contents, dependency or build behavior, and the GitHub Actions release workflow.
