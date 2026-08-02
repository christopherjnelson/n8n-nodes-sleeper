const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const packageMetadata = require('../package.json');
const nodeMetadata = require('../nodes/Sleeper/Sleeper.node.json');
const { Sleeper } = require('../dist/nodes/Sleeper/Sleeper.node.js');

const projectRoot = path.resolve(__dirname, '..');

test('registers the version 1 Sleeper node without credentials', () => {
	assert.equal(packageMetadata.name, 'n8n-nodes-sleeper');
	assert.deepEqual(packageMetadata.n8n.credentials, []);
	assert.deepEqual(packageMetadata.n8n.nodes, ['dist/nodes/Sleeper/Sleeper.node.js']);
	assert.equal(nodeMetadata.node, 'n8n-nodes-sleeper');
	assert.equal(nodeMetadata.nodeVersion, '1.0');
});

test('keeps the public workflow-facing resource and operation values stable', () => {
	const { description } = new Sleeper();
	const resource = description.properties.find((property) => property.name === 'resource');
	assert.deepEqual(
		resource.options.map((option) => option.value),
		[
			'avatar',
			'draft',
			'draftPick',
			'draftTradedPick',
			'league',
			'leagueUser',
			'matchup',
			'player',
			'playoff',
			'roster',
			'sport',
			'tradedPick',
			'transaction',
			'user',
		],
	);

	const operations = Object.fromEntries(
		description.properties
			.filter((property) => property.name === 'operation')
			.map((property) => [
				property.displayOptions.show.resource[0],
				property.options.map((option) => option.value),
			]),
	);
	assert.deepEqual(operations, {
		avatar: ['getUrl'],
		draft: ['get', 'getManyForLeague', 'getManyForUser'],
		draftPick: ['getMany'],
		draftTradedPick: ['getMany'],
		league: ['get', 'getManyForUser'],
		leagueUser: ['getMany'],
		matchup: ['getMany'],
		player: ['getMany', 'getTrending'],
		playoff: ['getBracket'],
		roster: ['getMany'],
		sport: ['getState'],
		tradedPick: ['getMany'],
		transaction: ['getMany'],
		user: ['get'],
	});

	const trendingLimit = description.properties.find(
		(property) =>
			property.name === 'resultLimit' &&
			property.displayOptions?.show?.resource?.includes('player'),
	);
	assert.equal(trendingLimit.displayName, 'Limit');
	assert.equal(trendingLimit.default, 25);
	assert.equal(description.usableAsTool, true);
	assert.equal(description.subtitle, 'Read-only public data');
});

test('uses safe original SVG icons for both n8n themes', () => {
	const { description } = new Sleeper();
	assert.deepEqual(description.icon, {
		light: 'file:sleeper.svg',
		dark: 'file:sleeper.dark.svg',
	});

	for (const iconName of ['sleeper.svg', 'sleeper.dark.svg']) {
		const iconPath = path.join(projectRoot, 'nodes', 'Sleeper', iconName);
		assert.ok(fs.existsSync(iconPath));
		const svg = fs.readFileSync(iconPath, 'utf8');
		assert.match(svg, /^<svg\b/);
		assert.match(svg, /viewBox="0 0 64 64"/);
		assert.doesNotMatch(svg, /<script\b|<animate\b|<foreignObject\b/i);
		assert.doesNotMatch(svg, /(?:href|src)\s*=|url\s*\(|data:/i);
		assert.doesNotMatch(svg.replace('http://www.w3.org/2000/svg', ''), /https?:\/\//i);
		assert.doesNotMatch(svg, /<image\b|<text\b|<metadata\b/i);
	}
});

test('keeps prerelease package metadata publishable without runtime dependencies', () => {
	assert.equal(packageMetadata.version, '0.1.0');
	assert.equal(packageMetadata.private, undefined);
	assert.deepEqual(packageMetadata.dependencies ?? {}, {});
	assert.deepEqual(packageMetadata.publishConfig, { access: 'public' });
	assert.equal(packageMetadata.license, 'MIT');
	assert.match(packageMetadata.repository.url, /n8n-nodes-sleeper\.git$/);
	assert.ok(packageMetadata.files.includes('dist/nodes/**/*.svg'));
});
