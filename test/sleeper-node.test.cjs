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

test('exposes only the implemented resources and operations', () => {
	const sleeper = new Sleeper();
	const { description } = sleeper;
	const resource = description.properties.find((property) => property.name === 'resource');
	const operations = getOperationProperties(description);

	assert.deepEqual(
		resource.options.map((option) => option.value),
		[
			'league',
			'leagueUser',
			'matchup',
			'playoff',
			'roster',
			'sport',
			'tradedPick',
			'transaction',
			'user',
		],
	);
	assert.deepEqual(
		Object.fromEntries(
			operations.map((property) => [
				property.displayOptions.show.resource[0],
				property.options.map((option) => option.value),
			]),
		),
		{
			user: ['get'],
			league: ['get', 'getManyForUser'],
			leagueUser: ['getMany'],
			matchup: ['getMany'],
			playoff: ['getBracket'],
			roster: ['getMany'],
			sport: ['getState'],
			tradedPick: ['getMany'],
			transaction: ['getMany'],
		},
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
		'leagueUser',
		'matchup',
		'playoff',
		'roster',
		'sport',
		'tradedPick',
		'transaction',
		'user',
	]);

	const expectedConditions = {
		usernameOrUserId: { resource: ['user'], operation: ['get'] },
		userId: { resource: ['league'], operation: ['getManyForUser'] },
		season: { resource: ['league'], operation: ['getManyForUser'] },
		week: { resource: ['matchup'], operation: ['getMany'] },
		round: { resource: ['transaction'], operation: ['getMany'] },
		bracketType: { resource: ['playoff'], operation: ['getBracket'] },
	};

	for (const [name, show] of Object.entries(expectedConditions)) {
		const property = description.properties.find((candidate) => candidate.name === name);
		assert.deepEqual(property.displayOptions.show, show);
	}

	const leagueIdProperties = description.properties.filter(
		(candidate) => candidate.name === 'leagueId',
	);
	assert.deepEqual(
		leagueIdProperties.map((property) => property.displayOptions.show),
		[
			{ resource: ['league'], operation: ['get'] },
			{ resource: ['leagueUser'], operation: ['getMany'] },
			{ resource: ['matchup'], operation: ['getMany'] },
			{ resource: ['playoff'], operation: ['getBracket'] },
			{ resource: ['roster'], operation: ['getMany'] },
			{ resource: ['tradedPick'], operation: ['getMany'] },
			{ resource: ['transaction'], operation: ['getMany'] },
		],
	);
	assert.ok(leagueIdProperties.every((property) => property.required === true));

	const bracketType = description.properties.find((property) => property.name === 'bracketType');
	assert.deepEqual(bracketType.options, [
		{ name: 'Winners', value: 'winners' },
		{ name: 'Losers', value: 'losers' },
	]);
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

test('League User Get Many preserves users, nullable metadata, paths, and pairing', async () => {
	const firstUsers = [
		{
			user_id: '1',
			username: 'commissioner',
			display_name: 'Commissioner',
			avatar: null,
			metadata: { team_name: 'One' },
			is_owner: true,
		},
		{ user_id: '2', username: 'member', metadata: null, is_owner: false },
	];
	const secondUsers = [{ user_id: '90071992547409931234', metadata: null }];
	const { context, requests } = createExecuteContext(
		[
			{ resource: 'leagueUser', operation: 'getMany', leagueId: ' league/with space ' },
			{ resource: 'leagueUser', operation: 'getMany', leagueId: '90071992547409931234' },
		],
		async (_options, requestIndex) => [firstUsers, secondUsers][requestIndex],
	);

	const result = await Sleeper.prototype.execute.call(context);

	assert.equal(requests[0].url, 'https://api.sleeper.app/v1/league/league%2Fwith%20space/users');
	assert.equal(requests[1].url, 'https://api.sleeper.app/v1/league/90071992547409931234/users');
	assert.deepEqual(result[0], [
		{ json: firstUsers[0], pairedItem: { item: 0 } },
		{ json: firstUsers[1], pairedItem: { item: 0 } },
		{ json: secondUsers[0], pairedItem: { item: 1 } },
	]);
	assert.ok(requests.every((request) => request.method === 'GET' && !Object.hasOwn(request, 'qs')));
});

test('League User Get Many keeps later input correlation when the first result is empty', async () => {
	const user = { user_id: '2', username: 'later' };
	const { context } = createExecuteContext(
		[
			{ resource: 'leagueUser', operation: 'getMany', leagueId: '1' },
			{ resource: 'leagueUser', operation: 'getMany', leagueId: '2' },
		],
		async (_options, requestIndex) => (requestIndex === 0 ? [] : [user]),
	);

	assert.deepEqual(await Sleeper.prototype.execute.call(context), [
		[{ json: user, pairedItem: { item: 1 } }],
	]);
});

test('Roster Get Many preserves complete, orphaned, and sparse roster records', async () => {
	const rosters = [
		{
			roster_id: 1,
			owner_id: 'user-1',
			co_owners: ['user-2'],
			players: ['101', '102'],
			starters: ['101'],
			reserve: ['102'],
			taxi: [],
			metadata: { record: '1-0' },
			settings: { wins: 1, losses: 0, fpts_decimal: 25 },
		},
		{
			roster_id: 2,
			owner_id: null,
			players: [],
			starters: [],
			reserve: null,
			taxi: null,
			metadata: null,
			settings: {},
		},
	];
	const { context, requests } = createExecuteContext(
		[{ resource: 'roster', operation: 'getMany', leagueId: '90071992547409931234' }],
		async () => rosters,
	);

	assert.deepEqual(await Sleeper.prototype.execute.call(context), [
		rosters.map((roster) => ({ json: roster, pairedItem: { item: 0 } })),
	]);
	assert.equal(requests[0].url, 'https://api.sleeper.app/v1/league/90071992547409931234/rosters');
});

test('Matchup Get Many normalizes per-input weeks and does not pair team-side records', async () => {
	const firstMatchups = [
		{
			matchup_id: 7,
			roster_id: 1,
			points: 101.5,
			custom_points: null,
			starters: ['101'],
			players: ['101', '102'],
			starters_points: { 101: 20.5 },
			players_points: null,
		},
		{
			matchup_id: 7,
			roster_id: 2,
			points: 99,
			starters: [],
			players: [],
			players_points: {},
		},
	];
	const secondMatchups = [{ matchup_id: null, roster_id: 3, points: 0, players: [] }];
	const { context, requests } = createExecuteContext(
		[
			{ resource: 'matchup', operation: 'getMany', leagueId: 'one', week: ' 01 ' },
			{ resource: 'matchup', operation: 'getMany', leagueId: 'two', week: 22 },
		],
		async (_options, requestIndex) => [firstMatchups, secondMatchups][requestIndex],
	);

	assert.deepEqual(await Sleeper.prototype.execute.call(context), [
		[
			{ json: firstMatchups[0], pairedItem: { item: 0 } },
			{ json: firstMatchups[1], pairedItem: { item: 0 } },
			{ json: secondMatchups[0], pairedItem: { item: 1 } },
		],
	]);
	assert.equal(requests[0].url, 'https://api.sleeper.app/v1/league/one/matchups/1');
	assert.equal(requests[1].url, 'https://api.sleeper.app/v1/league/two/matchups/22');
});

test('Matchup validation rejects invalid weeks before transport with the correct item index', async () => {
	const { context, requests } = createExecuteContext(
		[
			{ resource: 'matchup', operation: 'getMany', leagueId: 'one', week: 0 },
			{ resource: 'matchup', operation: 'getMany', leagueId: 'two', week: 3 },
		],
		async () => [],
	);

	await assert.rejects(
		() => Sleeper.prototype.execute.call(context),
		(error) =>
			error instanceof NodeOperationError &&
			error.message === 'Week must be a positive integer' &&
			error.context.itemIndex === 0,
	);
	assert.equal(requests.length, 0);
});

test('Transaction Get Many preserves representative raw transaction structures', async () => {
	const transactions = [
		{
			type: 'trade',
			transaction_id: 'trade-1',
			status: 'complete',
			status_updated: 100,
			settings: null,
			roster_ids: [1, 2],
			metadata: null,
			leg: 4,
			drops: null,
			adds: null,
			draft_picks: [{ season: '2028', round: 2, roster_id: 1, previous_owner_id: 1, owner_id: 2 }],
			waiver_budget: [{ sender: 1, receiver: 2, amount: 25 }],
			creator: 'user-1',
			created: 90,
			consenter_ids: [1, 2],
		},
		{
			type: 'waiver',
			transaction_id: 'waiver-1',
			status: 'pending',
			settings: { waiver_bid: 10 },
			roster_ids: [3],
			metadata: { notes: 'pending claim' },
			drops: { 200: 3 },
			adds: { 201: 3 },
			draft_picks: [],
			waiver_budget: [],
		},
		{
			type: 'free_agent',
			transaction_id: 'free-agent-1',
			status: 'failed',
			roster_ids: [4],
			metadata: null,
			drops: null,
			adds: { 301: 4 },
		},
	];
	const later = [{ transaction_id: 'later', type: 'free_agent', status: 'complete' }];
	const { context, requests } = createExecuteContext(
		[
			{ resource: 'transaction', operation: 'getMany', leagueId: 'one', round: '004' },
			{ resource: 'transaction', operation: 'getMany', leagueId: 'two', round: 18 },
		],
		async (_options, requestIndex) => [transactions, later][requestIndex],
	);

	assert.deepEqual(await Sleeper.prototype.execute.call(context), [
		[
			...transactions.map((transaction) => ({ json: transaction, pairedItem: { item: 0 } })),
			{ json: later[0], pairedItem: { item: 1 } },
		],
	]);
	assert.equal(requests[0].url, 'https://api.sleeper.app/v1/league/one/transactions/4');
	assert.equal(requests[1].url, 'https://api.sleeper.app/v1/league/two/transactions/18');
});

test('Transaction validation rejects invalid rounds without making a request', async () => {
	for (const round of [-1, 1.25, '', 'round']) {
		const { context, requests } = createExecuteContext(
			[{ resource: 'transaction', operation: 'getMany', leagueId: 'one', round }],
			async () => [],
		);
		await assert.rejects(
			() => Sleeper.prototype.execute.call(context),
			(error) =>
				error instanceof NodeOperationError &&
				error.message === 'Round or Week must be a positive integer' &&
				error.context.itemIndex === 0,
		);
		assert.equal(requests.length, 0);
	}
});

test('Playoff Get Bracket maps only winners and losers paths per input', async () => {
	const winners = [
		{ r: 1, m: 1, t1: 1, t2: 2, w: 1, l: 2 },
		{ r: 2, m: 2, t1: null, t2: 3, t1_from: { w: 1 }, w: null, l: null },
	];
	const losers = [{ r: 2, m: 3, t1: null, t2: null, t1_from: { l: 1 }, t2_from: { l: 2 } }];
	const { context, requests } = createExecuteContext(
		[
			{ resource: 'playoff', operation: 'getBracket', leagueId: 'one', bracketType: 'winners' },
			{ resource: 'playoff', operation: 'getBracket', leagueId: 'two', bracketType: 'losers' },
		],
		async (_options, requestIndex) => [winners, losers][requestIndex],
	);

	assert.deepEqual(await Sleeper.prototype.execute.call(context), [
		[
			...winners.map((entry) => ({ json: entry, pairedItem: { item: 0 } })),
			...losers.map((entry) => ({ json: entry, pairedItem: { item: 1 } })),
		],
	]);
	assert.equal(requests[0].url, 'https://api.sleeper.app/v1/league/one/winners_bracket');
	assert.equal(requests[1].url, 'https://api.sleeper.app/v1/league/two/losers_bracket');
});

test('Playoff rejects custom bracket paths before transport and emits no item for an empty bracket', async () => {
	const invalid = createExecuteContext(
		[
			{
				resource: 'playoff',
				operation: 'getBracket',
				leagueId: 'one',
				bracketType: '../transactions/1',
			},
		],
		async () => [],
	);
	await assert.rejects(
		() => Sleeper.prototype.execute.call(invalid.context),
		(error) => error instanceof NodeOperationError && error.message === 'Unsupported bracket type',
	);
	assert.equal(invalid.requests.length, 0);

	const empty = createExecuteContext(
		[{ resource: 'playoff', operation: 'getBracket', leagueId: 'one', bracketType: 'winners' }],
		async () => [],
	);
	assert.deepEqual(await Sleeper.prototype.execute.call(empty.context), [[]]);
});

test('Traded Pick Get Many preserves season and ownership fields without joins', async () => {
	const picks = [
		{ season: '2027', round: 1, roster_id: 1, previous_owner_id: 1, owner_id: 2 },
		{ season: 2028, round: '3', roster_id: 4, previous_owner_id: 2, owner_id: 3 },
	];
	const { context, requests } = createExecuteContext(
		[{ resource: 'tradedPick', operation: 'getMany', leagueId: 'league/picks' }],
		async () => picks,
	);

	assert.deepEqual(await Sleeper.prototype.execute.call(context), [
		picks.map((pick) => ({ json: pick, pairedItem: { item: 0 } })),
	]);
	assert.equal(requests[0].url, 'https://api.sleeper.app/v1/league/league%2Fpicks/traded_picks');
});

test('all new array operations emit no placeholder items for empty responses', async () => {
	const parameters = [
		{ resource: 'roster', operation: 'getMany', leagueId: '1' },
		{ resource: 'matchup', operation: 'getMany', leagueId: '1', week: 1 },
		{ resource: 'transaction', operation: 'getMany', leagueId: '1', round: 1 },
		{ resource: 'tradedPick', operation: 'getMany', leagueId: '1' },
	];
	const { context } = createExecuteContext(parameters, async () => []);
	assert.deepEqual(await Sleeper.prototype.execute.call(context), [[]]);
});

test('unexpected array response shapes fail honestly at the originating item', async () => {
	const { context } = createExecuteContext(
		[{ resource: 'roster', operation: 'getMany', leagueId: 'malformed' }],
		async () => ({ roster_id: 1 }),
	);

	await assert.rejects(
		() => Sleeper.prototype.execute.call(context),
		(error) =>
			error instanceof NodeOperationError &&
			error.message === 'Unexpected response from Sleeper for Roster → Get Many' &&
			error.context.itemIndex === 0,
	);
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

test('a new-operation 404 is associated with the exact failing League ID input', async () => {
	const roster = { roster_id: 1 };
	const { context, requests } = createExecuteContext(
		[
			{ resource: 'roster', operation: 'getMany', leagueId: 'working' },
			{ resource: 'roster', operation: 'getMany', leagueId: 'missing/league' },
		],
		async (_options, requestIndex) => {
			if (requestIndex === 1) {
				throw Object.assign(new Error('not found'), { response: { statusCode: 404 } });
			}
			return [roster];
		},
	);

	await assert.rejects(
		() => Sleeper.prototype.execute.call(context),
		(error) => error instanceof NodeApiError && error.context.itemIndex === 1,
	);
	assert.equal(requests.length, 2);
	assert.equal(requests[1].url, 'https://api.sleeper.app/v1/league/missing%2Fleague/rosters');
});

test('a 429 continues from a league array operation to a successful later input', async () => {
	const user = { user_id: 'later' };
	const { context, requests } = createExecuteContext(
		[
			{ resource: 'leagueUser', operation: 'getMany', leagueId: 'limited' },
			{ resource: 'leagueUser', operation: 'getMany', leagueId: 'working' },
		],
		async (_options, requestIndex) => {
			if (requestIndex === 0) {
				throw Object.assign(new Error('limited'), {
					response: { statusCode: 429, headers: { 'retry-after': '10' } },
				});
			}
			return [user];
		},
		true,
	);

	const result = await Sleeper.prototype.execute.call(context);
	assert.equal(requests.length, 2);
	assert.equal(result[0][0].json.error.message, 'Sleeper rate limit exceeded');
	assert.deepEqual(result[0][0].pairedItem, { item: 0 });
	assert.deepEqual(result[0][1], { json: user, pairedItem: { item: 1 } });
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
