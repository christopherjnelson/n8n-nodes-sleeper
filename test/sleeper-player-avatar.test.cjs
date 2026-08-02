const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { NodeApiError, NodeOperationError } = require('n8n-workflow');
const { Sleeper } = require('../dist/nodes/Sleeper/Sleeper.node.js');

const API_ORIGIN = 'https://api.sleeper.app/v1';

function getNode() {
	return {
		name: 'Sleeper',
		type: 'n8n-nodes-sleeper.sleeper',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
}

function createExecuteContext(parametersByItem, requestHandler, continueOnFail = false) {
	const requests = [];

	return {
		context: {
			continueOnFail: () => continueOnFail,
			getInputData: () => parametersByItem.map((_, index) => ({ json: { source: index } })),
			getNode,
			getNodeParameter(name, itemIndex, fallback) {
				const parameters = parametersByItem[itemIndex] ?? {};
				return Object.hasOwn(parameters, name) ? parameters[name] : fallback;
			},
			helpers: {
				async httpRequest(options) {
					requests.push(options);
					return await requestHandler(options, requests.length - 1);
				},
			},
		},
		requests,
	};
}

function propertyFor(description, name, resource) {
	return description.properties.find(
		(property) =>
			property.name === name && property.displayOptions?.show?.resource?.includes(resource),
	);
}

function playerGetMany(overrides = {}) {
	return {
		resource: 'player',
		operation: 'getMany',
		sport: 'nfl',
		activeOnly: true,
		position: '',
		outputMode: 'singleMap',
		...overrides,
	};
}

function playerGetTrending(overrides = {}) {
	return {
		resource: 'player',
		operation: 'getTrending',
		sport: 'nfl',
		trendType: 'add',
		lookbackHours: 24,
		resultLimit: 25,
		...overrides,
	};
}

test('exposes exact Player and Avatar operations, defaults, and scoped fields', () => {
	const { description } = new Sleeper();
	const resources = description.properties.find((property) => property.name === 'resource');
	const resourceValues = resources.options.map((option) => option.value);
	assert.ok(resourceValues.includes('player'));
	assert.ok(resourceValues.includes('avatar'));

	const playerOperations = propertyFor(description, 'operation', 'player');
	const avatarOperations = propertyFor(description, 'operation', 'avatar');
	assert.deepEqual(
		playerOperations.options.map((option) => option.value),
		['getMany', 'getTrending'],
	);
	assert.deepEqual(
		avatarOperations.options.map((option) => option.value),
		['getUrl'],
	);
	assert.ok(!playerOperations.options.some((option) => option.value === 'get'));

	assert.deepEqual(propertyFor(description, 'sport', 'player').options, [
		{ name: 'NFL', value: 'nfl' },
	]);
	assert.equal(propertyFor(description, 'activeOnly', 'player').default, true);
	assert.deepEqual(propertyFor(description, 'activeOnly', 'player').displayOptions.show.operation, [
		'getMany',
	]);
	assert.deepEqual(propertyFor(description, 'position', 'player').displayOptions.show.operation, [
		'getMany',
	]);
	assert.deepEqual(
		propertyFor(description, 'outputMode', 'player').options.map((option) => option.value),
		['singleMap', 'splitItems'],
	);
	assert.equal(propertyFor(description, 'outputMode', 'player').default, 'singleMap');

	assert.deepEqual(
		propertyFor(description, 'trendType', 'player').options.map((option) => option.value),
		['add', 'drop'],
	);
	assert.equal(propertyFor(description, 'lookbackHours', 'player').default, 24);
	assert.equal(propertyFor(description, 'resultLimit', 'player').displayName, 'Limit');
	assert.equal(propertyFor(description, 'resultLimit', 'player').default, 25);
	for (const name of ['trendType', 'lookbackHours', 'resultLimit', 'trendingAttribution']) {
		assert.deepEqual(propertyFor(description, name, 'player').displayOptions.show.operation, [
			'getTrending',
		]);
	}

	assert.deepEqual(
		propertyFor(description, 'imageSize', 'avatar').options.map((option) => option.value),
		['full', 'thumbnail'],
	);
	assert.equal(propertyFor(description, 'imageSize', 'avatar').default, 'full');
	assert.deepEqual(propertyFor(description, 'avatarId', 'avatar').displayOptions.show.operation, [
		'getUrl',
	]);
	assert.equal(description.version, 1);
	assert.equal(description.usableAsTool, true);
	assert.equal(description.credentials, undefined);
});

test('makes player-map GET requests with exact documented server-side query parameters', async () => {
	const parameters = [
		playerGetMany({ position: ' qb ' }),
		playerGetMany({ activeOnly: false, position: '' }),
		playerGetMany({ activeOnly: true, position: 'wr_te-2' }),
	];
	const { context, requests } = createExecuteContext(parameters, async () => ({}));

	await Sleeper.prototype.execute.call(context);

	assert.equal(requests.length, 3);
	assert.ok(
		requests.every(
			(request) => request.method === 'GET' && request.url === `${API_ORIGIN}/players/nfl`,
		),
	);
	assert.deepEqual(requests[0].qs, { active: true, position: 'QB' });
	assert.ok(!Object.hasOwn(requests[1], 'qs'));
	assert.deepEqual(requests[2].qs, { active: true, position: 'WR_TE-2' });
	assert.ok(requests.every((request) => Object.keys(request.qs ?? {}).length <= 2));
});

test('accepts conservative position codes and omits an empty position', async () => {
	const parameters = ['QB', ' qb ', 'DL_1', 'wr-te', '', '   '].map((position) =>
		playerGetMany({ position }),
	);
	const { context, requests } = createExecuteContext(parameters, async () => ({}));

	await Sleeper.prototype.execute.call(context);

	assert.deepEqual(
		requests.map((request) => request.qs),
		[
			{ active: true, position: 'QB' },
			{ active: true, position: 'QB' },
			{ active: true, position: 'DL_1' },
			{ active: true, position: 'WR-TE' },
			{ active: true },
			{ active: true },
		],
	);
});

test('rejects unsafe position syntax before transport with the correct item index', async () => {
	for (const position of [
		'wide receiver',
		'QB?active=true',
		'QB/RB',
		'QB&limit=1',
		'QB\nRB',
		'QB\n',
		'QB\u0000',
		'POSITION-CODE-TOO-LONG',
		42,
	]) {
		const { context, requests } = createExecuteContext(
			[playerGetMany(), playerGetMany({ position })],
			async () => ({}),
		);

		await assert.rejects(
			() => Sleeper.prototype.execute.call(context),
			(error) => error instanceof NodeOperationError && error.context.itemIndex === 1,
		);
		assert.equal(requests.length, 1);
	}
});

test('Single Map emits the exact raw keyed object once without wrapping or cloning it', async () => {
	const playerMap = {
		1042: {
			player_id: '1042',
			first_name: 'Synthetic',
			fantasy_positions: ['QB'],
			metadata: { nested: [1, null, { active: true }] },
			injury_status: null,
			nickname: '',
		},
		CAR: {
			player_id: 'CAR',
			position: 'DEF',
			team: 'CAR',
			optional: null,
		},
	};
	const { context } = createExecuteContext([playerGetMany()], async () => playerMap);

	const result = await Sleeper.prototype.execute.call(context);

	assert.equal(result[0].length, 1);
	assert.strictEqual(result[0][0].json, playerMap);
	assert.deepEqual(result[0][0], { json: playerMap, pairedItem: { item: 0 } });
	assert.ok(!Object.hasOwn(result[0][0].json, 'players'));
});

test('Single Map treats an empty object as one valid raw map item', async () => {
	const emptyMap = {};
	const { context } = createExecuteContext([playerGetMany()], async () => emptyMap);
	const result = await Sleeper.prototype.execute.call(context);

	assert.deepEqual(result, [[{ json: emptyMap, pairedItem: { item: 0 } }]]);
});

test('split mode preserves map order and raw player IDs while filling only missing IDs', async () => {
	const playerMap = {
		1042: { player_id: '1042', name: 'Existing', nested: { values: [null, 1] } },
		CAR: { name: 'Defense', position: 'DEF' },
		mismatch: { player_id: 'raw-api-id', name: 'Preserve Me' },
		missing: { player_id: '', nullable: null },
	};
	const { context } = createExecuteContext(
		[playerGetMany({ outputMode: 'splitItems' })],
		async () => playerMap,
	);

	assert.deepEqual(await Sleeper.prototype.execute.call(context), [
		[
			{ json: playerMap['1042'], pairedItem: { item: 0 } },
			{
				json: { player_id: 'CAR', ...playerMap.CAR },
				pairedItem: { item: 0 },
			},
			{ json: playerMap.mismatch, pairedItem: { item: 0 } },
			{ json: playerMap.missing, pairedItem: { item: 0 } },
		],
	]);
});

test('split mode emits every synthetic map entry without sorting, grouping, or limiting', async () => {
	const playerMap = Object.fromEntries(
		Array.from({ length: 80 }, (_, index) => [
			index % 10 === 0 ? `TEAM_${index}` : String(2000 + index),
			{ ordinal: index, position: index % 2 === 0 ? 'QB' : 'WR' },
		]),
	);
	const { context } = createExecuteContext(
		[playerGetMany({ outputMode: 'splitItems' })],
		async () => playerMap,
	);

	const result = await Sleeper.prototype.execute.call(context);
	assert.equal(result[0].length, 80);
	assert.deepEqual(
		result[0].map((item) => item.json.player_id),
		Object.keys(playerMap),
	);
	assert.deepEqual(
		result[0].map((item) => item.json.ordinal),
		Object.values(playerMap).map((player) => player.ordinal),
	);
	assert.ok(result[0].every((item) => item.pairedItem.item === 0));
});

test('split mode emits no items for an empty map and keeps later input pairing', async () => {
	const laterMap = { CAR: { position: 'DEF' }, 1042: { player_id: '1042' } };
	const { context, requests } = createExecuteContext(
		[
			playerGetMany({ position: 'QB', outputMode: 'splitItems' }),
			playerGetMany({ position: 'DEF', outputMode: 'splitItems' }),
		],
		async (_options, requestIndex) => (requestIndex === 0 ? {} : laterMap),
	);

	assert.deepEqual(await Sleeper.prototype.execute.call(context), [
		[
			{ json: laterMap['1042'], pairedItem: { item: 1 } },
			{ json: { player_id: 'CAR', position: 'DEF' }, pairedItem: { item: 1 } },
		],
	]);
	assert.deepEqual(
		requests.map((request) => request.qs.position),
		['QB', 'DEF'],
	);
});

test('rejects non-object player maps for both output modes', async () => {
	for (const outputMode of ['singleMap', 'splitItems']) {
		for (const response of [[], null, 'map', 42, true, { broken: null }]) {
			const { context } = createExecuteContext(
				[playerGetMany({ outputMode })],
				async () => response,
			);

			await assert.rejects(
				() => Sleeper.prototype.execute.call(context),
				(error) =>
					error instanceof NodeOperationError &&
					error.message === 'Unexpected response from Sleeper for Player → Get Many' &&
					error.context.itemIndex === 0,
			);
		}
	}
});

test('a malformed split entry emits one paired error, no partial players, then continues', async () => {
	const malformedMap = {
		first: { player_id: 'first' },
		broken: null,
		last: { player_id: 'last' },
	};
	const laterMap = { later: { name: 'Later Player' } };
	const { context, requests } = createExecuteContext(
		[playerGetMany({ outputMode: 'splitItems' }), playerGetMany({ outputMode: 'splitItems' })],
		async (_options, requestIndex) => (requestIndex === 0 ? malformedMap : laterMap),
		true,
	);

	const result = await Sleeper.prototype.execute.call(context);
	assert.equal(requests.length, 2);
	assert.equal(result[0].length, 2);
	assert.equal(
		result[0][0].json.error.message,
		'Unexpected response from Sleeper for Player → Get Many',
	);
	assert.deepEqual(result[0][0].pairedItem, { item: 0 });
	assert.deepEqual(result[0][1], {
		json: { player_id: 'later', name: 'Later Player' },
		pairedItem: { item: 1 },
	});
});

test('a malformed split entry throws when continueOnFail is disabled', async () => {
	const { context } = createExecuteContext(
		[playerGetMany({ outputMode: 'splitItems' })],
		async () => ({ valid: {}, broken: 'not-an-object' }),
	);

	await assert.rejects(
		() => Sleeper.prototype.execute.call(context),
		(error) =>
			error instanceof NodeOperationError &&
			error.context.itemIndex === 0 &&
			/Every player-map entry/i.test(error.description),
	);
});

test('repeated player inputs make separate requests and do not reuse responses', async () => {
	const firstMap = { first: { marker: 1 } };
	const secondMap = { second: { marker: 2 } };
	const { context, requests } = createExecuteContext(
		[playerGetMany(), playerGetMany()],
		async (_options, requestIndex) => (requestIndex === 0 ? firstMap : secondMap),
	);

	const result = await Sleeper.prototype.execute.call(context);
	assert.equal(requests.length, 2);
	assert.strictEqual(result[0][0].json, firstMap);
	assert.strictEqual(result[0][1].json, secondMap);
});

test('a player-map 429 returns a paired error and continues to a later request', async () => {
	const laterMap = { later: { player_id: 'later' } };
	const { context, requests } = createExecuteContext(
		[playerGetMany(), playerGetMany()],
		async (_options, requestIndex) => {
			if (requestIndex === 0) {
				throw Object.assign(new Error('limited'), {
					response: { statusCode: 429, headers: { 'retry-after': '60' } },
				});
			}
			return laterMap;
		},
		true,
	);

	const result = await Sleeper.prototype.execute.call(context);
	assert.equal(requests.length, 2);
	assert.equal(result[0][0].json.error.message, 'Sleeper rate limit exceeded');
	assert.deepEqual(result[0][0].pairedItem, { item: 0 });
	assert.deepEqual(result[0][1], { json: laterMap, pairedItem: { item: 1 } });
});

test('routes add and drop trending requests with exact controlled query parameters', async () => {
	const parameters = [
		playerGetTrending(),
		playerGetTrending({ trendType: 'drop', lookbackHours: ' 0048 ', resultLimit: '007' }),
	];
	const { context, requests } = createExecuteContext(parameters, async () => []);

	await Sleeper.prototype.execute.call(context);

	assert.deepEqual(
		requests.map((request) => request.url),
		[`${API_ORIGIN}/players/nfl/trending/add`, `${API_ORIGIN}/players/nfl/trending/drop`],
	);
	assert.deepEqual(
		requests.map((request) => request.qs),
		[
			{ lookback_hours: '24', limit: '25' },
			{ lookback_hours: '48', limit: '7' },
		],
	);
	assert.ok(requests.every((request) => request.method === 'GET'));
});

test('rejects custom trending types before any HTTP request', async () => {
	for (const trendType of ['adds', 'DROP', '../drop', 'add?limit=1']) {
		const { context, requests } = createExecuteContext(
			[playerGetTrending({ trendType })],
			async () => [],
		);
		await assert.rejects(
			() => Sleeper.prototype.execute.call(context),
			(error) => error instanceof NodeOperationError && error.message === 'Unsupported trend type',
		);
		assert.equal(requests.length, 0);
	}
});

test('validates lookback and limit as parameter-specific positive safe integers', async () => {
	const invalidValues = [
		0,
		-1,
		1.5,
		'1.5',
		Number.NaN,
		Infinity,
		9007199254740992,
		'9007199254740992',
		'',
	];

	for (const [parameterName, displayName] of [
		['lookbackHours', 'Lookback Hours'],
		['resultLimit', 'Limit'],
	]) {
		for (const value of invalidValues) {
			const { context, requests } = createExecuteContext(
				[playerGetTrending(), playerGetTrending({ [parameterName]: value })],
				async () => [],
			);
			await assert.rejects(
				() => Sleeper.prototype.execute.call(context),
				(error) =>
					error instanceof NodeOperationError &&
					error.message === `${displayName} must be a positive safe integer` &&
					error.context.itemIndex === 1,
			);
			assert.equal(requests.length, 1);
		}
	}
});

test('trending output preserves raw records, exact ordering, fields, and pairing', async () => {
	const adds = [
		{ player_id: '1042', count: 45 },
		{ player_id: 'CAR', count: 12, additional: null },
	];
	const drops = [{ player_id: 'opaque-player', count: 3, reason: 'synthetic' }];
	const { context, requests } = createExecuteContext(
		[
			playerGetTrending({ trendType: 'add', lookbackHours: 6, resultLimit: 2 }),
			playerGetTrending({ trendType: 'drop', lookbackHours: 72, resultLimit: 1 }),
		],
		async (_options, requestIndex) => (requestIndex === 0 ? adds : drops),
	);

	assert.deepEqual(await Sleeper.prototype.execute.call(context), [
		[
			...adds.map((record) => ({ json: record, pairedItem: { item: 0 } })),
			...drops.map((record) => ({ json: record, pairedItem: { item: 1 } })),
		],
	]);
	assert.equal(requests.length, 2);
	assert.ok(requests.every((request) => !request.url.endsWith('/players/nfl')));
	assert.ok(!adds.some((record) => Object.hasOwn(record, 'name')));
});

test('trending emits no items for an empty array and rejects malformed response shapes', async () => {
	const empty = createExecuteContext([playerGetTrending()], async () => []);
	assert.deepEqual(await Sleeper.prototype.execute.call(empty.context), [[]]);

	for (const response of [{ player_id: '1042', count: 1 }, 'malformed', null, [null]]) {
		const { context } = createExecuteContext([playerGetTrending()], async () => response);
		await assert.rejects(
			() => Sleeper.prototype.execute.call(context),
			(error) =>
				error instanceof NodeOperationError &&
				error.message === 'Unexpected response from Sleeper for Player → Get Trending',
		);
	}
});

test('a trending network failure contains operation and input context', async () => {
	const { context } = createExecuteContext([playerGetTrending({ trendType: 'drop' })], async () => {
		throw Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' });
	});

	await assert.rejects(
		() => Sleeper.prototype.execute.call(context),
		(error) => {
			assert.ok(error instanceof NodeApiError);
			assert.match(error.description, /Player → Get Trending/);
			assert.equal(error.context.itemIndex, 0);
			return true;
		},
	);
});

test('trending attribution is visible in metadata and README without changing raw results', async () => {
	const { description } = new Sleeper();
	const operation = propertyFor(description, 'operation', 'player').options.find(
		(option) => option.value === 'getTrending',
	);
	const notice = propertyFor(description, 'trendingAttribution', 'player');
	assert.match(operation.description, /requires attribution/i);
	assert.equal(notice.type, 'notice');
	assert.match(notice.displayName, /requires attribution/i);

	const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
	assert.match(readme, /Trending players and attribution/);
	assert.match(readme, /Sleeper requires attribution when you display or republish/i);

	const rawRecord = { player_id: '1042', count: 4 };
	const { context } = createExecuteContext([playerGetTrending()], async () => [rawRecord]);
	const result = await Sleeper.prototype.execute.call(context);
	assert.deepEqual(result[0][0].json, rawRecord);
	assert.deepEqual(Object.keys(result[0][0].json), ['player_id', 'count']);
});

test('constructs paired full-size and thumbnail avatar URLs locally with encoded IDs', async () => {
	const { context, requests } = createExecuteContext(
		[
			{ resource: 'avatar', operation: 'getUrl', avatarId: ' exact-avatar-id ', imageSize: 'full' },
			{
				resource: 'avatar',
				operation: 'getUrl',
				avatarId: 'folder/name ?#',
				imageSize: 'thumbnail',
			},
		],
		async () => {
			throw new Error('Avatar must not use HTTP');
		},
	);

	assert.deepEqual(await Sleeper.prototype.execute.call(context), [
		[
			{
				json: {
					avatar_id: 'exact-avatar-id',
					size: 'full',
					url: 'https://sleepercdn.com/avatars/exact-avatar-id',
				},
				pairedItem: { item: 0 },
			},
			{
				json: {
					avatar_id: 'folder/name ?#',
					size: 'thumbnail',
					url: 'https://sleepercdn.com/avatars/thumbs/folder%2Fname%20%3F%23',
				},
				pairedItem: { item: 1 },
			},
		],
	]);
	assert.equal(requests.length, 0);
});

test('avatar validation rejects empty IDs and uncontrolled sizes without HTTP', async () => {
	for (const parameters of [
		{ resource: 'avatar', operation: 'getUrl', avatarId: '', imageSize: 'full' },
		{ resource: 'avatar', operation: 'getUrl', avatarId: '   ', imageSize: 'thumbnail' },
		{ resource: 'avatar', operation: 'getUrl', avatarId: 123, imageSize: 'full' },
		{ resource: 'avatar', operation: 'getUrl', avatarId: 'valid', imageSize: '../thumbs' },
	]) {
		const { context, requests } = createExecuteContext([parameters], async () => ({}));
		await assert.rejects(
			() => Sleeper.prototype.execute.call(context),
			(error) => error instanceof NodeOperationError && error.context.itemIndex === 0,
		);
		assert.equal(requests.length, 0);
	}
});

test('avatar validation can fail then continue to a successful local result', async () => {
	const { context, requests } = createExecuteContext(
		[
			{ resource: 'avatar', operation: 'getUrl', avatarId: '', imageSize: 'full' },
			{ resource: 'avatar', operation: 'getUrl', avatarId: 'later', imageSize: 'thumbnail' },
		],
		async () => ({}),
		true,
	);

	const result = await Sleeper.prototype.execute.call(context);
	assert.equal(result[0][0].json.error.message, 'Avatar ID is required');
	assert.deepEqual(result[0][0].pairedItem, { item: 0 });
	assert.deepEqual(result[0][1], {
		json: {
			avatar_id: 'later',
			size: 'thumbnail',
			url: 'https://sleepercdn.com/avatars/thumbs/later',
		},
		pairedItem: { item: 1 },
	});
	assert.equal(requests.length, 0);
});
