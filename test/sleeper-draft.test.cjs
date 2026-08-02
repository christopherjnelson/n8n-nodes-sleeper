const assert = require('node:assert/strict');
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

function propertiesFor(description, name, resource) {
	return description.properties.filter(
		(property) =>
			property.name === name && property.displayOptions?.show?.resource?.includes(resource),
	);
}

test('exposes exact Draft resources, operations, fields, and stable-ID guidance', () => {
	const { description } = new Sleeper();
	const resources = description.properties.find((property) => property.name === 'resource');
	const resourceValues = resources.options.map((option) => option.value);

	assert.ok(resourceValues.includes('draft'));
	assert.ok(resourceValues.includes('draftPick'));
	assert.ok(resourceValues.includes('draftTradedPick'));

	const operationValues = Object.fromEntries(
		description.properties
			.filter(
				(property) =>
					property.name === 'operation' &&
					['draft', 'draftPick', 'draftTradedPick'].includes(
						property.displayOptions.show.resource[0],
					),
			)
			.map((property) => [
				property.displayOptions.show.resource[0],
				property.options.map((option) => option.value),
			]),
	);
	assert.deepEqual(operationValues, {
		draft: ['get', 'getManyForLeague', 'getManyForUser'],
		draftPick: ['getMany'],
		draftTradedPick: ['getMany'],
	});

	assert.deepEqual(
		propertiesFor(description, 'draftId', 'draft').map(
			(property) => property.displayOptions.show.operation,
		),
		[['get']],
	);
	assert.deepEqual(
		propertiesFor(description, 'draftId', 'draftPick').map(
			(property) => property.displayOptions.show.operation,
		),
		[['getMany']],
	);
	assert.deepEqual(
		propertiesFor(description, 'draftId', 'draftTradedPick').map(
			(property) => property.displayOptions.show.operation,
		),
		[['getMany']],
	);
	assert.deepEqual(
		propertiesFor(description, 'leagueId', 'draft').map(
			(property) => property.displayOptions.show.operation,
		),
		[['getManyForLeague']],
	);

	for (const name of ['userId', 'sport', 'season']) {
		assert.deepEqual(
			propertiesFor(description, name, 'draft').map(
				(property) => property.displayOptions.show.operation,
			),
			[['getManyForUser']],
		);
	}

	const userId = propertiesFor(description, 'userId', 'draft')[0];
	assert.match(userId.description, /stable Sleeper user ID, not a username/);
	assert.match(userId.description, /User → Get/);
	assert.deepEqual(propertiesFor(description, 'sport', 'draft')[0].options, [
		{ name: 'NFL', value: 'nfl' },
	]);
	assert.equal(description.version, 1);
	assert.equal(description.usableAsTool, true);
	assert.equal(description.credentials, undefined);
});

test('routes every Draft operation through fixed-origin GET paths without query parameters', async () => {
	const parameters = [
		{ resource: 'draft', operation: 'get', draftId: 'draft/one' },
		{ resource: 'draft', operation: 'getManyForLeague', leagueId: 'league two' },
		{
			resource: 'draft',
			operation: 'getManyForUser',
			userId: 'user?three',
			sport: 'nfl',
			season: '2026',
		},
		{ resource: 'draftPick', operation: 'getMany', draftId: 'draft#four' },
		{ resource: 'draftTradedPick', operation: 'getMany', draftId: 'draft/five' },
	];
	const { context, requests } = createExecuteContext(parameters, async (_options, requestIndex) =>
		requestIndex === 0 ? {} : [],
	);

	await Sleeper.prototype.execute.call(context);

	assert.deepEqual(
		requests.map((request) => request.url),
		[
			`${API_ORIGIN}/draft/draft%2Fone`,
			`${API_ORIGIN}/league/league%20two/drafts`,
			`${API_ORIGIN}/user/user%3Fthree/drafts/nfl/2026`,
			`${API_ORIGIN}/draft/draft%23four/picks`,
			`${API_ORIGIN}/draft/draft%2Ffive/traded_picks`,
		],
	);
	assert.ok(
		requests.every(
			(request) =>
				request.method === 'GET' &&
				request.url.startsWith(`${API_ORIGIN}/`) &&
				!Object.hasOwn(request, 'qs'),
		),
	);
});

