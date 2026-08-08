const assert = require('node:assert/strict');
const test = require('node:test');

const { NodeApiError, NodeOperationError } = require('n8n-workflow');
const { SleeperTrigger } = require('../dist/nodes/SleeperTrigger/SleeperTrigger.node.js');
const {
	NFL_SEASON_TYPES,
	NFL_WEEK_CHANGED_EVENT,
	NFL_WEEK_CHANGED_EVENT_NAME,
	compareNflWeekCursors,
	getNflSeasonTypeRank,
} = require('../dist/nodes/SleeperTrigger/nflWeekChanged.js');

const API_URL = 'https://api.sleeper.app/v1/state/nfl';
const FINGERPRINT = JSON.stringify(['nflWeekChanged', 'nfl']);

function getNode() {
	return {
		name: 'Sleeper Trigger',
		type: 'n8n-nodes-sleeper.sleeperTrigger',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
}

function nflState(overrides = {}) {
	return {
		week: 5,
		season_type: 'regular',
		season_start_date: '2026-09-10',
		season: '2026',
		previous_season: '2025',
		leg: 5,
		league_season: '2026',
		league_create_season: '2027',
		display_week: 5,
		...overrides,
	};
}

function cursor(season = '2026', seasonType = 'regular', week = 5) {
	return { season, seasonType, week };
}

function productionState(value = cursor()) {
	return { configurationFingerprint: FINGERPRINT, highestObservedNflWeekCursor: value };
}

function createPollContext({ mode = 'trigger', staticData = {}, requestHandler } = {}) {
	const requests = [];
	let staticDataReads = 0;
	let response = nflState();
	let parameters = { event: 'nflWeekChanged' };
	return {
		context: {
			getMode: () => mode,
			getNode,
			getNodeParameter: (name, fallback) =>
				Object.hasOwn(parameters, name) ? parameters[name] : fallback,
			getWorkflowStaticData(scope) {
				assert.equal(scope, 'node');
				staticDataReads++;
				return staticData;
			},
			helpers: {
				async httpRequest(options) {
					requests.push(options);
					return requestHandler ? await requestHandler(options) : response;
				},
			},
		},
		requests,
		staticData,
		setResponse(value) {
			response = value;
		},
		setParameters(value) {
			parameters = value;
		},
		get staticDataReads() {
			return staticDataReads;
		},
	};
}

async function poll(fixture) {
	return await SleeperTrigger.prototype.poll.call(fixture.context);
}

test('exports the exact NFL event contract and explicit phase order', () => {
	assert.equal(NFL_WEEK_CHANGED_EVENT, 'nflWeekChanged');
	assert.equal(NFL_WEEK_CHANGED_EVENT_NAME, 'nfl.week_changed');
	assert.deepEqual(NFL_SEASON_TYPES, ['pre', 'regular', 'post']);
	assert.deepEqual(NFL_SEASON_TYPES.map(getNflSeasonTypeRank), [0, 1, 2]);
});

test('exposes NFL Week Changed fourth with no event-specific parameters', () => {
	const [event, draftId, leagueId, round] = new SleeperTrigger().description.properties;
	assert.deepEqual(
		event.options.map(({ value }) => value),
		['draftPickMade', 'transactionChanged', 'leagueStatusChanged', 'nflWeekChanged'],
	);
	assert.equal(event.options[3].name, 'NFL Week Changed');
	assert.deepEqual(draftId.displayOptions.show.event, ['draftPickMade']);
	assert.deepEqual(leagueId.displayOptions.show.event, [
		'transactionChanged',
		'leagueStatusChanged',
	]);
	assert.deepEqual(round.displayOptions.show.event, ['transactionChanged']);
	for (const property of [draftId, leagueId, round])
		assert.equal(property.displayOptions.show.event.includes('nflWeekChanged'), false);
});

test('manual mode makes one exact request, returns one raw preview, and never reads static data', async () => {
	const raw = nflState({
		week: 0,
		season_type: 'pre',
		leg: 18,
		display_week: 1,
		opaque_id: '90071992547409931234',
	});
	const state = productionState(cursor('2025', 'post', 4));
	const before = structuredClone(state);
	const fixture = createPollContext({
		mode: 'manual',
		staticData: state,
		requestHandler: async () => raw,
	});
	const result = await poll(fixture);
	assert.deepEqual(fixture.requests, [
		{ method: 'GET', url: API_URL, json: true, timeout: 30_000 },
	]);
	assert.equal(result.length, 1);
	assert.equal(result[0].length, 1);
	assert.equal(result[0][0].pairedItem, undefined);
	for (const [key, value] of Object.entries(raw)) assert.deepEqual(result[0][0].json[key], value);
	assert.equal(result[0][0].json.event, 'nfl.week_changed');
	assert.match(result[0][0].json.observed_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
	assert.deepEqual(
		Object.keys(result[0][0].json).sort(),
		[...Object.keys(raw), 'event', 'observed_at'].sort(),
	);
	assert.equal(fixture.staticDataReads, 0);
	assert.deepEqual(state, before);
});

test('validates every documented season type and permits week zero', async () => {
	for (const seasonType of NFL_SEASON_TYPES) {
		const fixture = createPollContext({
			requestHandler: async () => nflState({ season_type: seasonType, week: 0 }),
		});
		assert.equal(await poll(fixture), null);
		assert.deepEqual(fixture.staticData, productionState(cursor('2026', seasonType, 0)));
	}
});

test('rejects non-object and array responses before static-data access', async () => {
	for (const response of [null, 'state', 1, [], [nflState()]]) {
		const fixture = createPollContext({ requestHandler: async () => response });
		await assert.rejects(() => poll(fixture), NodeOperationError);
		assert.equal(fixture.staticDataReads, 0);
		assert.deepEqual(fixture.staticData, {});
	}
});

test('rejects malformed seasons without changing compatible state', async () => {
	for (const season of [undefined, 2026, '', ' ', '-1', '+2026', '20.26', '２０２６']) {
		const state = productionState();
		const before = structuredClone(state);
		const fixture = createPollContext({
			staticData: state,
			requestHandler: async () => nflState({ season }),
		});
		await assert.rejects(() => poll(fixture), NodeOperationError);
		assert.deepEqual(state, before);
	}
});

test('rejects missing and unknown season types without changing state', async () => {
	for (const season_type of [undefined, '', 'PRE', 'off', 'future']) {
		const state = productionState();
		const before = structuredClone(state);
		const fixture = createPollContext({
			staticData: state,
			requestHandler: async () => nflState({ season_type }),
		});
		await assert.rejects(() => poll(fixture), NodeOperationError);
		assert.deepEqual(state, before);
	}
});

test('rejects invalid week values without changing state', async () => {
	for (const week of [
		undefined,
		-1,
		1.5,
		Number.POSITIVE_INFINITY,
		Number.MAX_SAFE_INTEGER + 1,
		'5',
	]) {
		const state = productionState();
		const before = structuredClone(state);
		const fixture = createPollContext({
			staticData: state,
			requestHandler: async () => nflState({ week }),
		});
		await assert.rejects(() => poll(fixture), NodeOperationError);
		assert.deepEqual(state, before);
	}
});

test('accepts differing leg/display_week and preserves large decimal strings unchanged', async () => {
	const raw = nflState({
		season: '00000000000000000000002026',
		week: 6,
		leg: 2,
		display_week: 17,
		league_season: '00002026',
	});
	const fixture = createPollContext({ mode: 'manual', requestHandler: async () => raw });
	const output = (await poll(fixture))[0][0].json;
	for (const [key, value] of Object.entries(raw)) assert.deepEqual(output[key], value);
	assert.equal(output.season, raw.season);
	assert.equal(output.league_season, raw.league_season);
});

test('compares numeric seasons before phase and week without precision or lexical errors', () => {
	assert.equal(compareNflWeekCursors(cursor('9', 'post', 99), cursor('10', 'pre', 0)), -1);
	assert.equal(
		compareNflWeekCursors(
			cursor('90071992547409931234567890', 'pre', 0),
			cursor('90071992547409931234567889', 'post', 99),
		),
		1,
	);
	assert.equal(compareNflWeekCursors(cursor('2026', 'regular', 1), cursor('2026', 'pre', 99)), 1);
	assert.equal(
		compareNflWeekCursors(cursor('2026', 'regular', 6), cursor('2026', 'regular', 5)),
		1,
	);
	assert.equal(
		compareNflWeekCursors(cursor('02026', 'regular', 5), cursor('2026', 'regular', 5)),
		0,
	);
});

test('first production poll stores only the NFL fingerprint and cursor without history', async () => {
	const state = {
		configurationFingerprint: JSON.stringify(['draftPickMade', 'draft-one']),
		highestObservedPickNo: 44,
		transactionStatusById: [{ transactionId: 'old', statusUpdated: 1 }],
		highestObservedLeagueStatus: 'complete',
	};
	const fixture = createPollContext({
		staticData: state,
		requestHandler: async () => nflState({ week: 6 }),
	});
	assert.equal(await poll(fixture), null);
	assert.deepEqual(state, productionState(cursor('2026', 'regular', 6)));
	assert.equal(fixture.requests.length, 1);
});

test('switching from NFL state preserves each existing event fresh-baseline contract', async () => {
	const cases = [
		{
			parameters: { event: 'draftPickMade', draftId: 'draft-one' },
			response: [{ pick_no: 4 }],
			expected: {
				configurationFingerprint: JSON.stringify(['draftPickMade', 'draft-one']),
				highestObservedPickNo: 4,
			},
		},
		{
			parameters: { event: 'transactionChanged', leagueId: 'league-one', round: 3 },
			response: [],
			expected: {
				configurationFingerprint: JSON.stringify(['transactionChanged', 'league-one', '3']),
				transactionStatusById: [],
			},
		},
		{
			parameters: { event: 'leagueStatusChanged', leagueId: 'league-one' },
			response: { league_id: 'league-one', status: 'in_season' },
			expected: {
				configurationFingerprint: JSON.stringify(['leagueStatusChanged', 'league-one']),
				highestObservedLeagueStatus: 'in_season',
			},
		},
	];

	for (const { parameters, response, expected } of cases) {
		const state = productionState();
		const fixture = createPollContext({ staticData: state });
		fixture.setParameters(parameters);
		fixture.setResponse(response);
		assert.equal(await poll(fixture), null);
		assert.deepEqual(state, expected);
	}
});

test('malformed compatible saved state becomes a fresh validated baseline', async () => {
	for (const saved of [
		null,
		[],
		{},
		cursor('', 'regular', 5),
		cursor('2026', 'future', 5),
		cursor('2026', 'regular', -1),
	]) {
		const state = productionState(saved);
		const fixture = createPollContext({
			staticData: state,
			requestHandler: async () => nflState({ week: 7 }),
		});
		assert.equal(await poll(fixture), null);
		assert.deepEqual(state, productionState(cursor('2026', 'regular', 7)));
	}
});

test('equal cursor and leg/display-only changes emit nothing and preserve state', async () => {
	const state = productionState();
	const before = structuredClone(state);
	const fixture = createPollContext({
		staticData: state,
		requestHandler: async () => nflState({ leg: 99, display_week: 0 }),
	});
	assert.equal(await poll(fixture), null);
	assert.deepEqual(state, before);
});

test('higher and skipped weeks emit one current state once despite fixed leg/display_week', async () => {
	const fixture = createPollContext({ staticData: productionState(cursor('2026', 'regular', 4)) });
	fixture.setResponse(nflState({ week: 6, leg: 4, display_week: 4 }));
	const result = await poll(fixture);
	assert.equal(result[0].length, 1);
	assert.equal(result[0][0].json.week, 6);
	assert.deepEqual(fixture.staticData, productionState(cursor('2026', 'regular', 6)));
	assert.equal(await poll(fixture), null);
});

test('a stale lower week never rewinds or replays and later advancement emits', async () => {
	const fixture = createPollContext({ staticData: productionState() });
	fixture.setResponse(nflState({ week: 4 }));
	assert.equal(await poll(fixture), null);
	assert.deepEqual(fixture.staticData, productionState());
	fixture.setResponse(nflState({ week: 5 }));
	assert.equal(await poll(fixture), null);
	fixture.setResponse(nflState({ week: 6 }));
	assert.equal((await poll(fixture))[0][0].json.week, 6);
});

test('forward phase transitions emit despite week reset and do not replay', async () => {
	for (const [fromType, toType] of [
		['pre', 'regular'],
		['regular', 'post'],
		['pre', 'post'],
	]) {
		const fixture = createPollContext({
			staticData: productionState(cursor('2026', fromType, 18)),
		});
		fixture.setResponse(nflState({ season_type: toType, week: 1 }));
		const result = await poll(fixture);
		assert.equal(result[0].length, 1);
		assert.deepEqual(fixture.staticData, productionState(cursor('2026', toType, 1)));
		assert.equal(await poll(fixture), null);
	}
});

test('phase advancement with equal week emits', async () => {
	const fixture = createPollContext({ staticData: productionState(cursor('2026', 'pre', 5)) });
	fixture.setResponse(nflState({ season_type: 'regular', week: 5 }));
	assert.equal((await poll(fixture))[0][0].json.event, NFL_WEEK_CHANGED_EVENT_NAME);
});

test('backward phases are suppressed without rewinding or replaying', async () => {
	for (const [savedType, staleType] of [
		['regular', 'pre'],
		['post', 'regular'],
		['post', 'pre'],
	]) {
		const state = productionState(cursor('2026', savedType, 2));
		const fixture = createPollContext({ staticData: state });
		fixture.setResponse(nflState({ season_type: staleType, week: 18 }));
		assert.equal(await poll(fixture), null);
		assert.deepEqual(state, productionState(cursor('2026', savedType, 2)));
		fixture.setResponse(nflState({ season_type: savedType, week: 2 }));
		assert.equal(await poll(fixture), null);
	}
});

test('higher season emits despite phase reset and supports week zero', async () => {
	const fixture = createPollContext({ staticData: productionState(cursor('2026', 'post', 4)) });
	fixture.setResponse(nflState({ season: '2027', season_type: 'pre', week: 0 }));
	assert.equal((await poll(fixture))[0][0].json.week, 0);
	assert.deepEqual(fixture.staticData, productionState(cursor('2027', 'pre', 0)));
});

test('lower season is stale, restoration does not replay, and later movement emits', async () => {
	const fixture = createPollContext({ staticData: productionState(cursor('2027', 'pre', 1)) });
	fixture.setResponse(nflState({ season: '2026', season_type: 'post', week: 4 }));
	assert.equal(await poll(fixture), null);
	assert.deepEqual(fixture.staticData, productionState(cursor('2027', 'pre', 1)));
	fixture.setResponse(nflState({ season: '2027', season_type: 'pre', week: 1 }));
	assert.equal(await poll(fixture), null);
	fixture.setResponse(nflState({ season: '2027', season_type: 'pre', week: 2 }));
	assert.equal((await poll(fixture))[0][0].json.week, 2);
});

test('HTTP 429, timeout, and connection errors preserve state and guidance', async () => {
	for (const [error, expected] of [
		[
			Object.assign(new Error('rate limited'), {
				response: { statusCode: 429, headers: { 'retry-after': '8' } },
			}),
			'Sleeper rate limit exceeded',
		],
		[
			Object.assign(new Error('socket timed out'), { code: 'ETIMEDOUT' }),
			'Sleeper request timed out',
		],
		[
			Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' }),
			'Could not connect to Sleeper',
		],
	]) {
		const state = productionState();
		const before = structuredClone(state);
		const fixture = createPollContext({
			staticData: state,
			requestHandler: async () => {
				throw error;
			},
		});
		await assert.rejects(
			() => poll(fixture),
			(candidate) => {
				assert.ok(candidate instanceof NodeApiError);
				assert.equal(candidate.message, expected);
				if (expected.includes('rate limit')) {
					assert.match(candidate.description, /Reduce request or polling frequency/);
					assert.equal(candidate.context.retryAfter, '8');
				}
				return true;
			},
		);
		assert.deepEqual(state, before);
	}
});

test('output construction failure cannot advance state or emit partial output', async () => {
	const state = productionState();
	const raw = nflState({ week: 6 });
	Object.defineProperty(raw, 'explosive', {
		enumerable: true,
		get() {
			throw new Error('output failed');
		},
	});
	const fixture = createPollContext({ staticData: state, requestHandler: async () => raw });
	await assert.rejects(() => poll(fixture), /output failed/);
	assert.deepEqual(state, productionState());
});

test('each poll makes exactly one state request and no enrichment request', async () => {
	const fixture = createPollContext({ staticData: productionState(cursor('2026', 'regular', 4)) });
	await poll(fixture);
	assert.equal(fixture.requests.length, 1);
	assert.equal(fixture.requests[0].url, API_URL);
});
