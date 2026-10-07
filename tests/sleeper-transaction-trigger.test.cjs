const assert = require('node:assert/strict');
const test = require('node:test');

const { NodeApiError, NodeOperationError } = require('n8n-workflow');
const { SleeperTrigger } = require('../dist/nodes/SleeperTrigger/SleeperTrigger.node.js');
const {
	MAX_TRACKED_TRANSACTION_IDS,
} = require('../dist/nodes/SleeperTrigger/transactionChanged.js');

const API_ORIGIN = 'https://api.sleeper.app/v1';
const PARAMETERS = {
	event: 'transactionChanged',
	leagueId: 'league-one',
	round: 7,
};

function getNode() {
	return {
		name: 'Sleeper Trigger',
		type: 'n8n-nodes-sleeper.sleeperTrigger',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
}

function transaction(transactionId, statusUpdated, overrides = {}) {
	return {
		transaction_id: transactionId,
		type: 'trade',
		status: 'complete',
		status_updated: statusUpdated,
		adds: {},
		drops: {},
		roster_ids: ['1', '2'],
		...overrides,
	};
}

function configurationFingerprint(leagueId = 'league-one', round = '7') {
	return JSON.stringify(['transactionChanged', leagueId, round]);
}

function transactionState(entries, leagueId = 'league-one', round = '7') {
	return {
		configurationFingerprint: configurationFingerprint(leagueId, round),
		transactionStatusById: entries.map(([transactionId, statusUpdated]) => ({
			transactionId,
			statusUpdated,
		})),
	};
}

function createPollContext({
	parameters = PARAMETERS,
	mode = 'trigger',
	staticData = {},
	requestHandler = async () => [],
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

test('uses one encoded documented transaction request with trimmed opaque inputs', async () => {
	const leagueId = '90071992547409931234/opaque';
	const fixture = createPollContext({
		parameters: { event: 'transactionChanged', leagueId: `  ${leagueId}  `, round: ' 07 ' },
	});
	assert.equal(await poll(fixture), null);
	assert.deepEqual(fixture.requests, [
		{
			method: 'GET',
			url: `${API_ORIGIN}/league/90071992547409931234%2Fopaque/transactions/7`,
			json: true,
			timeout: 30_000,
		},
	]);
	assert.equal(fixture.staticData.configurationFingerprint, configurationFingerprint(leagueId));
	assert.equal(typeof JSON.parse(fixture.staticData.configurationFingerprint)[1], 'string');
});

test('rejects missing, empty, non-string, and control-character League IDs before transport', async () => {
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

test('requires Round or Week to be a positive safe integer', async () => {
	for (const round of [
		undefined,
		'',
		' ',
		0,
		-1,
		1.5,
		Number.POSITIVE_INFINITY,
		Number.MAX_SAFE_INTEGER + 1,
		'1.5',
		'nope',
	]) {
		const parameters = { ...PARAMETERS };
		if (round === undefined) delete parameters.round;
		else parameters.round = round;
		const fixture = createPollContext({ parameters });
		await assert.rejects(
			() => poll(fixture),
			(error) => error instanceof NodeOperationError,
		);
		assert.equal(fixture.requests.length, 0);
	}
});

test('manual mode returns the greatest timestamp with deterministic ID tie-breaking', async () => {
	const state = transactionState([['production', 99]]);
	const before = structuredClone(state);
	const fixture = createPollContext({
		mode: 'manual',
		staticData: state,
		requestHandler: async () => [
			transaction('z-last', 10),
			transaction('a-first', 20),
			transaction('z-tie-winner', 20),
		],
	});
	const result = await poll(fixture);
	assert.equal(result[0].length, 1);
	assert.equal(result[0][0].json.transaction_id, 'z-tie-winner');
	assert.equal(result[0][0].json.event, 'transaction.changed');
	assert.equal(result[0][0].pairedItem, undefined);
	assert.equal(fixture.staticDataReads, 0);
	assert.deepEqual(state, before);
});

test('manual preview is stable under reordering and returns null for an empty response', async () => {
	for (const response of [
		[transaction('b', 20), transaction('c', 10), transaction('a', 20)],
		[transaction('a', 20), transaction('b', 20), transaction('c', 10)],
	]) {
		const fixture = createPollContext({ mode: 'manual', requestHandler: async () => response });
		assert.equal((await poll(fixture))[0][0].json.transaction_id, 'b');
		assert.equal(fixture.staticDataReads, 0);
	}
	const emptyFixture = createPollContext({ mode: 'manual' });
	assert.equal(await poll(emptyFixture), null);
	assert.equal(emptyFixture.staticDataReads, 0);
});

test('first production poll stores the complete bounded baseline and emits nothing', async () => {
	const fixture = createPollContext({
		requestHandler: async () => [transaction('__proto__', 30), transaction('alpha', 10)],
	});
	assert.equal(await poll(fixture), null);
	assert.deepEqual(
		fixture.staticData,
		transactionState([
			['__proto__', 30],
			['alpha', 10],
		]),
	);
	assert.deepEqual(Object.keys(fixture.staticData), [
		'configurationFingerprint',
		'transactionStatusById',
	]);
});

test('an empty first response establishes an empty baseline', async () => {
	const fixture = createPollContext();
	assert.equal(await poll(fixture), null);
	assert.deepEqual(fixture.staticData, transactionState([]));
});

test('one new transaction emits once and an identical response emits nothing', async () => {
	let response = [transaction('one', 10)];
	const fixture = createPollContext({ requestHandler: async () => response });
	await poll(fixture);
	response = [transaction('one', 10), transaction('two', 20)];
	assert.deepEqual(
		(await poll(fixture))[0].map((item) => item.json.transaction_id),
		['two'],
	);
	assert.equal(await poll(fixture), null);
	assert.deepEqual(
		fixture.staticData,
		transactionState([
			['one', 10],
			['two', 20],
		]),
	);
});

test('new and updated transactions all emit in timestamp and ID order', async () => {
	const fixture = createPollContext({
		staticData: transactionState([
			['existing', 10],
			['stale', 50],
		]),
		requestHandler: async () => [
			transaction('z-new', 30),
			transaction('stale', 49),
			transaction('existing', 20),
			transaction('a-new', 30),
		],
	});
	const result = await poll(fixture);
	assert.deepEqual(
		result[0].map((item) => [item.json.transaction_id, item.json.status_updated]),
		[
			['existing', 20],
			['a-new', 30],
			['z-new', 30],
		],
	);
	assert.deepEqual(fixture.staticData.transactionStatusById, [
		{ transactionId: 'a-new', statusUpdated: 30 },
		{ transactionId: 'existing', statusUpdated: 20 },
		{ transactionId: 'stale', statusUpdated: 50 },
		{ transactionId: 'z-new', statusUpdated: 30 },
	]);
});

test('equal and lower timestamps, reordered responses, and timestamp gaps do not emit', async () => {
	const fixture = createPollContext({
		staticData: transactionState([
			['one', 100],
			['two', 500],
		]),
		requestHandler: async () => [transaction('two', 499), transaction('one', 100)],
	});
	const before = structuredClone(fixture.staticData);
	assert.equal(await poll(fixture), null);
	assert.deepEqual(fixture.staticData, before);
	fixture.context.helpers.httpRequest = async () => [
		transaction('one', 100),
		transaction('two', 500),
	];
	assert.equal(await poll(fixture), null);
	assert.deepEqual(fixture.staticData, before);
});

test('empty and truncated responses retain absent IDs and prevent replay', async () => {
	let response = [];
	const fixture = createPollContext({
		staticData: transactionState([
			['one', 100],
			['two', 200],
		]),
		requestHandler: async () => response,
	});
	const baseline = structuredClone(fixture.staticData);
	assert.equal(await poll(fixture), null);
	assert.deepEqual(fixture.staticData, baseline);
	response = [transaction('one', 100)];
	assert.equal(await poll(fixture), null);
	assert.deepEqual(fixture.staticData, baseline);
	response = [transaction('two', 199)];
	assert.equal(await poll(fixture), null);
	response = [transaction('two', 200)];
	assert.equal(await poll(fixture), null);
	response = [transaction('two', 201)];
	assert.equal((await poll(fixture))[0][0].json.transaction_id, 'two');
});

test('all items in one transaction poll share one observed_at timestamp', async () => {
	const OriginalDate = global.Date;
	const timestamp = Date.UTC(2026, 7, 5, 20, 0, 0);
	let constructions = 0;
	global.Date = class extends OriginalDate {
		constructor(...arguments_) {
			if (arguments_.length) return super(...arguments_);
			super(timestamp + constructions++ * 1_000);
		}
	};
	let result;
	try {
		const fixture = createPollContext({
			staticData: transactionState([]),
			requestHandler: async () => [transaction('two', 20), transaction('one', 10)],
		});
		result = await poll(fixture);
	} finally {
		global.Date = OriginalDate;
	}
	assert.equal(constructions, 1);
	assert.deepEqual(
		result[0].map((item) => item.json.observed_at),
		Array(2).fill(new OriginalDate(timestamp).toISOString()),
	);
});

test('League ID and Round or Week changes establish new baselines without historical replay', async () => {
	for (const parameters of [
		{ event: 'transactionChanged', leagueId: 'league-two', round: 7 },
		{ event: 'transactionChanged', leagueId: 'league-one', round: 8 },
	]) {
		const fixture = createPollContext({
			parameters,
			staticData: transactionState([['old', 999]]),
			requestHandler: async () => [transaction('historical', 10)],
		});
		assert.equal(await poll(fixture), null);
		assert.deepEqual(fixture.staticData.transactionStatusById, [
			{ transactionId: 'historical', statusUpdated: 10 },
		]);
	}
});

test('switching from Draft Pick Made state establishes an isolated transaction baseline', async () => {
	const fixture = createPollContext({
		staticData: {
			configurationFingerprint: JSON.stringify(['draftPickMade', 'draft-one']),
			highestObservedPickNo: 99,
		},
		requestHandler: async () => [transaction('historical', 10)],
	});
	assert.equal(await poll(fixture), null);
	assert.deepEqual(fixture.staticData, transactionState([['historical', 10]]));
});

test('switching from transaction state establishes an isolated Draft Pick Made baseline', async () => {
	const fixture = createPollContext({
		parameters: { event: 'draftPickMade', draftId: 'draft-one' },
		staticData: transactionState([['old', 999]]),
		requestHandler: async () => [{ pick_no: 4 }],
	});
	assert.equal(await poll(fixture), null);
	assert.deepEqual(fixture.staticData, {
		configurationFingerprint: JSON.stringify(['draftPickMade', 'draft-one']),
		highestObservedPickNo: 4,
	});
});

test('rejects malformed transaction responses completely without changing state', async () => {
	const malformedResponses = [
		{ transactions: [] },
		[null],
		[['nested']],
		[transaction('one', 1, { transaction_id: undefined })],
		[transaction('one', 1, { transaction_id: '' })],
		[transaction('one', 1, { status_updated: undefined })],
		[transaction('one', -1)],
		[transaction('one', 1.5)],
		[transaction('one', Number.POSITIVE_INFINITY)],
		[transaction('one', Number.MAX_SAFE_INTEGER + 1)],
		[transaction('duplicate', 1), transaction('duplicate', 2)],
	];
	for (const response of malformedResponses) {
		const state = transactionState([['saved', 100]]);
		const before = structuredClone(state);
		const fixture = createPollContext({ staticData: state, requestHandler: async () => response });
		await assert.rejects(
			() => poll(fixture),
			(error) =>
				error instanceof NodeOperationError &&
				error.message === 'Unexpected response from Sleeper for Transaction Created or Updated',
		);
		assert.deepEqual(state, before);
	}
});

test('HTTP 404 and 429 preserve native transport errors and transaction state', async () => {
	for (const [statusCode, message] of [
		[404, 'Sleeper resource was not found'],
		[429, 'Sleeper rate limit exceeded'],
	]) {
		const state = transactionState([['saved', 100]]);
		const before = structuredClone(state);
		const fixture = createPollContext({
			staticData: state,
			requestHandler: async () => {
				throw Object.assign(new Error('request failed'), {
					response: { statusCode, headers: { 'retry-after': '12' } },
				});
			},
		});
		await assert.rejects(
			() => poll(fixture),
			(error) => {
				assert.ok(error instanceof NodeApiError);
				assert.equal(error.message, message);
				if (statusCode === 429) {
					assert.match(error.description, /Reduce request or polling frequency/);
					assert.equal(error.context.retryAfter, '12');
				}
				return true;
			},
		);
		assert.deepEqual(state, before);
	}
});

test('timeout and connection failures preserve existing normalization and state', async () => {
	for (const [failure, message] of [
		[Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' }), 'Sleeper request timed out'],
		[Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }), 'Could not connect to Sleeper'],
	]) {
		const state = transactionState([['saved', 100]]);
		const before = structuredClone(state);
		const fixture = createPollContext({
			staticData: state,
			requestHandler: async () => {
				throw failure;
			},
		});
		await assert.rejects(
			() => poll(fixture),
			(error) => error instanceof NodeApiError && error.message === message,
		);
		assert.deepEqual(state, before);
	}
});

test('the maximum tracked-ID count succeeds and serializes without silent eviction', async () => {
	assert.equal(MAX_TRACKED_TRANSACTION_IDS, 1_000);
	const response = Array.from({ length: MAX_TRACKED_TRANSACTION_IDS }, (_, index) =>
		transaction(`id-${String(index).padStart(4, '0')}`, index),
	);
	const fixture = createPollContext({ requestHandler: async () => response.reverse() });
	assert.equal(await poll(fixture), null);
	assert.equal(fixture.staticData.transactionStatusById.length, MAX_TRACKED_TRANSACTION_IDS);
	assert.equal(
		new Set(fixture.staticData.transactionStatusById.map((entry) => entry.transactionId)).size,
		MAX_TRACKED_TRANSACTION_IDS,
	);
});

test('a response over the bound fails before baseline mutation', async () => {
	const state = { untouched: true };
	const before = structuredClone(state);
	const fixture = createPollContext({
		staticData: state,
		requestHandler: async () =>
			Array.from({ length: MAX_TRACKED_TRANSACTION_IDS + 1 }, (_, index) =>
				transaction(`id-${index}`, index),
			),
	});
	await assert.rejects(
		() => poll(fixture),
		(error) => error instanceof NodeOperationError,
	);
	assert.deepEqual(state, before);
});

test('adding an ID beyond the combined bound fails without mutation or partial output', async () => {
	const entries = Array.from({ length: MAX_TRACKED_TRANSACTION_IDS }, (_, index) => [
		`id-${String(index).padStart(4, '0')}`,
		index,
	]);
	const state = transactionState(entries);
	const before = structuredClone(state);
	const fixture = createPollContext({
		staticData: state,
		requestHandler: async () => [transaction('new-id', 9_999)],
	});
	await assert.rejects(
		() => poll(fixture),
		(error) => error instanceof NodeOperationError,
	);
	assert.deepEqual(state, before);
});

test('output preserves every raw field and string ID while adding only trigger metadata', async () => {
	const raw = transaction('90071992547409931234', 1_785_960_000_000, {
		creator: '90071992547409935555',
		waiver_id: '90071992547409936666',
		draft_id: '90071992547409937777',
		adds: { '90071992547409938888': '01' },
		drops: null,
		roster_ids: ['01', '02'],
		metadata: { nested: { nullable: null } },
		custom_field: 'preserved',
	});
	const fixture = createPollContext({
		staticData: transactionState([]),
		requestHandler: async () => [raw],
	});
	const output = (await poll(fixture))[0][0];
	for (const [key, value] of Object.entries(raw)) assert.deepEqual(output.json[key], value);
	assert.equal(output.json.event, 'transaction.changed');
	assert.match(output.json.observed_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
	assert.equal(typeof output.json.transaction_id, 'string');
	assert.equal(typeof output.json.creator, 'string');
	assert.equal(output.pairedItem, undefined);
	assert.equal(Object.hasOwn(output.json, 'data'), false);
	assert.equal(Object.hasOwn(output.json, 'player_name'), false);
	assert.equal(fixture.requests.length, 1);
});
