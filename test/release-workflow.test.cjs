const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const workflow = fs.readFileSync(
	path.resolve(__dirname, '../.github/workflows/release.yml'),
	'utf8',
);

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
		/release_mode:[\s\S]*?default: dry-run[\s\S]*?options:\n\s+- dry-run\n\s+- trusted-stage/,
	);
	assert.match(workflow, /npm_dist_tag:[\s\S]*?default: next[\s\S]*?options:\n\s+- next/);
	assert.match(workflow, /package_confirmation:[\s\S]*?required: true/);
	assert.doesNotMatch(workflow, /first-publish|trusted-publish/);
	assert.doesNotMatch(workflow, /^\s+- latest\s*$/m);
});

test('quality job verifies intent and runs every gate before packaging', () => {
	const quality = job('quality', 'trusted-stage');
	assert.match(quality, /runs-on: ubuntu-latest/);
	assert.match(quality, /permissions:\n\s+contents: read/);
	assert.doesNotMatch(quality, /environment: npm-release|id-token: write/);
	assert.match(quality, /PACKAGE_CONFIRMATION[\s\S]*Package confirmation must exactly match/);
	assert.match(quality, /REF_TYPE[\s\S]*Dry runs must use the main branch/);
	assert.match(quality, /expected_tag="v\$\{package_version\}"/);
	assert.match(quality, /git cat-file -t "\$REF_NAME"[\s\S]*must be an annotated tag/);
	assert.match(quality, /git rev-parse "\$\{REF_NAME\}\^\{commit\}"/);
	assert.match(quality, /npm view "\$\{package_name\}@\$\{package_version\}" version --json/);
	assert.match(quality, /npm stage list "\$package_name" --json/);

	const orderedGates = [
		'pnpm install --frozen-lockfile',
		'pnpm run validate',
		'pnpm run typecheck',
		'pnpm run lint',
		'pnpm run format:check',
		'pnpm run test',
		'pnpm run build',
		'pnpm run package:check',
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

test('trusted-stage is environment-protected, least-privilege, and stage-only', () => {
	const trustedStage = job('trusted-stage');
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
