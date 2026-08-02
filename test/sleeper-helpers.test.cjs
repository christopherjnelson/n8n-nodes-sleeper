const assert = require('node:assert/strict');
const test = require('node:test');

const { NodeApiError, NodeOperationError } = require('n8n-workflow');
const {
	SLEEPER_API_BASE_URL,
	SLEEPER_API_TIMEOUT_MS,
	buildQueryParameters,
	buildSleeperUrl,
	sleeperApiRequest,
} = require('../dist/nodes/Sleeper/transport/sleeperApiRequest.js');
const {
	getRequiredTrimmedString,
	getSeason,
	getSleeperId,
	getSport,
} = require('../dist/nodes/Sleeper/utils/validation.js');
const {
	ensureExecutionError,
	toErrorExecutionItem,
	toExecutionItems,
} = require('../dist/nodes/Sleeper/utils/output.js');

function getNode() {
	return {
		name: 'Sleeper',
		type: 'n8n-nodes-sleeper.sleeper',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
}

function createParameterContext(parameters) {
	return {
		getNode,
		getNodeParameter(name, _itemIndex, fallback) {
			return Object.hasOwn(parameters, name) ? parameters[name] : fallback;
		},
	};
}

test('builds transport requests against the fixed Sleeper origin', async () => {
	const requests = [];
	const context = {
		getNode,
		helpers: {
			async httpRequest(options) {
				requests.push(options);
				return { ok: true };
			},
		},
	};

	const response = await sleeperApiRequest.call(context, {
		pathSegments: ['user', '90071992547409931234/with space', 'leagues', 'nfl', '2026'],
		query: { active: true, limit: 10, omitted: undefined },
		itemIndex: 0,
		operation: 'Test request',
	});

	assert.deepEqual(response, { ok: true });
	assert.equal(SLEEPER_API_BASE_URL, 'https://api.sleeper.app/v1');
	assert.equal(
		requests[0].url,
		'https://api.sleeper.app/v1/user/90071992547409931234%2Fwith%20space/leagues/nfl/2026',
	);
	assert.equal(requests[0].method, 'GET');
	assert.equal(requests[0].json, true);
	assert.equal(requests[0].timeout, SLEEPER_API_TIMEOUT_MS);
	assert.ok(Number.isFinite(requests[0].timeout));
	assert.deepEqual(requests[0].qs, { active: true, limit: 10 });
	assert.deepEqual(Object.keys(requests[0]).sort(), ['json', 'method', 'qs', 'timeout', 'url']);
});

test('encodes every path segment and omits empty query objects', () => {
	assert.equal(
		buildSleeperUrl(['league', 'a/b', '?#']),
		`${SLEEPER_API_BASE_URL}/league/a%2Fb/%3F%23`,
	);
	assert.equal(buildQueryParameters(undefined), undefined);
	assert.equal(buildQueryParameters({ missing: undefined }), undefined);
});

test('trims required strings and preserves large Sleeper IDs exactly', () => {
	const context = createParameterContext({
		usernameOrUserId: '  sleeper-user  ',
		leagueId: '  90071992547409931234  ',
	});

	assert.equal(
		getRequiredTrimmedString(context, 'usernameOrUserId', 0, 'Username or User ID'),
		'sleeper-user',
	);
	assert.equal(getSleeperId(context, 'leagueId', 0, 'League ID'), '90071992547409931234');
});

test('rejects empty and non-string required values with item-aware native errors', () => {
	for (const value of ['', '   ', 9007199254740992]) {
		const context = createParameterContext({ leagueId: value });
		assert.throws(
			() => getSleeperId(context, 'leagueId', 3, 'League ID'),
			(error) => error instanceof NodeOperationError && error.context.itemIndex === 3,
		);
	}
});

test('accepts four-digit seasons and rejects malformed seasons', () => {
	assert.equal(getSeason(createParameterContext({ season: ' 2026 ' }), 'season', 0), '2026');
	assert.equal(getSeason(createParameterContext({ season: 2017 }), 'season', 0), '2017');

	for (const season of ['26', '20260', '20a6', '', null]) {
		assert.throws(
			() => getSeason(createParameterContext({ season }), 'season', 2),
			(error) =>
				error instanceof NodeOperationError &&
				error.message.includes('four-digit') &&
				error.context.itemIndex === 2,
		);
	}
});

test('maps only the controlled NFL sport value', () => {
	assert.equal(getSport(createParameterContext({ sport: 'nfl' }), 'sport', 0), 'nfl');
	assert.throws(
		() => getSport(createParameterContext({ sport: 'nba' }), 'sport', 1),
		(error) => error instanceof NodeOperationError && error.message === 'Unsupported sport',
	);
});

test('converts object and array responses without changing JSON fields', () => {
	const nested = {
		league_id: '90071992547409931234',
		avatar: null,
		settings: { reserve_slots: 2, divisions: ['East', 'West'] },
	};

	assert.deepEqual(toExecutionItems(getNode(), nested, 'object', 4, 'League: Get'), [
		{ json: nested, pairedItem: { item: 4 } },
	]);
	assert.deepEqual(
		toExecutionItems(getNode(), [nested, { league_id: '2' }], 'array', 5, 'Get Many'),
		[
			{ json: nested, pairedItem: { item: 5 } },
			{ json: { league_id: '2' }, pairedItem: { item: 5 } },
		],
	);
	assert.deepEqual(toExecutionItems(getNode(), [], 'array', 0, 'Get Many'), []);
});

test('rejects null, primitives, and invalid array entries deliberately', () => {
	for (const response of [null, 'not-json-object', 42]) {
		assert.throws(
			() => toExecutionItems(getNode(), response, 'object', 1, 'User: Get'),
			(error) => error instanceof NodeOperationError && error.context.itemIndex === 1,
		);
	}

	assert.throws(
		() => toExecutionItems(getNode(), [{ ok: true }, null], 'array', 2, 'Get Many'),
		(error) => error instanceof NodeOperationError && error.context.itemIndex === 2,
	);
});

test('creates concise paired continuation items from native errors', () => {
	const nativeError = ensureExecutionError(getNode(), new Error('socket closed'), 7);
	assert.ok(nativeError instanceof NodeOperationError);
	assert.deepEqual(toErrorExecutionItem(nativeError, 7), {
		json: { error: { message: 'socket closed' } },
		pairedItem: { item: 7 },
	});
});

for (const scenario of [
	{
		statusCode: 400,
		expectedMessage: 'Sleeper rejected the request',
	},
	{
		statusCode: 404,
		expectedMessage: 'Sleeper resource was not found',
	},
	{
		statusCode: 429,
		expectedMessage: 'Sleeper rate limit exceeded',
		retryAfter: '45',
	},
	{
		statusCode: 500,
		expectedMessage: 'Sleeper service failure',
	},
	{
		statusCode: 503,
		expectedMessage: 'Sleeper service failure',
	},
]) {
	test(`normalizes HTTP ${scenario.statusCode} with safe API context`, async () => {
		const requestError = Object.assign(new Error('request failed'), {
			response: {
				statusCode: scenario.statusCode,
				headers: scenario.retryAfter ? { 'retry-after': scenario.retryAfter } : {},
				body: { message: 'safe Sleeper detail' },
			},
		});
		const context = {
			getNode,
			helpers: {
				async httpRequest() {
					throw requestError;
				},
			},
		};

		await assert.rejects(
			() =>
				sleeperApiRequest.call(context, {
					pathSegments: ['league', '123'],
					itemIndex: 6,
					operation: 'League: Get',
				}),
			(error) => {
				assert.ok(error instanceof NodeApiError);
				assert.equal(error.message, scenario.expectedMessage);
				assert.equal(error.httpCode, String(scenario.statusCode));
				assert.equal(error.context.itemIndex, 6);
				if (scenario.retryAfter) {
					assert.match(error.description, /Retry after 45/);
					assert.match(error.description, /1,000 calls per minute/);
					assert.equal(error.context.retryAfter, '45');
				}
				return true;
			},
		);
	});
}

test('distinguishes timeout failures from network failures', async () => {
	for (const scenario of [
		{
			error: Object.assign(new Error('socket timed out'), { code: 'ETIMEDOUT' }),
			message: 'timed out',
		},
		{
			error: Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' }),
			message: 'connect',
		},
	]) {
		const context = {
			getNode,
			helpers: {
				async httpRequest() {
					throw scenario.error;
				},
			},
		};

		await assert.rejects(
			() =>
				sleeperApiRequest.call(context, {
					pathSegments: ['state', 'nfl'],
					itemIndex: 0,
					operation: 'Sport: Get State',
				}),
			(error) =>
				error instanceof NodeApiError && error.message.toLowerCase().includes(scenario.message),
		);
	}
});
