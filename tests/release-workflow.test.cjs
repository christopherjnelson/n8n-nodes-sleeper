const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const workflow = fs.readFileSync(
	path.resolve(__dirname, '../.github/workflows/release.yml'),
	'utf8',
);
const publishedScanner = fs.readFileSync(
	path.resolve(__dirname, '../scripts/scan-published.mjs'),
	'utf8',
);
const publishedSmoke = fs.readFileSync(
	path.resolve(__dirname, '../scripts/published-package-smoke.mjs'),
	'utf8',
);
const releaseTagGuard = fs.readFileSync(
	path.resolve(__dirname, '../scripts/verify-release-tag.mjs'),
	'utf8',
);
const ciWorkflow = fs.readFileSync(path.resolve(__dirname, '../.github/workflows/ci.yml'), 'utf8');

function job(name, nextName) {
	const start = workflow.indexOf(`\n  ${name}:`);
	assert.notEqual(start, -1, `missing ${name} job`);
	const end = nextName ? workflow.indexOf(`\n  ${nextName}:`, start + 1) : workflow.length;
	assert.notEqual(end, -1, `missing ${nextName} job boundary`);
	return workflow.slice(start, end);
}

test('release workflow is manual-only with safe defaults', () => {
	assert.match(workflow, /^on:\n  workflow_dispatch:/m);
	assert.doesNotMatch(workflow, /^  (?:push|pull_request|pull_request_target|release):/m);
	assert.match(
		workflow,
		/release_mode:[\s\S]*?default: dry-run[\s\S]*?options:\n\s+- dry-run\n\s+- trusted-stage\n\s+- verify-published/,
	);
	assert.match(
		workflow,
		/npm_dist_tag:[\s\S]*?default: next[\s\S]*?options:\n\s+- next\n\s+- latest/,
	);
	assert.match(workflow, /package_confirmation:[\s\S]*?required: true/);
	assert.doesNotMatch(workflow, /first-publish|trusted-publish/);
	assert.doesNotMatch(workflow, /setup-node@v6[\s\S]*registry-url:/);
	assert.match(ciWorkflow, /quality:[\s\S]*node-version: \['22\.22\.0', '24'\]/);
	assert.match(
		ciWorkflow,
		/\n  build:\n\s+name: build\n\s+needs: quality\n\s+if: \$\{\{ success\(\) \}\}/,
	);
});

test('quality job verifies intent and runs every gate before packaging', () => {
	const quality = job('quality', 'trusted-stage');
	assert.match(quality, /runs-on: ubuntu-latest/);
	assert.match(quality, /permissions:\n\s+contents: read/);
	assert.doesNotMatch(quality, /environment: npm-release|id-token: write/);
	assert.match(quality, /PACKAGE_CONFIRMATION[\s\S]*Package confirmation must exactly match/);
	assert.match(quality, /REF_TYPE[\s\S]*Dry runs must use the main branch/);
	assert.match(releaseTagGuard, /\['fetch', '--no-tags', 'origin', 'main'\]/);
	assert.match(releaseTagGuard, /cat-file', '-t', expectedRef/);
	assert.match(releaseTagGuard, /origin\/main commit/);
	const tagGuard = quality.indexOf('node scripts/verify-release-tag.mjs');
	const checkout = quality.indexOf('actions/checkout@v6');
	const setup = quality.indexOf('pnpm/action-setup@v4');
	assert.ok(tagGuard > checkout && tagGuard < setup);
	assert.match(quality, /fetch-depth: 0/);
	assert.match(quality, /npm view "\$\{package_name\}@\$\{package_version\}" version --json/);
	assert.match(quality, /npm stage list "\$package_name" --json/);

	const orderedGates = [
		'pnpm install --frozen-lockfile',
		'pnpm run validate',
		'pnpm run typecheck',
		'pnpm run lint',
		'pnpm run format:check',
		'pnpm run test',
		'pnpm run review:source',
		'pnpm run build',
		'pnpm run scan:source',
		'pnpm run smoke:load',
		'pnpm run smoke:install',
		'pnpm run package:check',
		'pnpm run release:check',
		'npm pack --json',
		'actions/upload-artifact@v4',
	];
	let previous = -1;
	for (const command of orderedGates) {
		const current = quality.indexOf(command);
		assert.ok(current > previous, `missing or out-of-order release gate: ${command}`);
		previous = current;
	}
});

test('trusted-stage and post-publication verification preserve release boundaries', () => {
	const trustedStage = job('trusted-stage', 'verify-published');
	const verifier = job('verify-published');
	assert.match(trustedStage, /if: inputs\.release_mode == 'trusted-stage'/);
	assert.match(trustedStage, /needs: quality/);
	assert.match(trustedStage, /runs-on: ubuntu-latest/);
	assert.match(trustedStage, /environment: npm-release/);
	assert.match(trustedStage, /permissions:\n\s+contents: read\n\s+id-token: write/);
	assert.match(trustedStage, /npm install --global npm@11\.16\.0/);
	assert.match(trustedStage, /sha256sum --check --strict[\s\S]*tar -tzf/);
	assert.match(
		trustedStage,
		/npm stage publish "\$PACKAGE_TARBALL" --provenance --access public --tag "\$NPM_DIST_TAG"/,
	);
	assert.match(verifier, /if: inputs\.release_mode == 'verify-published'/);
	assert.match(verifier, /timeout-minutes: 30[\s\S]*permissions:\n\s+contents: read/);
	assert.doesNotMatch(verifier, /environment: npm-release|id-token: write|npm stage publish/);
	assert.ok(
		verifier.indexOf('node scripts/verify-release-tag.mjs') <
			verifier.indexOf('pnpm/action-setup@v4'),
	);
	assert.match(verifier, /pnpm install --frozen-lockfile/);
	assert.match(verifier, /metadata\['dist-tags\.latest'\][\s\S]*SLSA provenance v1 is missing/);
	assert.match(verifier, /node scripts\/published-package-smoke\.mjs/);
	assert.match(publishedSmoke, /npm[\s\S]*pack[\s\S]*packageSpec/);
	assert.match(publishedSmoke, /scripts\/validate-pack\.mjs/);
	assert.match(publishedSmoke, /npm[\s\S]*install[\s\S]*--ignore-scripts/);
	assert.match(publishedSmoke, /scripts\/node-load-smoke\.mjs/);
	assert.doesNotMatch(publishedSmoke, /pnpm run build|prepublish|npm publish/);
	assert.match(verifier, /pnpm run scan:published/);
	assert.match(publishedScanner, /@n8n\/scan-community-package@0\.38\.0/);
	assert.match(publishedScanner, /360_000/);
	assert.match(
		trustedStage,
		/PACKAGE_TARBALL: \.\/package-tarball\/\$\{\{ needs\.quality\.outputs\.tarball \}\}/,
	);

	assert.doesNotMatch(workflow, /(?:^|[\s:])npm publish\b/m);
	assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN|secrets\./);
	assert.doesNotMatch(workflow, /npm stage (?:approve|reject)/);
	assert.doesNotMatch(workflow, /npm dist-tag/);
	assert.doesNotMatch(workflow, /contents: write|packages: write/);
	assert.doesNotMatch(workflow, /npm_[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]+/i);
});
