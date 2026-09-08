const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const packageMetadata = require('../package.json');

const projectRoot = path.resolve(__dirname, '..');
const sleeperNodeType = 'n8n-nodes-sleeper.sleeper';
const allowedOperations = {
	avatar: new Set(['getUrl']),
	draft: new Set(['get', 'getManyForLeague', 'getManyForUser']),
	draftPick: new Set(['getMany']),
	draftTradedPick: new Set(['getMany']),
	league: new Set(['get', 'getManyForUser']),
	leagueUser: new Set(['getMany']),
	matchup: new Set(['getMany']),
	player: new Set(['getMany', 'getTrending']),
	playoff: new Set(['getBracket']),
	roster: new Set(['getMany']),
	sport: new Set(['getState']),
	tradedPick: new Set(['getMany']),
	transaction: new Set(['getMany']),
	user: new Set(['get']),
};

function read(relativePath) {
	return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function walkValues(value, visitor) {
	visitor(value);
	if (Array.isArray(value)) {
		for (const entry of value) walkValues(entry, visitor);
	} else if (value !== null && typeof value === 'object') {
		for (const entry of Object.values(value)) walkValues(entry, visitor);
	}
}

test('all committed example workflows are inactive, credential-free, and use known operations', () => {
	const exampleDirectory = path.join(projectRoot, 'examples');
	const filenames = fs
		.readdirSync(exampleDirectory)
		.filter((name) => name.endsWith('.json'))
		.sort();
	assert.deepEqual(filenames, [
		'get-nfl-state.json',
		'get-trending-players.json',
		'get-user-leagues.json',
	]);

	for (const filename of filenames) {
		const workflow = JSON.parse(fs.readFileSync(path.join(exampleDirectory, filename), 'utf8'));
		assert.equal(workflow.active, false, `${filename} must be inactive`);
		assert.ok(Array.isArray(workflow.nodes) && workflow.nodes.length >= 2);
		assert.ok(workflow.nodes.some((node) => node.type === sleeperNodeType));
		assert.equal(Object.hasOwn(workflow, 'credentials'), false);
		assert.equal(Object.hasOwn(workflow, 'webhookId'), false);

		walkValues(workflow, (value) => {
			if (value !== null && typeof value === 'object') {
				assert.equal(Object.hasOwn(value, 'credentials'), false, `${filename} embeds credentials`);
				assert.equal(Object.hasOwn(value, 'webhookId'), false, `${filename} embeds a webhook ID`);
			}
		});

		for (const node of workflow.nodes.filter((entry) => entry.type === sleeperNodeType)) {
			const resource = node.parameters.resource;
			const operation = node.parameters.operation;
			assert.ok(
				allowedOperations[resource]?.has(operation),
				`${filename}: ${resource}/${operation}`,
			);
			assert.equal(node.typeVersion, 1);
		}
	}

	const userWorkflow = JSON.parse(read('examples/get-user-leagues.json'));
	assert.match(JSON.stringify(userWorkflow), /REPLACE_WITH_SLEEPER_USERNAME/);
	assert.match(JSON.stringify(userWorkflow), /\$json\.user_id/);
	assert.doesNotMatch(JSON.stringify(userWorkflow), /@|password|token|cookie/i);

	const trendingWorkflow = JSON.parse(read('examples/get-trending-players.json'));
	assert.match(JSON.stringify(trendingWorkflow), /Data from Sleeper/);
	assert.equal(
		trendingWorkflow.nodes.find((node) => node.type === sleeperNodeType).parameters.resultLimit,
		5,
	);
});

test('README has current release-status sections and every relative link resolves', () => {
	const readme = read('README.md');
	for (const heading of [
		'Status',
		'Features',
		'Installation',
		'Supported operations',
		'Usage examples',
		'Community workflow examples',
		'Player data guidance',
		'Trending players and attribution',
		'Rate guidance',
		'Error behavior',
		'Privacy and public data',
		'Community testing',
		'AI-tool use',
		'Compatibility',
		'Limitations',
		'Development',
		'Release and provenance',
		'Contributing',
		'License',
		'Attribution',
		'Non-affiliation',
	]) {
		assert.match(readme, new RegExp(`^## ${heading}$`, 'm'));
	}
	assert.equal(packageMetadata.version, '0.2.0');
	assert.match(readme, /npm install n8n-nodes-sleeper$/m);
	assert.match(readme, /npm install n8n-nodes-sleeper@next/);
	assert.match(readme, /npm install n8n-nodes-sleeper@0\.2\.0/);
	assert.match(readme, /Settings → Community Nodes/);
	assert.match(
		readme,
		/npm's `latest` and `next` tags both resolve to the\s+same immutable `0\.2\.0`/i,
	);
	assert.match(readme, /default npm install receives `0\.2\.0`/i);
	assert.match(readme, /remains a verified n8n community node/i);
	assert.match(
		readme,
		/currently\s+approved n8n Cloud version has not yet been\s+updated to `0\.2\.0`/i,
	);
	assert.doesNotMatch(readme, /`0\.2\.0` is available directly in n8n Cloud/i);
	assert.match(readme, /npm `0\.2\.0` is publicly published/i);
	assert.match(
		readme,
		/Draft Pick Made[\s\S]*Transaction Created or Updated[\s\S]*League Status Changed[\s\S]*NFL Week Changed/,
	);
	assert.match(readme, /complete Phase 1 Sleeper Trigger/i);
	assert.match(readme, /docs\/community-testing\.md/);

	for (const match of readme.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
		const target = match[1];
		if (/^(?:https?:|mailto:|#)/.test(target)) continue;
		const fileTarget = target.split('#')[0];
		assert.ok(fs.existsSync(path.join(projectRoot, fileTarget)), `README link missing: ${target}`);
	}
});

test('community-testing documentation and structured issue forms remain complete', () => {
	const guide = read('docs/community-testing.md');
	for (const heading of [
		'Release under test',
		'Installation methods',
		'Requested test coverage',
		'Privacy and test-data rules',
		'Known limitations',
		'Success criteria',
	]) {
		assert.match(guide, new RegExp(`^## ${heading}$`, 'm'));
	}
	assert.match(guide, /18 direct operations across 14 resources/);
	assert.match(guide, /n8n-nodes-sleeper@next/);
	assert.match(guide, /n8n-nodes-sleeper@0\.2\.0/);
	assert.match(guide, /private vulnerability reporting/);
	assert.match(guide, /Status: stable\/default release on npm/);
	assert.match(guide, /currently approved Cloud version has not yet been updated to\s+`0\.2\.0`/);
	assert.match(guide, /npm `latest → 0\.2\.0` and `next → 0\.2\.0`/);
	assert.match(
		guide,
		/npm `latest`, npm `next`, and the default installer all resolve to `0\.2\.0`/,
	);
	assert.match(guide, /^## 0\.2\.0 stable release$/m);
	assert.match(guide, /Naturally occurring events[\s\S]*not a\s+condition for installing/i);

	const templateDirectory = path.join(projectRoot, '.github', 'ISSUE_TEMPLATE');
	assert.deepEqual(fs.readdirSync(templateDirectory).sort(), [
		'bug.yml',
		'compatibility.yml',
		'config.yml',
		'feature_request.yml',
	]);

	const bug = read('.github/ISSUE_TEMPLATE/bug.yml');
	for (const id of [
		'n8n_version',
		'package_version',
		'node_version',
		'deployment_type',
		'operation',
		'expected',
		'observed',
		'reproduction',
		'execution_output',
		'sensitive_data',
	]) {
		assert.match(bug, new RegExp(`^    id: ${id}$`, 'm'));
	}

	const compatibility = read('.github/ISSUE_TEMPLATE/compatibility.yml');
	for (const id of [
		'n8n_version',
		'node_version',
		'install_method',
		'platform',
		'package_load',
		'tested_operations',
		'overall_status',
	]) {
		assert.match(compatibility, new RegExp(`^    id: ${id}$`, 'm'));
	}

	const feature = read('.github/ISSUE_TEMPLATE/feature_request.yml');
	for (const id of [
		'workflow_problem',
		'desired_behavior',
		'sleeper_endpoint',
		'request_type',
		'use_case',
	]) {
		assert.match(feature, new RegExp(`^    id: ${id}$`, 'm'));
	}

	const config = read('.github/ISSUE_TEMPLATE/config.yml');
	assert.match(config, /^blank_issues_enabled: false$/m);
	assert.match(config, /security\/advisories\/new/);
});

test('trigger and release guidance distinguish current status from historical evidence', () => {
	const triggerGuide = read('docs/sleeper-trigger.md');
	for (const statement of [
		/Transaction Created or Updated/,
		/GET \/league\/\{league_id\}\/transactions\/\{round\}/,
		/League Status Changed/,
		/NFL Week Changed/,
		/GET \/state\/nfl/,
		/season[\s\S]*season_type[\s\S]*week/,
		/pre = 0[\s\S]*regular = 1[\s\S]*post = 2/,
		/Week 0 is valid/,
		/display_week[\s\S]*can differ from `week`/,
		/tracks the season-aware `week` field/,
		/GET \/league\/\{league_id\}/,
		/pre_draft[\s\S]*drafting[\s\S]*in_season[\s\S]*complete/,
		/highestObservedLeagueStatus/,
		/lower statuses are treated as stale or out of order/i,
		/exactly one\s+request per poll/,
		/first production poll establishes/,
		/status_updated/,
		/1,000 tracked IDs/,
		/no\s+current-week lookup yet/,
		/not instant backend delivery/,
		/no player, roster, owner, or team enrichment/,
	]) {
		assert.match(triggerGuide, statement);
	}

	const plan = read('docs/0.2.0-plan.md');
	assert.match(plan, /Phase 1A — Draft Pick Made ✅ implementation complete/);
	assert.match(plan, /Phase 1B — Transaction Created or Updated ✅ implementation complete/);
	assert.match(plan, /Phase 1C — League Status Changed ✅ implementation complete/);
	assert.match(plan, /Phase 1D — NFL Week Changed ✅ implementation complete/);
	assert.match(plan, /All four Phase 1 events are implementation-complete/);
	assert.match(plan, /Phase 2,\s+Phase 3, and Phase 4 remain future work/);
	assert.match(plan, /publicly available in stable npm `0\.2\.0`/);
	assert.match(plan, /does not add current-week lookup, filters,\s+backend webhooks/);

	const readiness = read('docs/release-readiness.md');
	assert.match(readiness, /^## Current project status — 2026-08-08$/m);
	assert.match(readiness, /^## 0\.2\.0 post-publication checkpoint — 2026-08-08$/m);
	assert.match(readiness, /fe410fd6e5d87a29a15978ef051d0f6c7ed855fa/);
	assert.match(readiness, /passed 182 tests/);
	assert.match(readiness, /`next → 0\.2\.0`/);
	assert.match(readiness, /`latest → 0\.2\.0`/);
	assert.match(readiness, /^## 0\.2\.0 stable-promotion checkpoint — 2026-08-08$/m);
	assert.match(readiness, /release ID `367310296`/);
	assert.match(readiness, /19977e8a69f5dcd5d655bb201caa9d48e00dd74bd7d652428bc1311536018c16/);
	assert.match(readiness, /dated sections below are preserved as historical checkpoint evidence/);
	assert.match(readiness, /Historical checkpoint: Phase 2B-4/);

	const releasing = read('docs/releasing.md');
	assert.match(releasing, /npm currently maps `next` to `0\.2\.0`\s+and `latest` to `0\.2\.0`/);
});

test('package files intentionally exclude source, tests, examples, and release documentation', () => {
	assert.deepEqual(packageMetadata.files, [
		'dist/nodes/**/*.js',
		'dist/nodes/**/*.json',
		'dist/nodes/**/*.png',
		'README.md',
		'LICENSE',
		'CHANGELOG.md',
	]);
	assert.deepEqual(packageMetadata.dependencies ?? {}, {});
	assert.equal(packageMetadata.scripts.prepublishOnly, 'n8n-node prerelease');
});
