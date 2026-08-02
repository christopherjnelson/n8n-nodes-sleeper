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

test('README has prerelease sections and every relative link resolves', () => {
	const readme = read('README.md');
	for (const heading of [
		'Status',
		'Features',
		'Installation',
		'Supported operations',
		'Usage examples',
		'Player data guidance',
		'Trending players and attribution',
		'Rate guidance',
		'Error behavior',
		'Privacy and public data',
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
	assert.match(readme, /not yet published to npm/i);
	assert.match(readme, /does not claim n8n verification/i);

	for (const match of readme.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
		const target = match[1];
		if (/^(?:https?:|mailto:|#)/.test(target)) continue;
		const fileTarget = target.split('#')[0];
		assert.ok(fs.existsSync(path.join(projectRoot, fileTarget)), `README link missing: ${target}`);
	}
});

test('package files intentionally exclude source, tests, examples, and release documentation', () => {
	assert.deepEqual(packageMetadata.files, [
		'dist/nodes/**/*.js',
		'dist/nodes/**/*.json',
		'dist/nodes/**/*.svg',
		'README.md',
		'LICENSE',
		'CHANGELOG.md',
	]);
	assert.deepEqual(packageMetadata.dependencies ?? {}, {});
	assert.equal(packageMetadata.scripts.prepublishOnly, 'n8n-node prerelease');
});