test('Draft Get preserves complete, sparse, nullable, and empty object responses per input', async () => {
	const completeDraft = {
		draft_id: '90071992547409931234',
		league_id: '90071992547409939999',
		sport: 'nfl',
		season: '2026',
		season_type: 'regular',
		status: 'complete',
		type: 'snake',
		start_time: 1780000000000,
		last_picked: null,
		draft_order: {
			'90071992547409935555': 1,
			'90071992547409936666': 2,
		},
		slot_to_roster_id: { 1: 10, 2: 3 },
		settings: { teams: 2, rounds: 3, pick_timer: 120, slots_flex: 1 },
		metadata: null,
		creators: null,
	};
	const sparseDraft = { draft_id: 'sparse', metadata: { name: 'Synthetic Draft' } };
	const parameters = [
		{ resource: 'draft', operation: 'get', draftId: ' 90071992547409931234 ' },
		{ resource: 'draft', operation: 'get', draftId: 'sparse' },
		{ resource: 'draft', operation: 'get', draftId: 'empty-object' },
	];
	const responses = [completeDraft, sparseDraft, {}];
	const { context, requests } = createExecuteContext(
		parameters,
		async (_options, requestIndex) => responses[requestIndex],
	);

	assert.deepEqual(await Sleeper.prototype.execute.call(context), [
		responses.map((draft, item) => ({ json: draft, pairedItem: { item } })),
	]);
	assert.equal(requests[0].url, `${API_ORIGIN}/draft/90071992547409931234`);
});

test('Draft Get reports null as not found and rejects an unexpected primitive', async () => {
	for (const response of [null, 'malformed']) {
		const { context } = createExecuteContext(
			[{ resource: 'draft', operation: 'get', draftId: 'unknown' }],
			async () => response,
		);

		await assert.rejects(
			() => Sleeper.prototype.execute.call(context),
			(error) =>
				error instanceof NodeOperationError &&
				error.context.itemIndex === 0 &&
				(response === null
					? error.message === 'Sleeper resource was not found'
					: error.message === 'Unexpected response from Sleeper for Draft → Get'),
		);
	}
});

test('Draft Get Many for League preserves all drafts and Sleeper order across inputs', async () => {
	const firstDrafts = [
		{ draft_id: 'newest', league_id: 'league-a', season: '2027', type: 'rookie' },
		{ draft_id: 'older', league_id: 'league-a', season: '2026', type: 'snake', metadata: null },
	];
	const secondDrafts = [
		{ draft_id: 'supplemental', league_id: '90071992547409931234', season: '2026' },
	];
	const { context, requests } = createExecuteContext(
		[
			{ resource: 'draft', operation: 'getManyForLeague', leagueId: 'league-a' },
			{
				resource: 'draft',
				operation: 'getManyForLeague',
				leagueId: '90071992547409931234',
			},
		],
		async (_options, requestIndex) => [firstDrafts, secondDrafts][requestIndex],
	);

	assert.deepEqual(await Sleeper.prototype.execute.call(context), [
		[
			...firstDrafts.map((draft) => ({ json: draft, pairedItem: { item: 0 } })),
			...secondDrafts.map((draft) => ({ json: draft, pairedItem: { item: 1 } })),
		],
	]);
	assert.deepEqual(
		requests.map((request) => request.url),
		[`${API_ORIGIN}/league/league-a/drafts`, `${API_ORIGIN}/league/90071992547409931234/drafts`],
	);
});

test('Draft Get Many for League keeps later pairing when the first result is empty', async () => {
	const laterDraft = { draft_id: 'later', season: '2024' };
	const { context } = createExecuteContext(
		[
			{ resource: 'draft', operation: 'getManyForLeague', leagueId: 'empty' },
			{ resource: 'draft', operation: 'getManyForLeague', leagueId: 'populated' },
		],
		async (_options, requestIndex) => (requestIndex === 0 ? [] : [laterDraft]),
	);

	assert.deepEqual(await Sleeper.prototype.execute.call(context), [
		[{ json: laterDraft, pairedItem: { item: 1 } }],
	]);
});

test('Draft Get Many for User preserves opaque IDs, exact seasons, and per-input output pairing', async () => {
	const firstDrafts = [
		{ draft_id: 'one', season: '2017', draft_order: null },
		{ draft_id: 'two', season: '2017', creators: null },
	];
	const laterDraft = { draft_id: 'three', season: '2026', metadata: null };
	const { context, requests } = createExecuteContext(
		[
			{
				resource: 'draft',
				operation: 'getManyForUser',
				userId: 'username-like-value',
				sport: 'nfl',
				season: '2017',
			},
			{
				resource: 'draft',
				operation: 'getManyForUser',
				userId: '90071992547409931234',
				sport: 'nfl',
				season: ' 2026 ',
			},
		],
		async (_options, requestIndex) => (requestIndex === 0 ? firstDrafts : [laterDraft]),
	);

	assert.deepEqual(await Sleeper.prototype.execute.call(context), [
		[
			...firstDrafts.map((draft) => ({ json: draft, pairedItem: { item: 0 } })),
			{ json: laterDraft, pairedItem: { item: 1 } },
		],
	]);
	assert.deepEqual(
		requests.map((request) => request.url),
		[
			`${API_ORIGIN}/user/username-like-value/drafts/nfl/2017`,
			`${API_ORIGIN}/user/90071992547409931234/drafts/nfl/2026`,
		],
	);
});

