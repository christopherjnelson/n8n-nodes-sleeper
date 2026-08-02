const assert = require('node:assert/strict');
const test = require('node:test');

const { NodeApiError, NodeOperationError } = require('n8n-workflow');
const packageMetadata = require('../package.json');
const { Sleeper } = require('../dist/nodes/Sleeper/Sleeper.node.js');

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
	const inputItems = parametersByItem.map((_, index) => ({ json: { source: index } }));
	const requests = [];

	return {
		context: {
			continueOnFail: () => continueOnFail,
			getInputData: () => inputItems,
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

function getOperationProperties(description) {
	return description.properties.filter((property) => property.name === 'operation');
}

test('exposes only the Phase 1A resources and four operations', () => {
	const sleeper = new Sleeper();
	const { description } = sleeper;
	const resource = description.properties.find((property) => property.name === 'resource');
	const operations = getOperationProperties(description);

	assert.deepEqual(
		resource.options.map((option) => option.value),
		['league', 'sport', 'user'],
	);
	assert.deepEqual(
		operations.flatMap((property) => property.options.map((option) => option.value)).sort(),
		['get', 'get', 'getManyForUser', 'getState'].sort(),
	);
	assert.equal(description.displayName, 'Sleeper');
	assert.equal(description.name, 'sleeper');
	assert.equal(description.version, 1);
	assert.equal(description.usableAsTool, true);
	assert.equal(description.credentials, undefined);
	assert.deepEqual(packageMetadata.n8n.credentials, []);
});

test('uses resource-specific operation and parameter display conditions', () => {
	const { description } = new Sleeper();
	const operations = getOperationProperties(description);
	assert.deepEqual(operations.map((property) => property.displayOptions.show.resource[0]).sort(), [
		'league',
		'sport',
		'user',
	]);

	const expectedConditions = {
		usernameOrUserId: { resource: ['user'], operation: ['get'] },
		leagueId: { resource: ['league'], operation: ['get'] },
		userId: { resource: ['league'], operation: ['getManyForUser'] },
		season: { resource: ['league'], operation: ['getManyForUser'] },
	};

	for (const [name, show] of Object.entries(expectedConditions)) {
		const property = description.properties.find((candidate) => candidate.name === name);
		assert.deepEqual(property.displayOptions.show, show);
	}
});

test('shows NFL as the only sport option', () => {
	const sportProperties = new Sleeper().description.properties.filter(
		(property) => property.name === 'sport',
	);

	assert.equal(sportProperties.length, 2);
	for (const property of sportProperties) {
		assert.deepEqual(property.options, [{ name: 'NFL', value: 'nfl' }]);
		assert.equal(property.default, 'nfl');
	}
});

test('User Get supports usernames and user IDs with encoded path segments', async () => {
	const parameters = [
		{ resource: 'user', operation: 'get', usernameOrUserId: ' name/with ? chars ' },
		{ resource: 'user', operation: 'get', usernameOrUserId: '90071992547409931234' },
	];
	const responses = [
		{ username: 'name/with ? chars', user_id: '1', avatar: null },
		{ username: 'stable-user', user_id: '90071992547409931234' },
	];
	const { context, requests } = createExecuteContext(
		parameters,
		async (_options, requestIndex) => responses[requestIndex],
	);

	const result = await Sleeper.prototype.execute.call(context);

	assert.equal(requests[0].url, 'https://api.sleeper.app/v1/user/name%2Fwith%20%3F%20chars');
	assert.equal(requests[1].url, 'https://api.sleeper.app/v1/user/90071992547409931234');
	assert.deepEqual(result, [
		[
			{ json: responses[0], pairedItem: { item: 0 } },
			{ json: responses[1], pairedItem: { item: 1 } },
		],
	]);
});

test('League Get preserves a large string ID and raw object fields', async () => {
	const league = {
		league_id: '90071992547409931234',
		name: 'Test League',
		avatar: null,
		settings: { playoff_teams: 6 },
	};
	const { context, requests } = createExecuteContext(
		[{ resource: 'league', operation: 'get', leagueId: ' 90071992547409931234 ' }],
		async () => league,
	);

	const result = await Sleeper.prototype.execute.call(context);

	assert.equal(requests[0].url, 'https://api.sleeper.app/v1/league/90071992547409931234');
	assert.deepEqual(result, [[{ json: league, pairedItem: { item: 0 } }]]);
});

test('League Get Many emits one paired item per league and preserves input correlation', async () => {
	const firstLeagues = [
		{ league_id: '11', name: 'One', metadata: { division: 'East' } },
		{ league_id: '12', name: 'Two', previous_league_id: null },
	];
	const secondLeagues = [{ league_id: '21', name: 'Three' }];
	const parameters = [
		{
			resource: 'league',
			operation: 'getManyForUser',
			userId: '90071992547409931234',
			sport: 'nfl',
			season: '2026',
		},
		{
			resource: 'league',
			operation: 'getManyForUser',
			userId: '2',
			sport: 'nfl',
			season: '2018',
		},
	];
	const { context, requests } = createExecuteContext(
		parameters,
		async (_options, requestIndex) => [firstLeagues, secondLeagues][requestIndex],
	);

	const result = await Sleeper.prototype.execute.call(context);

	assert.equal(
		requests[0].url,
		'https://api.sleeper.app/v1/user/90071992547409931234/leagues/nfl/2026',
	);
	assert.equal(requests[1].url, 'https://api.sleeper.app/v1/user/2/leagues/nfl/2018');
	assert.deepEqual(result[0], [
		{ json: firstLeagues[0], pairedItem: { item: 0 } },
		{ json: firstLeagues[1], pairedItem: { item: 0 } },
		{ json: secondLeagues[0], pairedItem: { item: 1 } },
	]);
});

test('League Get Many emits no fabricated item for an empty array', async () => {
	const { context } = createExecuteContext(
		[
			{
				resource: 'league',
				operation: 'getManyForUser',
				userId: '1',
				sport: 'nfl',
				season: '2026',
			},
		],
		async () => [],
	);

	assert.deepEqual(await Sleeper.prototype.execute.call(context), [[]]);
});

test('Sport Get State requests the lowercase NFL endpoint', async () => {
	const state = {
		week: 1,
		season: '2026',
		season_type: 'pre',
		previous_season: '2025',
	};
	const { context, requests } = createExecuteContext(
		[{ resource: 'sport', operation: 'getState', sport: 'nfl' }],
		async () => state,
	);

	assert.deepEqual(await Sleeper.prototype.execute.call(context), [
		[{ json: state, pairedItem: { item: 0 } }],
	]);
	assert.equal(requests[0].url, 'https://api.sleeper.app/v1/state/nfl');
});

test('continueOnFail false throws an item-aware native API error', async () => {
	const { context } = createExecuteContext(
		[{ resource: 'league', operation: 'get', leagueId: 'missing' }],
		async () => {
			throw Object.assign(new Error('not found'), { response: { statusCode: 404 } });
		},
	);

	await assert.rejects(
		() => Sleeper.prototype.execute.call(context),
		(error) =>
			error instanceof NodeApiError &&
			error.message === 'Sleeper resource was not found' &&
			error.context.itemIndex === 0,
	);
});

test('continueOnFail returns a paired error and continues with later input items', async () => {
	const parameters = [
		{ resource: 'league', operation: 'get', leagueId: 'missing' },
		{ resource: 'sport', operation: 'getState', sport: 'nfl' },
	];
	const state = { season: '2026', week: 1 };
	const { context, requests } = createExecuteContext(
		parameters,
		async (_options, requestIndex) => {
			if (requestIndex === 0) {
				throw Object.assign(new Error('not found'), { response: { statusCode: 404 } });
			}
			return state;
		},
		true,
	);

	const result = await Sleeper.prototype.execute.call(context);

	assert.equal(requests.length, 2);
	assert.deepEqual(result[0][0], {
		json: {
			error: {
				message: 'Sleeper resource was not found',
				description: 'League → Get could not find the requested resource.',
				httpCode: '404',
			},
		},
		pairedItem: { item: 0 },
	});
	assert.deepEqual(result[0][1], { json: state, pairedItem: { item: 1 } });
});

test('validation errors remain item-aware and can continue', async () => {
	const parameters = [
		{
			resource: 'league',
			operation: 'getManyForUser',
			userId: '1',
			sport: 'nfl',
			season: '20x6',
		},
		{ resource: 'sport', operation: 'getState', sport: 'nfl' },
	];
	const { context, requests } = createExecuteContext(
		parameters,
		async () => ({ season: '2026' }),
		true,
	);

	const result = await Sleeper.prototype.execute.call(context);

	assert.equal(requests.length, 1);
	assert.equal(result[0][0].json.error.message, 'Season must be a four-digit year');
	assert.deepEqual(result[0][0].pairedItem, { item: 0 });
	assert.deepEqual(result[0][1].pairedItem, { item: 1 });
});

test('null single-resource responses are reported honestly as not found', async () => {
	const { context } = createExecuteContext(
		[{ resource: 'user', operation: 'get', usernameOrUserId: 'missing-user' }],
		async () => null,
	);

	await assert.rejects(
		() => Sleeper.prototype.execute.call(context),
		(error) =>
			error instanceof NodeOperationError &&
			error.message === 'Sleeper resource was not found' &&
			error.context.itemIndex === 0,
	);
});
