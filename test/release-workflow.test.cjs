const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const workflow = fs.readFileSync(
	path.resolve(__dirname, '../.github/workflows/release.yml'),
	'utf8',
);

test('release workflow is manual-only, fail-closed, and separates token from OIDC publishing', () => {
	assert.match(workflow, /^on:\n  workflow_dispatch:/m);
	assert.doesNotMatch(workflow, /^  (?:push|pull_request|pull_request_target|release):/m);
	assert.match(workflow, /release_mode:[\s\S]*default: dry-run/);
	assert.match(workflow, /npm_dist_tag:[\s\S]*default: next/);
	assert.match(workflow, /package_confirmation:[\s\S]*required: true/);
	assert.match(workflow, /PACKAGE_CONFIRMATION[\s\S]*n8n-nodes-sleeper|package_name/);
	assert.match(workflow, /REF_TYPE[\s\S]*expected_tag="v\$\{package_version\}"/);
	assert.match(workflow, /npm view "\$\{package_name\}@\$\{package_version\}" version/);

	for (const command of [
		'pnpm install --frozen-lockfile',
		'pnpm run validate',
		'pnpm run typecheck',
		'pnpm run lint',
		'pnpm run format:check',
		'pnpm run test',
		'pnpm run build',
		'pnpm run package:check',
		'npm pack --json',
	]) {
		assert.ok(workflow.includes(command), `missing release gate: ${command}`);
	}

	const firstPublish = workflow.slice(
		workflow.indexOf('\n  first-publish:'),
		workflow.indexOf('\n  trusted-publish:'),
	);
	assert.match(firstPublish, /secrets\.NPM_TOKEN/);
	assert.match(firstPublish, /npm publish .*--provenance --access public --tag/);
	assert.match(firstPublish, /environment: npm-release/);

	const trustedPublish = workflow.slice(workflow.indexOf('\n  trusted-publish:'));
	assert.match(trustedPublish, /id-token: write/);
	assert.match(trustedPublish, /npm publish .*--provenance --access public --tag/);
	assert.doesNotMatch(trustedPublish, /NODE_AUTH_TOKEN|secrets\.NPM_TOKEN/);
	assert.doesNotMatch(workflow, /contents: write|packages: write/);
	assert.doesNotMatch(workflow, /npm_[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]+/i);
});
