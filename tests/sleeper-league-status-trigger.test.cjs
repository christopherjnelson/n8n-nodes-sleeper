const assert = require('node:assert/strict');
const test = require('node:test');

const { NodeApiError, NodeOperationError } = require('n8n-workflow');
const {
	getLeagueStatusRank,
	LEAGUE_STATUSES,
} = require('../dist/nodes/SleeperTrigger/leagueStatusChanged.js');
const { SleeperTrigger } = require('../dist/nodes/SleeperTrigger/SleeperTrigger.node.js');

const API_ORIGIN = 'https://api.sleeper.app/v1';
const PARAMETERS = { event: 'leagueStatusChanged', leagueId: 'league-one' };

function getNode() {
	return {
		name: 'Sleeper Trigger',
		type: 'n8n-nodes-sleeper.sleeperTrigger',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
}

function league(status, overrides = {}) {
	return {
		total_rosters: 12,
		status,
		sport: 'nfl',
		season: '2026',
		league_id: '90071992547409931234',
		settings: { playoff_teams: 6 },
		avatar: null,
		...overrides,
	};
}

function configurationFingerprint(leagueId = 'league-one') {
	return JSON.stringify(['leagueStatusChanged', leagueId]);
}

function leagueState(status, leagueId = 'league-one') {
	return {
		configurationFingerprint: configurationFingerprint(leagueId),
		highestObservedLeagueStatus: status,
	};
}

function createPollContext({
	parameters = PARAMETERS,
	mode = 'trigger',
	staticData = {},
	requestHandler = async () => league('pre_draft'),
} = {}) {
	const requests = [];
	let staticDataReads = 0;
	return {
		context: {
			getMode: () => mode,
			getNode,
			getNodeParameter(name, fallback) {
				return Object.hasOwn(parameters, name) ? parameters[name] : fallback;
			},
			getWorkflowStaticData(scope) {
				assert.equal(scope, 'node');
				staticDataReads++;
				return staticData;
			},
			helpers: {
				async httpRequest(options) {
					requests.push(options);
					return await requestHandler(options, requests.length - 1);
				},
			},
		},
		requests,
		staticData,
		get staticDataReads() {
			return staticDataReads;
		},
	};
}

async function poll(fixture) {
	return await SleeperTrigger.prototype.poll.call(fixture.context);
}

test('defines the documented league lifecycle in strictly increasing rank order', () => {
	assert.deepEqual(LEAGUE_STATUSES, ['pre_draft', 'drafting', 'in_season', 'complete']);
	assert.deepEqual(LEAGUE_STATUSES.map(getLeagueStatusRank), [0, 1, 2, 3]);
});

test('uses exactly one encoded documented league request with a trimmed opaque League ID', async () => {
	const leagueId = '90071992547409931234/opaque';
	const fixture = createPollContext({
		parameters: { event: 'leagueStatusChanged', leagueId: `  ${leagueId}  ` },
	});
	assert.equal(await poll(fixture), null);
	assert.deepEqual(fixture.requests, [
		{
			method: 'GET',
			url: `${API_ORIGIN}/league/90071992547409931234%2Fopaque`,
			json: true,
			timeout: 30_000,
		},
	]);
	assert.deepEqual(fixture.staticData, leagueState('pre_draft', leagueId));
	assert.equal(typeof JSON.parse(fixture.staticData.configurationFingerprint)[1], 'string');
	assert.doesNotMatch(
		fixture.requests[0].url,
		/state\/nfl|rosters|users|draft|players|transactions/,
	);
});

test('requires a non-empty string League ID without control characters before transport', async () => {
	for (const leagueId of [
		undefined,
		'',
		'   ',
		9007199254740992,
		'league\u0000id',
		'\u007fleague',
	]) {
		const parameters = { ...PARAMETERS };
		if (leagueId === undefined) delete parameters.leagueId;
		else parameters.leagueId = leagueId;
		const fixture = createPollContext({ parameters });
		await assert.rejects(
			() => poll(fixture),
			(error) => error instanceof NodeOperationError,
		);
		assert.equal(fixture.requests.length, 0);
	}
});

test('accepts every documented status and preserves each as the first production baseline', async () => {
	for (const status of LEAGUE_STATUSES) {
		const fixture = createPollContext({ requestHandler: async () => league(status) });
		assert.equal(await poll(fixture), null);
		assert.deepEqual(fixture.staticData, leagueState(status));
		assert.deepEqual(Object.keys(fixture.staticData), [
			'configurationFingerprint',
			'highestObservedLeagueStatus',
		]);
	}
});

test('rejects malformed league responses completely without reading or mutating state', async () => {
	class LeagueClass {
		constructor() {
			this.status = 'in_season';
		}
	}
	const malformedResponses = [
		null,
		'in_season',
		[],
		new LeagueClass(),
		{},
		league(undefined),
		league(2),
		league(''),
		league('IN_SEASON'),
		league('paused'),
	];
	for (const response of malformedResponses) {
		const state = leagueState('drafting');
		const before = structuredClone(state);
		const fixture = createPollContext({ staticData: state, requestHandler: async () => response });
		await assert.rejects(
			() => poll(fixture),
			(error) =>
				error instanceof NodeOperationError &&
				error.message === 'Unexpected response from Sleeper for League Status Changed',
		);
		assert.equal(fixture.staticDataReads, 0);
		assert.deepEqual(state, before);
	}
});

test('manual mode returns exactly one raw current league with metadata and no state access', async () => {
	const raw = league('in_season', {
		league_id: '90071992547409935555',
		previous_league_id: '90071992547409936666',
		draft_id: '90071992547409937777',
		custom_field: { nested: ['unchanged', null] },
	});
	const state = leagueState('complete');
	const before = structuredClone(state);
	const fixture = createPollContext({
		mode: 'manual',
		staticData: state,
		requestHandler: async () => raw,
	});
	const result = await poll(fixture);
	assert.equal(result.length, 1);
	assert.equal(result[0].length, 1);
	const output = result[0][0];
	for (const [key, value] of Object.entries(raw)) assert.deepEqual(output.json[key], value);
	assert.equal(output.json.event, 'league.status_changed');
	assert.match(output.json.observed_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
	assert.equal(typeof output.json.league_id, 'string');
	assert.equal(output.pairedItem, undefined);
	assert.equal(Object.hasOwn(output.json, 'previous_status'), false);
	assert.equal(Object.hasOwn(output.json, 'lifecycle_rank'), false);
	assert.equal(Object.hasOwn(output.json, 'data'), false);
	assert.equal(fixture.staticDataReads, 0);
	assert.deepEqual(state, before);
});

test('same status emits nothing and leaves production state unchanged', async () => {
	for (const status of LEAGUE_STATUSES) {
		const state = leagueState(status);
		const before = structuredClone(state);
		const fixture = createPollContext({
			staticData: state,
			requestHandler: async () => league(status),
		});
		assert.equal(await poll(fixture), null);
		assert.deepEqual(state, before);
	}
});

test('every forward and skipped lifecycle progression emits exactly once and advances state', async () => {
	for (let savedIndex = 0; savedIndex < LEAGUE_STATUSES.length - 1; savedIndex++) {
		for (let currentIndex = savedIndex + 1; currentIndex < LEAGUE_STATUSES.length; currentIndex++) {
			const savedStatus = LEAGUE_STATUSES[savedIndex];
			const currentStatus = LEAGUE_STATUSES[currentIndex];
			const fixture = createPollContext({
				staticData: leagueState(savedStatus),
				requestHandler: async () => league(currentStatus),
			});
			const result = await poll(fixture);
			assert.equal(result[0].length, 1);
			assert.equal(result[0][0].json.status, currentStatus);
			assert.equal(result[0][0].json.event, 'league.status_changed');
			assert.match(result[0][0].json.observed_at, /^\d{4}-\d{2}-\d{2}T/);
			assert.deepEqual(fixture.staticData, leagueState(currentStatus));
			assert.equal(await poll(fixture), null);
		}
	}
});

test('every backward response is suppressed without rewinding or replaying saved state', async () => {
	for (let savedIndex = 1; savedIndex < LEAGUE_STATUSES.length; savedIndex++) {
		for (let currentIndex = 0; currentIndex < savedIndex; currentIndex++) {
			const savedStatus = LEAGUE_STATUSES[savedIndex];
			let currentStatus = LEAGUE_STATUSES[currentIndex];
			const state = leagueState(savedStatus);
			const before = structuredClone(state);
			const fixture = createPollContext({
				staticData: state,
				requestHandler: async () => league(currentStatus),
			});
			assert.equal(await poll(fixture), null);
			assert.deepEqual(state, before);
			currentStatus = savedStatus;
			assert.equal(await poll(fixture), null);
			assert.deepEqual(state, before);
		}
	}
});

test('a stale lower status does not block a later status higher than the saved watermark', async () => {
	let status = 'pre_draft';
	const fixture = createPollContext({
		staticData: leagueState('drafting'),
		requestHandler: async () => league(status),
	});
	assert.equal(await poll(fixture), null);
	status = 'in_season';
	assert.equal((await poll(fixture))[0][0].json.status, 'in_season');
	assert.deepEqual(fixture.staticData, leagueState('in_season'));
});

test('changing League ID or switching from other event state establishes an isolated baseline', async () => {
	for (const [parameters, staticData] of [
		[
			{ event: 'leagueStatusChanged', leagueId: 'league-two' },
			leagueState('complete', 'league-one'),
		],
		[
			PARAMETERS,
			{
				configurationFingerprint: JSON.stringify(['draftPickMade', 'draft-one']),
				highestObservedPickNo: 99,
			},
		],
		[
			PARAMETERS,
			{
				configurationFingerprint: JSON.stringify(['transactionChanged', 'league-one', '7']),
				transactionStatusById: [{ transactionId: 'old', statusUpdated: 999 }],
			},
		],
	]) {
		const fixture = createPollContext({
			parameters,
			staticData,
			requestHandler: async () => league('in_season'),
		});
		assert.equal(await poll(fixture), null);
		assert.deepEqual(fixture.staticData, leagueState('in_season', parameters.leagueId));
	}
});

test('switching from league status state preserves Draft Pick Made baseline behavior', async () => {
	const fixture = createPollContext({
		parameters: { event: 'draftPickMade', draftId: 'draft-one' },
		staticData: leagueState('complete'),
		requestHandler: async () => [{ pick_no: 4 }],
	});
	assert.equal(await poll(fixture), null);
	assert.deepEqual(fixture.staticData, {
		configurationFingerprint: JSON.stringify(['draftPickMade', 'draft-one']),
		highestObservedPickNo: 4,
	});
});

test('switching from league status state preserves Transaction Changed baseline behavior', async () => {
	const fixture = createPollContext({
		parameters: { event: 'transactionChanged', leagueId: 'league-one', round: 7 },
		staticData: leagueState('complete'),
		requestHandler: async () => [
			{ transaction_id: 'historical', status_updated: 10, status: 'complete' },
		],
	});
	assert.equal(await poll(fixture), null);
	assert.deepEqual(fixture.staticData, {
		configurationFingerprint: JSON.stringify(['transactionChanged', 'league-one', '7']),
		transactionStatusById: [{ transactionId: 'historical', statusUpdated: 10 }],
	});
});

test('invalid compatible state is replaced only after a fully validated response', async () => {
	for (const highestObservedLeagueStatus of [undefined, '', 'paused', 2]) {
		const state = {
			configurationFingerprint: configurationFingerprint(),
			highestObservedLeagueStatus,
		};
		const fixture = createPollContext({
			staticData: state,
			requestHandler: async () => league('drafting'),
		});
		assert.equal(await poll(fixture), null);
		assert.deepEqual(state, leagueState('drafting'));
	}
});

test('HTTP, timeout, and connection failures retain state and emit no partial output', async () => {
	for (const [failure, message] of [
		[
			Object.assign(new Error('not found'), { response: { statusCode: 404 } }),
			'Sleeper resource was not found',
		],
		[
			Object.assign(new Error('limited'), {
				response: { statusCode: 429, headers: { 'retry-after': '12' } },
			}),
			'Sleeper rate limit exceeded',
		],
		[Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' }), 'Sleeper request timed out'],
		[Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }), 'Could not connect to Sleeper'],
	]) {
		const state = leagueState('drafting');
		const before = structuredClone(state);
		const fixture = createPollContext({
			staticData: state,
			requestHandler: async () => {
				throw failure;
			},
		});
		await assert.rejects(
			() => poll(fixture),
			(error) => {
				assert.ok(error instanceof NodeApiError);
				assert.equal(error.message, message);
				if (message === 'Sleeper rate limit exceeded') {
					assert.match(error.description, /Reduce request or polling frequency/);
					assert.equal(error.context.retryAfter, '12');
				}
				return true;
			},
		);
		assert.deepEqual(state, before);
	}
});