test('Draft Get Many for User emits no items for an empty array', async () => {
	const { context } = createExecuteContext(
		[
			{
				resource: 'draft',
				operation: 'getManyForUser',
				userId: 'synthetic-user',
				sport: 'nfl',
				season: '2023',
			},
		],
		async () => [],
	);

	assert.deepEqual(await Sleeper.prototype.execute.call(context), [[]]);
});

test('Draft Get Many for User rejects invalid seasons before making an HTTP request', async () => {
	for (const season of ['26', '20260', '20x6', '']) {
		const { context, requests } = createExecuteContext(
			[
				{
					resource: 'draft',
					operation: 'getManyForUser',
					userId: 'synthetic-user',
					sport: 'nfl',
					season,
				},
			],
			async () => [],
		);

		await assert.rejects(
			() => Sleeper.prototype.execute.call(context),
			(error) =>
				error instanceof NodeOperationError &&
				error.message === 'Season must be a four-digit year' &&
				error.context.itemIndex === 0,
		);
		assert.equal(requests.length, 0);
	}
});

test('Draft ID validation rejects empty and non-string inputs before transport', async () => {
	for (const draftId of ['', '   ', 9007199254740992]) {
		const { context, requests } = createExecuteContext(
			[{ resource: 'draftPick', operation: 'getMany', draftId }],
			async () => [],
		);

		await assert.rejects(
			() => Sleeper.prototype.execute.call(context),
			(error) => error instanceof NodeOperationError && error.context.itemIndex === 0,
		);
		assert.equal(requests.length, 0);
	}
});

test('Draft Pick Get Many preserves pick order, IDs, counters, and metadata without enrichment', async () => {
	const picks = [
		{
			draft_id: '90071992547409931234',
			pick_no: 1,
			round: 1,
			draft_slot: 2,
			roster_id: '90071992547409932222',
			picked_by: '90071992547409933333',
			player_id: '90071992547409934444',
			is_keeper: null,
			metadata: {
				first_name: 'Example',
				last_name: 'Runner',
				position: 'RB',
				team: 'TST',
				years_exp: '2',
			},
		},
		{
			draft_id: '90071992547409931234',
			pick_no: 7,
			round: 2,
			draft_slot: 1,
			roster_id: '2',
			picked_by: '',
			player_id: 'DEF',
			is_keeper: true,
			metadata: { position: 'DEF' },
		},
		{
			draft_id: '90071992547409931234',
			pick_no: 8,
			player_id: 'sparse-player',
			metadata: null,
		},
	];
	const { context, requests } = createExecuteContext(
		[{ resource: 'draftPick', operation: 'getMany', draftId: '90071992547409931234' }],
		async () => picks,
	);

	assert.deepEqual(await Sleeper.prototype.execute.call(context), [
		picks.map((pick) => ({ json: pick, pairedItem: { item: 0 } })),
	]);
	assert.equal(requests.length, 1);
	assert.equal(requests[0].url, `${API_ORIGIN}/draft/90071992547409931234/picks`);
});

test('Draft Pick Get Many supports two inputs and an empty first result without losing pairing', async () => {
	const laterPicks = [
		{ draft_id: 'second', pick_no: 2, round: 1, draft_slot: 2, player_id: 'player-two' },
		{ draft_id: 'second', pick_no: 3, round: 1, draft_slot: 3, player_id: 'player-three' },
	];
	const { context, requests } = createExecuteContext(
		[
			{ resource: 'draftPick', operation: 'getMany', draftId: 'first' },
			{ resource: 'draftPick', operation: 'getMany', draftId: 'second' },
		],
		async (_options, requestIndex) => (requestIndex === 0 ? [] : laterPicks),
	);

	assert.deepEqual(await Sleeper.prototype.execute.call(context), [
		laterPicks.map((pick) => ({ json: pick, pairedItem: { item: 1 } })),
	]);
	assert.deepEqual(
		requests.map((request) => request.url),
		[`${API_ORIGIN}/draft/first/picks`, `${API_ORIGIN}/draft/second/picks`],
	);
});

