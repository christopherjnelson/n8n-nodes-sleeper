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

test('release workflow starts only from semantic version tags', () => {
	assert.match(workflow, /^on:\n  push:\n    tags:\n      - 'v\*\.\*\.\*'/m);
	assert.doesNotMatch(
		workflow,
		/^  (?:workflow_dispatch|pull_request|pull_request_target|release):/m,
	);
	assert.doesNotMatch(workflow, /release_mode|npm_dist_tag|package_confirmation/);
	assert.match(workflow, /group: release-\$\{\{ github\.ref \}\}[\s\S]*cancel-in-progress: false/);
	assert.match(ciWorkflow, /quality:[\s\S]*node-version: \['22\.22\.0', '24'\]/);
	assert.match(
		ciWorkflow,
		/\n  build:\n\s+name: build\n\s+needs: quality\n\s+if: \$\{\{ success\(\) \}\}/,
	);
});

test('quality job guards the tag and runs every release gate before packaging', () => {
	const quality = job('quality', 'publish');
	assert.match(quality, /runs-on: ubuntu-latest/);
	assert.match(quality, /permissions:\n\s+contents: read/);
	assert.doesNotMatch(quality, /environment: npm-release|id-token: write/);
	assert.match(quality, /Verify annotated tag against current main/);
	assert.match(releaseTagGuard, /\['fetch', '--no-tags', 'origin', 'main'\]/);
	assert.match(releaseTagGuard, /cat-file', '-t', expectedRef/);
	assert.match(releaseTagGuard, /origin\/main commit/);
	const tagGuard = quality.indexOf('node scripts/verify-release-tag.mjs');
	const checkout = quality.indexOf('actions/checkout@v6');
	const setup = quality.indexOf('pnpm/action-setup@v4');
	assert.ok(tagGuard > checkout && tagGuard < setup);
	assert.match(quality, /fetch-depth: 0/);
	assert.match(quality, /npm view "\$\{package_name\}@\$\{package_version\}" version --json/);
	assert.doesNotMatch(quality, /npm stage/);

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
		'npm pack --json --pack-destination release-artifact',
		'actions/upload-artifact@v4',
	];
	let previous = -1;
	for (const command of orderedGates) {
		const current = quality.indexOf(command);
		assert.ok(current > previous, `missing or out-of-order release gate: ${command}`);
		previous = current;
	}
});

test('only the publish job receives npm OIDC and it publishes the inspected tarball to latest', () => {
	const publish = job('publish', 'verify-published');
	assert.match(publish, /needs: quality/);
	assert.match(publish, /environment: npm-release/);
	assert.match(publish, /permissions:\n\s+contents: read\n\s+id-token: write/);
	assert.equal((workflow.match(/id-token:\s*write/g) ?? []).length, 1);
	assert.match(publish, /registry-url: https:\/\/registry\.npmjs\.org/);
	assert.match(publish, /actions\/checkout@v6[\s\S]*scripts\/prepare-npm-auth\.mjs/);
	const checkout = publish.indexOf('actions/checkout@v6');
	const nodeSetup = publish.indexOf('actions/setup-node@v6');
	const authPreparation = publish.indexOf('node scripts/prepare-npm-auth.mjs');
	const npmInstall = publish.indexOf('npm install --global npm@11.19.0');
	const npmPublish = publish.indexOf('npm publish "$PACKAGE_TARBALL"');
	assert.ok(
		checkout >= 0 &&
			nodeSetup > checkout &&
			authPreparation > nodeSetup &&
			npmInstall > authPreparation &&
			npmPublish > npmInstall,
	);
	assert.match(publish, /sha256sum --check --strict[\s\S]*tar -tzf/);
	assert.match(
		publish,
		/run: npm publish "\$PACKAGE_TARBALL" --provenance --access public --tag latest/,
	);
	assert.match(
		publish,
		/PACKAGE_TARBALL: \.\/package-tarball\/\$\{\{ needs\.quality\.outputs\.tarball \}\}/,
	);
	assert.doesNotMatch(publish, /NPM_TOKEN|NODE_AUTH_TOKEN|secrets\.|npm stage/);
});

test('post-publish verification is read-only and GitHub release follows successful verification', () => {
	const verifier = job('verify-published', 'github-release');
	const githubRelease = job('github-release');
	assert.match(verifier, /needs: publish/);
	assert.match(verifier, /timeout-minutes: 30[\s\S]*permissions:\n\s+contents: read/);
	assert.doesNotMatch(verifier, /environment: npm-release|id-token: write|npm publish/);
	assert.match(verifier, /node scripts\/verify-published-release\.mjs/);
	assert.match(verifier, /pnpm run smoke:published/);
	assert.match(publishedSmoke, /npm[\s\S]*pack[\s\S]*packageSpec/);
	assert.match(publishedSmoke, /scripts\/validate-pack\.mjs/);
	assert.match(publishedSmoke, /npm[\s\S]*install[\s\S]*--ignore-scripts/);
	assert.match(publishedSmoke, /scripts\/node-load-smoke\.mjs/);
	assert.doesNotMatch(publishedSmoke, /pnpm run build|prepublish|npm publish/);
	assert.match(verifier, /pnpm run scan:published/);
	assert.match(publishedScanner, /@n8n\/scan-community-package@0\.38\.0/);
	assert.match(publishedScanner, /360_000/);
	assert.match(githubRelease, /needs: \[quality, verify-published\]/);
	assert.match(githubRelease, /permissions:\n\s+contents: write/);
	assert.doesNotMatch(githubRelease, /id-token: write|environment: npm-release/);
	assert.match(githubRelease, /gh release create "\$TAG" --verify-tag/);

	assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN|secrets\./);
	assert.doesNotMatch(workflow, /npm stage|npm dist-tag/);
	assert.match(
		workflow,
		/npm publish "\$PACKAGE_TARBALL" --provenance --access public --tag latest/,
	);
	assert.doesNotMatch(workflow, /npm_[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]+/i);
});
