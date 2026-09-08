const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { NodeApiError, NodeOperationError, NodeConnectionTypes } = require('n8n-workflow');
const packageMetadata = require('../package.json');
const actionCodex = require('../nodes/Sleeper/Sleeper.node.json');
const triggerCodex = require('../nodes/SleeperTrigger/SleeperTrigger.node.json');
const { Sleeper } = require('../dist/nodes/Sleeper/Sleeper.node.js');
const { SleeperTrigger } = require('../dist/nodes/SleeperTrigger/SleeperTrigger.node.js');

const projectRoot = path.resolve(__dirname, '..');
const API_ORIGIN = 'https://api.sleeper.app/v1';

function getNode() {
	return {
		name: 'Sleeper Trigger',
		type: 'n8n-nodes-sleeper.sleeperTrigger',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
}

function pick(pickNumber, overrides = {}) {
	return {
		player_id: `player-${pickNumber}`,
		picked_by: `user-${pickNumber}`,
		roster_id: String(pickNumber),
		round: 1,
		draft_slot: pickNumber,
		pick_no: pickNumber,
		metadata: {},
		is_keeper: null,
		draft_id: 'draft-one',
		...overrides,
	};
}

function createPollContext({
	parameters = { event: 'draftPickMade', draftId: 'draft-one' },
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

test('describes a credential-free polling trigger with the exact identity', () => {
	const { description } = new SleeperTrigger();
	assert.equal(description.displayName, 'Sleeper Trigger');
	assert.equal(description.name, 'sleeperTrigger');
	assert.deepEqual(description.group, ['trigger']);
	assert.equal(description.polling, true);
	assert.deepEqual(description.inputs, []);
	assert.deepEqual(description.outputs, [NodeConnectionTypes.Main]);
	assert.equal(description.credentials, undefined);
	assert.equal(description.version, 1);
	assert.deepEqual(description.icon, { light: 'file:sleeper.png', dark: 'file:sleeper.dark.png' });
});

test('exposes all four trigger events with event-specific required parameters', () => {
	const { description } = new SleeperTrigger();
	assert.deepEqual(
		description.properties.map((property) => property.name),
		['event', 'draftId', 'leagueId', 'round'],
	);
	const event = description.properties[0];
	assert.equal(event.default, 'draftPickMade');
	assert.equal(event.required, true);
	assert.deepEqual(
		event.options.map((option) => option.value),
		['draftPickMade', 'transactionChanged', 'leagueStatusChanged', 'nflWeekChanged'],
	);
	assert.equal(event.options[1].name, 'Transaction Created or Updated');
	assert.equal(event.options[2].name, 'League Status Changed');
	assert.equal(event.options[3].name, 'NFL Week Changed');
	const draftId = description.properties[1];
	assert.equal(draftId.type, 'string');
	assert.equal(draftId.required, true);
	assert.equal(draftId.default, '');
	assert.deepEqual(draftId.displayOptions.show.event, ['draftPickMade']);
	const leagueId = description.properties[2];
	assert.deepEqual(leagueId.displayOptions.show.event, [
		'transactionChanged',
		'leagueStatusChanged',
	]);
	const round = description.properties[3];
	assert.deepEqual(round.displayOptions.show.event, ['transactionChanged']);
});

test('trims Draft ID for the documented encoded GET without numeric coercion', async () => {
	const opaqueId = '90071992547409931234/opaque';
	const fixture = createPollContext({
		parameters: { event: 'draftPickMade', draftId: `  ${opaqueId}  ` },
		requestHandler: async () => [],
	});
	assert.equal(await poll(fixture), null);
	assert.equal(fixture.requests.length, 1);
	assert.deepEqual(fixture.requests[0], {
		method: 'GET',
		url: `${API_ORIGIN}/draft/90071992547409931234%2Fopaque/picks`,
		json: true,
		timeout: 30_000,
	});
	assert.equal(
		fixture.staticData.configurationFingerprint,
		JSON.stringify(['draftPickMade', opaqueId]),
	);
});

test('rejects empty, non-string, and unsupported trigger parameters before transport', async () => {
	for (const parameters of [
		{ event: 'draftPickMade', draftId: '' },
		{ event: 'draftPickMade', draftId: '   ' },
		{ event: 'draftPickMade', draftId: 9007199254740992 },
		{ event: 'futureEvent', draftId: 'draft-one' },
	]) {
		const fixture = createPollContext({ parameters });
		await assert.rejects(
			() => poll(fixture),
			(error) => error instanceof NodeOperationError,
		);
		assert.equal(fixture.requests.length, 0);
	}
});

test('manual mode previews only the highest pick from reordered results without state reads', async () => {
	const state = { configurationFingerprint: 'production', highestObservedPickNo: 99 };
	const before = structuredClone(state);
	const fixture = createPollContext({
		mode: 'manual',
		staticData: state,
		requestHandler: async () => [pick(2), pick(7), pick(3)],
	});
	const result = await poll(fixture);
	assert.equal(result[0].length, 1);
	assert.equal(result[0][0].json.pick_no, 7);
	assert.equal(result[0][0].pairedItem, undefined);
	assert.deepEqual(state, before);
	assert.equal(fixture.staticDataReads, 0);
});

test('manual mode returns null for a draft with no picks and does not establish a baseline', async () => {
	const fixture = createPollContext({ mode: 'manual', requestHandler: async () => [] });
	assert.equal(await poll(fixture), null);
	assert.deepEqual(fixture.staticData, {});
	assert.equal(fixture.staticDataReads, 0);
});

test('the first production poll stores only the current bounded baseline and emits nothing', async () => {
	const fixture = createPollContext({ requestHandler: async () => [pick(4), pick(1), pick(2)] });
	assert.equal(await poll(fixture), null);
	assert.deepEqual(fixture.staticData, {
		configurationFingerprint: JSON.stringify(['draftPickMade', 'draft-one']),
		highestObservedPickNo: 4,
	});
});

test('the first production poll establishes a zero baseline for an empty draft', async () => {
	const fixture = createPollContext();
	assert.equal(await poll(fixture), null);
	assert.equal(fixture.staticData.highestObservedPickNo, 0);
	assert.equal(Object.keys(fixture.staticData).length, 2);
});

test('one new pick emits once and an identical later poll emits nothing', async () => {
	let response = [pick(1)];
	const fixture = createPollContext({ requestHandler: async () => response });
	assert.equal(await poll(fixture), null);
	response = [pick(1), pick(2)];
	const emitted = await poll(fixture);
	assert.deepEqual(
		emitted[0].map((item) => item.json.pick_no),
		[2],
	);
	assert.equal(await poll(fixture), null);
	assert.equal(fixture.staticData.highestObservedPickNo, 2);
});

test('several new picks emit ascending despite API reordering, gaps, and older records', async () => {
	let response = [pick(3), pick(1)];
	const fixture = createPollContext({ requestHandler: async () => response });
	await poll(fixture);
	response = [pick(9), pick(2), pick(5), pick(1), pick(3), pick(7)];
	const result = await poll(fixture);
	assert.deepEqual(
		result[0].map((item) => item.json.pick_no),
		[5, 7, 9],
	);
	assert.equal(fixture.staticData.highestObservedPickNo, 9);
	response = [...response].reverse();
	assert.equal(await poll(fixture), null);
});

test('changing Draft ID replaces the fingerprint, re-baselines, and does not replay history', async () => {
	const fixture = createPollContext({ requestHandler: async () => [pick(10)] });
	await poll(fixture);
	fixture.context.getNodeParameter = (name, fallback) =>
		({ event: 'draftPickMade', draftId: 'draft-two' })[name] ?? fallback;
	fixture.context.helpers.httpRequest = async (options) => {
		fixture.requests.push(options);
		return [pick(1, { draft_id: 'draft-two' }), pick(2, { draft_id: 'draft-two' })];
	};
	assert.equal(await poll(fixture), null);
	assert.deepEqual(fixture.staticData, {
		configurationFingerprint: JSON.stringify(['draftPickMade', 'draft-two']),
		highestObservedPickNo: 2,
	});
});

test('a lower current maximum emits nothing and retains the saved watermark', async () => {
	let response = [pick(42)];
	const fixture = createPollContext({ requestHandler: async () => response });
	await poll(fixture);
	response = [pick(40)];
	assert.equal(await poll(fixture), null);
	assert.equal(fixture.staticData.highestObservedPickNo, 42);
});

test('an empty response after a nonzero baseline retains the saved watermark', async () => {
	let response = [pick(12)];
	const fixture = createPollContext({ requestHandler: async () => response });
	await poll(fixture);
	response = [];
	assert.equal(await poll(fixture), null);
	assert.equal(fixture.staticData.highestObservedPickNo, 12);
});

test('a temporary truncated response cannot replay picks and later higher picks still emit', async () => {
	let response = [pick(40), pick(41), pick(42)];
	const fixture = createPollContext({ requestHandler: async () => response });
	await poll(fixture);

	response = [pick(40)];
	assert.equal(await poll(fixture), null);
	assert.equal(fixture.staticData.highestObservedPickNo, 42);

	response = [pick(40), pick(41), pick(42)];
	assert.equal(await poll(fixture), null);
	assert.equal(fixture.staticData.highestObservedPickNo, 42);

	response = [pick(45), pick(40), pick(43), pick(42), pick(41)];
	assert.deepEqual(
		(await poll(fixture))[0].map((item) => item.json.pick_no),
		[43, 45],
	);
	assert.equal(fixture.staticData.highestObservedPickNo, 45);
});

test('all picks emitted by one poll share one deterministically calculated observed_at', async () => {
	const OriginalDate = global.Date;
	const firstTimestamp = Date.UTC(2026, 7, 5, 17, 0, 0);
	let dateConstructions = 0;
	global.Date = class extends OriginalDate {
		constructor(...arguments_) {
			if (arguments_.length > 0) {
				super(...arguments_);
				return;
			}

			super(firstTimestamp + dateConstructions * 1_000);
			dateConstructions++;
		}
	};

	let result;
	try {
		const fixture = createPollContext({
			staticData: {
				configurationFingerprint: JSON.stringify(['draftPickMade', 'draft-one']),
				highestObservedPickNo: 1,
			},
			requestHandler: async () => [pick(4), pick(2), pick(3)],
		});
		result = await poll(fixture);
	} finally {
		global.Date = OriginalDate;
	}

	assert.equal(dateConstructions, 1);
	assert.deepEqual(
		result[0].map((item) => item.json.observed_at),
		Array(3).fill(new OriginalDate(firstTimestamp).toISOString()),
	);
});

test('rejects malformed endpoint and pick shapes without advancing state', async () => {
	for (const response of [
		{ picks: [] },
		[null],
		[['nested']],
		[pick(1, { pick_no: undefined })],
		[pick(1, { pick_no: 0 })],
		[pick(1, { pick_no: -1 })],
		[pick(1, { pick_no: 1.5 })],
		[pick(1, { pick_no: Number.MAX_SAFE_INTEGER + 1 })],
	]) {
		const state = {
			configurationFingerprint: JSON.stringify(['draftPickMade', 'draft-one']),
			highestObservedPickNo: 5,
		};
		const before = structuredClone(state);
		const fixture = createPollContext({ staticData: state, requestHandler: async () => response });
		await assert.rejects(
			() => poll(fixture),
			(error) =>
				error instanceof NodeOperationError &&
				error.message === 'Unexpected response from Sleeper for Draft Pick Made',
		);
		assert.deepEqual(state, before);
	}
});

test('HTTP 404 remains native and 429 preserves retry guidance without state changes', async () => {
	for (const [statusCode, expectedMessage, expectedDescription] of [
		[404, 'Sleeper resource was not found', /could not find/i],
		[429, 'Sleeper rate limit exceeded', /Reduce request or polling frequency/i],
	]) {
		const state = {
			configurationFingerprint: JSON.stringify(['draftPickMade', 'draft-one']),
			highestObservedPickNo: 5,
		};
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
				assert.equal(error.message, expectedMessage);
				assert.match(error.description, expectedDescription);
				assert.equal(error.context.itemIndex, 0);
				if (statusCode === 429) assert.equal(error.context.retryAfter, '12');
				return true;
			},
		);
		assert.deepEqual(state, before);
	}
});

test('timeout and connection errors keep existing normalization and do not advance state', async () => {
	for (const [error, expectedMessage] of [
		[
			Object.assign(new Error('socket timed out'), { code: 'ETIMEDOUT' }),
			'Sleeper request timed out',
		],
		[
			Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' }),
			'Could not connect to Sleeper',
		],
	]) {
		const state = {
			configurationFingerprint: JSON.stringify(['draftPickMade', 'draft-one']),
			highestObservedPickNo: 2,
		};
		const before = structuredClone(state);
		const fixture = createPollContext({
			staticData: state,
			requestHandler: async () => {
				throw error;
			},
		});
		await assert.rejects(
			() => poll(fixture),
			(candidate) => candidate instanceof NodeApiError && candidate.message === expectedMessage,
		);
		assert.deepEqual(state, before);
	}
});

test('output preserves raw fields and string IDs while adding only explicit trigger metadata', async () => {
	const rawPick = pick(2, {
		player_id: '90071992547409931234',
		picked_by: '90071992547409935555',
		roster_id: '02',
		draft_id: '90071992547409939999',
		metadata: { nested: { nullable: null } },
		custom_field: 'preserved',
	});
	const state = {
		configurationFingerprint: JSON.stringify(['draftPickMade', 'draft-one']),
		highestObservedPickNo: 1,
	};
	const fixture = createPollContext({ staticData: state, requestHandler: async () => [rawPick] });
	const result = await poll(fixture);
	const output = result[0][0];
	for (const [key, value] of Object.entries(rawPick)) assert.deepEqual(output.json[key], value);
	assert.equal(output.json.event, 'draft.pick_made');
	assert.match(output.json.observed_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
	assert.deepEqual(
		['player_id', 'picked_by', 'roster_id', 'draft_id'].map((key) => typeof output.json[key]),
		['string', 'string', 'string', 'string'],
	);
	assert.equal(output.pairedItem, undefined);
	assert.equal(fixture.requests.length, 1);
	assert.equal(fixture.requests[0].url, `${API_ORIGIN}/draft/draft-one/picks`);
	assert.equal(Object.hasOwn(output.json, 'data'), false);
	assert.equal(Object.hasOwn(output.json, 'player_name'), false);
});

test('keeps all 18 action operations and their values unchanged', () => {
	const { description } = new Sleeper();
	const operationValues = description.properties
		.filter((property) => property.name === 'operation')
		.flatMap((property) => property.options.map((option) => option.value));
	assert.equal(operationValues.length, 18);
	assert.deepEqual(
		description.properties
			.find((property) => property.name === 'resource')
			.options.map((option) => option.value),
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
});

test('registers exact source and compiled codex metadata for both nodes', () => {
	const compiledAction = require('../dist/nodes/Sleeper/Sleeper.node.json');
	const compiledTrigger = require('../dist/nodes/SleeperTrigger/SleeperTrigger.node.json');
	assert.deepEqual(packageMetadata.n8n.nodes, [
		'dist/nodes/Sleeper/Sleeper.node.js',
		'dist/nodes/SleeperTrigger/SleeperTrigger.node.js',
	]);
	for (const [metadata, expectedId] of [
		[actionCodex, 'n8n-nodes-sleeper.sleeper'],
		[compiledAction, 'n8n-nodes-sleeper.sleeper'],
		[triggerCodex, 'n8n-nodes-sleeper.sleeperTrigger'],
		[compiledTrigger, 'n8n-nodes-sleeper.sleeperTrigger'],
	]) {
		assert.equal(metadata.node, expectedId);
		assert.deepEqual(metadata.categories, ['Development']);
		assert.equal(metadata.categories.includes('Developer Tools'), false);
	}
	assert.equal(packageMetadata.version, '0.2.0');
	assert.deepEqual(packageMetadata.dependencies ?? {}, {});
	assert.deepEqual(packageMetadata.n8n.credentials, []);
	for (const icon of ['sleeper.png', 'sleeper.dark.png']) {
		const actionIcon = fs.readFileSync(path.join(projectRoot, 'nodes', 'Sleeper', icon));
		const triggerIcon = fs.readFileSync(path.join(projectRoot, 'nodes', 'SleeperTrigger', icon));
		assert.deepEqual(triggerIcon, actionIcon);
	}
});

test('packed artifact contains both nodes and icons without development or sensitive files', (t) => {
	const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'sleeper-trigger-pack-'));
	t.after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));
	const packResult = JSON.parse(
		execFileSync(
			'npm',
			['pack', '--json', '--ignore-scripts', '--pack-destination', temporaryDirectory],
			{
				cwd: projectRoot,
				encoding: 'utf8',
				env: { ...process.env, npm_config_cache: path.join(temporaryDirectory, 'npm-cache') },
			},
		),
	);
	const files = packResult[0].files.map((entry) => entry.path).sort();
	for (const expected of [
		'dist/nodes/Sleeper/Sleeper.node.js',
		'dist/nodes/Sleeper/Sleeper.node.json',
		'dist/nodes/Sleeper/sleeper.png',
		'dist/nodes/Sleeper/sleeper.dark.png',
		'dist/nodes/SleeperTrigger/SleeperTrigger.node.js',
		'dist/nodes/SleeperTrigger/SleeperTrigger.node.json',
		'dist/nodes/SleeperTrigger/leagueStatusChanged.js',
		'dist/nodes/SleeperTrigger/nflWeekChanged.js',
		'dist/nodes/SleeperTrigger/transactionChanged.js',
		'dist/nodes/SleeperTrigger/sleeper.png',
		'dist/nodes/SleeperTrigger/sleeper.dark.png',
	]) {
		assert.ok(files.includes(expected), `missing ${expected}`);
	}
	assert.ok(
		!files.some((file) =>
			/(?:^|\/)(?:test|tests|fixtures|examples|credentials)(?:\/|$)/i.test(file),
		),
	);
	assert.ok(
		!files.some((file) => /(?:\.env|secret|credential|local.state|test[-_]?id)/i.test(file)),
	);
	assert.ok(!files.some((file) => file.endsWith('.ts') || file.endsWith('.map')));
});