test('Draft Traded Pick Get Many preserves raw ownership records and later-input pairing', async () => {
	const tradedPicks = [
		{ season: '2027', round: 1, roster_id: 1, previous_owner_id: 1, owner_id: 2 },
		{ season: '2028', round: 3, roster_id: 4, previous_owner_id: 2, owner_id: 3 },
		{ season: '2028', round: 5, roster_id: 6, owner_id: 7, note: null },
	];
	const { context, requests } = createExecuteContext(
		[
			{ resource: 'draftTradedPick', operation: 'getMany', draftId: 'empty-draft' },
			{ resource: 'draftTradedPick', operation: 'getMany', draftId: 'draft/with trades' },
		],
		async (_options, requestIndex) => (requestIndex === 0 ? [] : tradedPicks),
	);

	assert.deepEqual(await Sleeper.prototype.execute.call(context), [
		tradedPicks.map((pick) => ({ json: pick, pairedItem: { item: 1 } })),
	]);
	assert.deepEqual(
		requests.map((request) => request.url),
		[
			`${API_ORIGIN}/draft/empty-draft/traded_picks`,
			`${API_ORIGIN}/draft/draft%2Fwith%20trades/traded_picks`,
		],
	);
});

test('Draft array operations reject malformed object responses at the originating input', async () => {
	for (const parameters of [
		{ resource: 'draft', operation: 'getManyForLeague', leagueId: 'malformed' },
		{
			resource: 'draft',
			operation: 'getManyForUser',
			userId: 'malformed',
			sport: 'nfl',
			season: '2026',
		},
		{ resource: 'draftPick', operation: 'getMany', draftId: 'malformed' },
		{ resource: 'draftTradedPick', operation: 'getMany', draftId: 'malformed' },
	]) {
		const { context } = createExecuteContext([parameters], async () => ({ unexpected: true }));

		await assert.rejects(
			() => Sleeper.prototype.execute.call(context),
			(error) =>
				error instanceof NodeOperationError &&
				error.message.startsWith('Unexpected response from Sleeper') &&
				error.context.itemIndex === 0,
		);
	}
});

test('a Draft Get 404 is paired to its input and later Draft Get inputs continue', async () => {
	const laterDraft = { draft_id: 'working', status: 'pre_draft' };
	const { context, requests } = createExecuteContext(
		[
			{ resource: 'draft', operation: 'get', draftId: 'missing/draft' },
			{ resource: 'draft', operation: 'get', draftId: 'working' },
		],
		async (_options, requestIndex) => {
			if (requestIndex === 0) {
				throw Object.assign(new Error('not found'), { response: { statusCode: 404 } });
			}
			return laterDraft;
		},
		true,
	);

	const result = await Sleeper.prototype.execute.call(context);
	assert.equal(result[0][0].json.error.message, 'Sleeper resource was not found');
	assert.equal(result[0][0].json.error.httpCode, '404');
	assert.deepEqual(result[0][0].pairedItem, { item: 0 });
	assert.deepEqual(result[0][1], { json: laterDraft, pairedItem: { item: 1 } });
	assert.equal(requests[0].url, `${API_ORIGIN}/draft/missing%2Fdraft`);
});

test('a Draft Pick 429 returns a paired error and continues to a later input', async () => {
	const laterPick = { draft_id: 'working', pick_no: 1, player_id: 'synthetic-player' };
	const { context, requests } = createExecuteContext(
		[
			{ resource: 'draftPick', operation: 'getMany', draftId: 'limited' },
			{ resource: 'draftPick', operation: 'getMany', draftId: 'working' },
		],
		async (_options, requestIndex) => {
			if (requestIndex === 0) {
				throw Object.assign(new Error('limited'), {
					response: { statusCode: 429, headers: { 'retry-after': '12' } },
				});
			}
			return [laterPick];
		},
		true,
	);

	const result = await Sleeper.prototype.execute.call(context);
	assert.equal(requests.length, 2);
	assert.equal(result[0][0].json.error.message, 'Sleeper rate limit exceeded');
	assert.deepEqual(result[0][0].pairedItem, { item: 0 });
	assert.deepEqual(result[0][1], { json: laterPick, pairedItem: { item: 1 } });
});

test('Draft network failures preserve operation and input context', async () => {
	const { context } = createExecuteContext(
		[{ resource: 'draftTradedPick', operation: 'getMany', draftId: 'network-failure' }],
		async () => {
			throw Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' });
		},
	);

	await assert.rejects(
		() => Sleeper.prototype.execute.call(context),
		(error) => {
			assert.ok(error instanceof NodeApiError);
			assert.equal(error.message, 'Could not connect to Sleeper');
			assert.match(error.description, /Draft Traded Pick → Get Many/);
			assert.equal(error.context.itemIndex, 0);
			return true;
		},
	);
});
