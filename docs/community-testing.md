# Community testing

## Release under test

- Package: `n8n-nodes-sleeper`
- Version: `0.1.1`
- Status: public prerelease for community testing; not n8n verified
- Coverage: 18 direct operations across 14 resources
- Scope: read-only public Sleeper data, no credentials, and an NFL-first visible interface
- Not included: trigger nodes, writes, joins, enrichment, or composite convenience operations

## Installation methods

### n8n Community Nodes interface

In a self-hosted n8n instance, open **Settings → Community Nodes**, choose the option to
install a community node, and enter:

```text
n8n-nodes-sleeper
```

The normal installer currently resolves `0.1.0` because npm's required `latest` tag points to
the original prerelease. This is not a stable-release promotion.

### npm testing

Use the prerelease testing tag:

```bash
npm install n8n-nodes-sleeper@next
```

Creator Portal correction testers should use this selector, which currently resolves to
`0.1.1`, or the exact selector below. Version `0.1.1` remains a community-testing prerelease.

### Exact-version testing

For reproducible testing, pin the public version:

```bash
npm install n8n-nodes-sleeper@0.1.1
```

## Requested test coverage

Please include the following in compatibility or bug reports:

- n8n version and deployment type
- Node.js version and operating system or container image
- package installation method and resolved package version
- resource and operation tested
- whether Sleeper appeared exactly once in node search
- whether both light and dark icons behaved correctly
- sanitized input configuration and reproduction steps
- observed output shape and expected output shape
- error behavior and, when tested, `continueOnFail()` behavior
- AI-tool behavior, when tested

Use the repository's
[issue forms](https://github.com/christopherjnelson/n8n-nodes-sleeper/issues/new/choose) so reports
contain enough environment and reproduction detail to triage. General coordination and links to
new reports belong in the pinned
[v0.1.0 community-testing issue](https://github.com/christopherjnelson/n8n-nodes-sleeper/issues/1).

## Privacy and test-data rules

Sleeper endpoints expose public data, but public issue reports should still minimize identifying
information. Do not post private league IDs unnecessarily, and redact usernames, league names,
or other identifying data. Never paste account cookies, tokens, credentials, or complete
production execution data.

Report security issues through
[private vulnerability reporting](https://github.com/christopherjnelson/n8n-nodes-sleeper/security/advisories/new),
not a public issue.

## Known limitations

- The package is read-only and exposes only NFL in its visible sport choices.
- It has no write operations, triggers, joins, enrichment, or composite convenience operations.
- Sleeper documents no single-player endpoint; the node does not invent one.
- **Player → Get Many** can return a large map. Use server-side filters, avoid unnecessary
  polling, and generally fetch the full player map no more than once daily.
- One reviewed moderate `uuid` alert remains through upstream n8n development tooling. It is not
  a runtime dependency and is absent from the published tarball.
- npm `next` resolves to `0.1.1`, while `latest` intentionally remains at `0.1.0`. No stable
  promotion command was run.

## Success criteria

The prerelease can advance after feedback demonstrates:

- multiple clean installations
- successful loading in more than one supported n8n environment
- no confirmed data corruption, packaging failure, or node-loading failure
- no security regression
- no unresolved high-severity release blocker

These are goals for community testing, not claims about tester counts already achieved.
