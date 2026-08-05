const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const packageMetadata = require('../package.json');
const nodeMetadata = require('../nodes/Sleeper/Sleeper.node.json');
const { Sleeper } = require('../dist/nodes/Sleeper/Sleeper.node.js');

const projectRoot = path.resolve(__dirname, '..');

test('registers the version 1 Sleeper node without credentials', () => {
	assert.equal(packageMetadata.name, 'n8n-nodes-sleeper');
	assert.deepEqual(packageMetadata.n8n.credentials, []);
	assert.deepEqual(packageMetadata.n8n.nodes, [
		'dist/nodes/Sleeper/Sleeper.node.js',
		'dist/nodes/SleeperTrigger/SleeperTrigger.node.js',
	]);
	assert.equal(nodeMetadata.node, 'n8n-nodes-sleeper.sleeper');
	assert.equal(nodeMetadata.nodeVersion, '1.0');
	assert.deepEqual(nodeMetadata.categories, ['Development']);
	assert.equal(nodeMetadata.categories.includes('Developer Tools'), false);
});

test('packs the corrected compiled Sleeper codex metadata', (t) => {
	const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'sleeper-metadata-pack-'));
	t.after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

	const packResult = JSON.parse(
		execFileSync(
			'npm',
			['pack', '--json', '--ignore-scripts', '--pack-destination', temporaryDirectory],
			{
				cwd: projectRoot,
				encoding: 'utf8',
				env: {
					...process.env,
					npm_config_cache: path.join(temporaryDirectory, 'npm-cache'),
				},
			},
		),
	);
	const tarballPath = path.join(temporaryDirectory, packResult[0].filename);
	const packedMetadata = JSON.parse(
		execFileSync('tar', ['-xOf', tarballPath, 'package/dist/nodes/Sleeper/Sleeper.node.json'], {
			encoding: 'utf8',
		}),
	);

	assert.equal(packedMetadata.node, 'n8n-nodes-sleeper.sleeper');
	assert.deepEqual(packedMetadata.categories, ['Development']);
	assert.equal(packedMetadata.categories.includes('Developer Tools'), false);
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

test('uses safe Tabler football SVG icons for both n8n themes', () => {
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
		const viewBox = svg
			.match(/viewBox="([^"]+)"/)?.[1]
			.split(/\s+/)
			.map(Number);
		assert.ok(viewBox);
		assert.equal(viewBox[2], viewBox[3]);
		assert.match(svg, /<rect\b[^>]*\bwidth="24"[^>]*\bheight="24"[^>]*\brx="5"/);
		assert.match(svg, /<g\b[^>]*\bstroke="#f8fafc"/);
		assert.doesNotMatch(svg, /<script\b|<animate\b|<foreignObject\b/i);
		assert.doesNotMatch(svg, /(?:href|src)\s*=|url\s*\(|data:/i);
		assert.doesNotMatch(svg.replace('http://www.w3.org/2000/svg', ''), /https?:\/\//i);
		assert.doesNotMatch(svg, /<image\b|<text\b|<metadata\b/i);
		assert.doesNotMatch(svg, /M42 6C27|#28346a|#b9c9ff|#d9892b|#f0a54b/i);
	}
});

test('includes the Tabler football icon attribution and MIT license', () => {
	const noticePath = path.join(projectRoot, 'THIRD_PARTY_NOTICES.md');
	assert.ok(fs.existsSync(noticePath));
	const notice = fs.readFileSync(noticePath, 'utf8');
	assert.match(notice, /Tabler Icons/);
	assert.match(notice, /ball-american-football/);
	assert.match(notice, /MIT License/);
	assert.match(notice, /github\.com\/tabler\/tabler-icons/);
	assert.ok(packageMetadata.files.includes('THIRD_PARTY_NOTICES.md'));
});

test('keeps prerelease package metadata publishable without runtime dependencies', () => {
	assert.equal(packageMetadata.version, '0.1.1');
	assert.equal(packageMetadata.private, undefined);
	assert.deepEqual(packageMetadata.dependencies ?? {}, {});
	assert.deepEqual(packageMetadata.publishConfig, { access: 'public' });
	assert.equal(packageMetadata.license, 'MIT');
	assert.match(packageMetadata.repository.url, /n8n-nodes-sleeper\.git$/);
	assert.ok(packageMetadata.files.includes('dist/nodes/**/*.svg'));
});
