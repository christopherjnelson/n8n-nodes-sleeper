import {
	NodeHelpers,
	NodeOperationError,
	type IExecuteSingleFunctions,
	type INodeParameters,
	type INodeProperties,
	type INodePropertyOptions,
} from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { Sleeper } from '../nodes/Sleeper/Sleeper.node';
import { formatPlayerMap } from '../nodes/Sleeper/descriptions/response';
import { validateSleeperRequest } from '../nodes/Sleeper/descriptions/routing';

type Params = Record<string, unknown>;

function context(
	parameters: Params,
	itemIndex = 0,
	throwOn: string[] = [],
): IExecuteSingleFunctions {
	return {
		getNode: () => ({
			name: 'Sleeper',
			type: 'test.sleeper',
			typeVersion: 1,
			position: [0, 0],
			parameters,
		}),
		getNodeParameter: (name: string, fallback?: unknown) => {
			if (throwOn.includes(name)) throw new Error(`Unexpected evaluation of ${name}`);
			return Object.prototype.hasOwnProperty.call(parameters, name) ? parameters[name] : fallback;
		},
		getItemIndex: () => itemIndex,
	} as unknown as IExecuteSingleFunctions;
}

function properties(): INodeProperties[] {
	return new Sleeper().description.properties;
}

const playerMap = {
	'9007199254740995': {
		full_name: 'Zoe Zee',
		team: 'SEA',
		position: 'QB',
		nested: { active: true },
	},
	'opaque-A': { full_name: 'Ada Alpha', team: ' sea ', position: 'WR', extra: 'drop me' },
	'player-null': { full_name: 'Mira Missing', team: null, position: 'QB' },
	'player-empty': { full_name: 'Nia None', team: '', position: 'RB' },
	'player-other': { full_name: 'Bea Beta', team: 'NYJ', position: 'QB' },
};

async function format(
	parameters: Params,
	map: unknown = playerMap,
	throwOn: string[] = [],
	itemIndex = 0,
) {
	return formatPlayerMap.call(
		context(parameters, itemIndex, throwOn),
		[{ json: map as never }],
		{} as never,
	);
}

describe('Player → Get Many output controls', () => {
	it('declares Return All and conditional Limit defaults plus the local options collection', () => {
		const props = properties();
		const returnAll = props.find((property) => property.name === 'returnAll');
		const limit = props.find((property) => property.name === 'limit');
		const options = props.find((property) => property.name === 'playerOptions');

		expect(returnAll).toMatchObject({ type: 'boolean', default: true });
		expect(limit).toMatchObject({ type: 'number', default: 50 });
		expect(limit?.displayOptions?.show?.returnAll).toEqual([false]);
		expect(options).toMatchObject({ type: 'collection', default: {} });
		expect(options?.options?.map((option) => option.name).sort()).toEqual(
			['team', 'hasTeam', 'playerIds', 'outputFields'].sort(),
		);
		const sortBy = props.find((property) => property.name === 'sortBy');
		const sortDirection = props.find((property) => property.name === 'sortDirection');
		expect(sortBy?.type).toBe('options');
		expect(sortBy?.default).toBe('');
		expect(sortDirection?.default).toBe('asc');
		expect(sortDirection?.displayOptions?.show?.sortBy).toEqual([
			'full_name',
			'team',
			'position',
			'player_id',
		]);
		const sports = props.filter(
			(property) =>
				property.name === 'sport' && property.displayOptions?.show?.resource?.includes('player'),
		);
		expect(
			(
				sports.find((property) => property.displayOptions?.show?.operation?.includes('getMany'))
					?.options as INodePropertyOptions[]
			).map((option) => option.value),
		).toEqual(['nfl', 'nba', 'nhl']);
		expect(
			(
				sports.find((property) => property.displayOptions?.show?.operation?.includes('getTrending'))
					?.options as INodePropertyOptions[]
			).map((option) => option.value),
		).toEqual(['nfl', 'nba']);
	});

	it('applies exact normalized team filtering, ID selection, field projection, and player ID fallback', async () => {
		const result = await format({
			resource: 'player',
			operation: 'getMany',
			outputMode: 'splitItems',
			returnAll: true,
			playerOptions: {
				team: ' SEA ',
				hasTeam: true,
				playerIds: 'opaque-A, 9007199254740995, opaque-A, unknown',
				outputFields: 'full_name, position, full_name',
			},
		});
		expect(result).toEqual([
			{
				json: { player_id: '9007199254740995', full_name: 'Zoe Zee', position: 'QB' },
				pairedItem: { item: 0 },
			},
			{
				json: { player_id: 'opaque-A', full_name: 'Ada Alpha', position: 'WR' },
				pairedItem: { item: 0 },
			},
		]);
	});

	it('treats Has Team as a nonempty-team filter and keeps null and empty teams out', async () => {
		const result = await format({
			resource: 'player',
			operation: 'getMany',
			outputMode: 'splitItems',
			returnAll: true,
			playerOptions: { hasTeam: true },
		});
		expect(result.map((item) => item.json.player_id)).toEqual([
			'9007199254740995',
			'opaque-A',
			'player-other',
		]);
	});

	it('does not filter players when Has Team is false and leaves blank field selection unprojected', async () => {
		const result = await format({
			resource: 'player',
			operation: 'getMany',
			outputMode: 'splitItems',
			returnAll: true,
			playerOptions: { hasTeam: false, outputFields: '' },
		});
		expect(result).toHaveLength(Object.keys(playerMap).length);
		expect(result.find((item) => item.json.player_id === 'player-null')?.json).toMatchObject({
			full_name: 'Mira Missing',
			team: null,
			position: 'QB',
		});
	});

	it('filters, sorts, limits, then projects without mutating the source map', async () => {
		const map = Object.freeze({
			z: Object.freeze({ full_name: 'Zoe', team: 'SEA', position: 'QB', extra: 'keep out' }),
			a: Object.freeze({ full_name: 'Ada', team: ' sea ', position: 'WR', extra: 'keep out' }),
			b: Object.freeze({ full_name: 'Bea', team: 'NYJ', position: 'RB', extra: 'keep out' }),
		});
		const result = await format(
			{
				resource: 'player',
				operation: 'getMany',
				outputMode: 'splitItems',
				returnAll: false,
				limit: 1,
				sortBy: 'full_name',
				sortDirection: 'asc',
				playerOptions: { team: 'SEA', outputFields: 'position' },
			},
			map,
		);
		expect(result).toEqual([{ json: { player_id: 'a', position: 'WR' }, pairedItem: { item: 0 } }]);
		expect(map.a).toEqual({ full_name: 'Ada', team: ' sea ', position: 'WR', extra: 'keep out' });
		expect(Object.keys(map)).toEqual(['z', 'a', 'b']);
	});

	it('sorts case-insensitively with stable ties and leaves null or empty values last in both directions', async () => {
		const map = {
			id4: { full_name: 'same' },
			id3: { full_name: null },
			id2: { full_name: 'Alpha' },
			id1: { full_name: 'same' },
			id5: { full_name: '' },
		};
		const ascending = await format(
			{
				resource: 'player',
				operation: 'getMany',
				outputMode: 'splitItems',
				returnAll: true,
				sortBy: 'full_name',
				sortDirection: 'asc',
			},
			map,
		);
		const descending = await format(
			{
				resource: 'player',
				operation: 'getMany',
				outputMode: 'splitItems',
				returnAll: true,
				sortBy: 'full_name',
				sortDirection: 'desc',
			},
			map,
		);
		expect(ascending.map((item) => item.json.player_id)).toEqual([
			'id2',
			'id4',
			'id1',
			'id3',
			'id5',
		]);
		expect(descending.map((item) => item.json.player_id)).toEqual([
			'id4',
			'id1',
			'id2',
			'id3',
			'id5',
		]);
	});

	it('sorts opaque player IDs as text, then limits after filtering and sorting', async () => {
		const map = {
			'9007199254740995': { full_name: 'A', team: 'SEA' },
			'9007199254740993': { full_name: 'B', team: 'SEA' },
			'9007199254740994': { full_name: 'C', team: 'NYJ' },
		};
		const result = await format(
			{
				resource: 'player',
				operation: 'getMany',
				outputMode: 'splitItems',
				returnAll: false,
				limit: 1,
				playerOptions: { team: 'sea' },
				sortBy: 'player_id',
				sortDirection: 'asc',
			},
			map,
		);
		expect(result).toEqual([
			{
				json: { player_id: '9007199254740993', full_name: 'B', team: 'SEA' },
				pairedItem: { item: 0 },
			},
		]);
	});

	it('returns no output for an empty result and preserves an empty Single Map response', async () => {
		await expect(
			format({
				resource: 'player',
				operation: 'getMany',
				outputMode: 'splitItems',
				returnAll: true,
				playerOptions: { playerIds: 'missing' },
			}),
		).resolves.toEqual([]);
		await expect(
			format(
				{
					resource: 'player',
					operation: 'getMany',
					outputMode: 'singleMap',
					returnAll: true,
					playerOptions: { team: 'SEA', outputFields: 'full_name' },
				},
				{},
			),
		).resolves.toEqual([{ json: {}, pairedItem: { item: 0 } }]);
	});

	it('keeps the raw map untouched in default Single Map mode and retains the old split fallback', async () => {
		const raw = {
			'opaque-A': { full_name: 'Ada', player_id: 'upstream-id', nested: { ok: true } },
		};
		const snapshot = structuredClone(raw);
		await expect(format({ resource: 'player', operation: 'getMany' }, raw)).resolves.toEqual([
			{ json: raw, pairedItem: { item: 0 } },
		]);
		expect(raw).toEqual(snapshot);
		const legacyMalformed = { missing: null };
		await expect(
			format({ resource: 'player', operation: 'getMany' }, legacyMalformed),
		).resolves.toEqual([{ json: legacyMalformed, pairedItem: { item: 0 } }]);
		await expect(
			format(
				{
					resource: 'player',
					operation: 'getMany',
					outputMode: 'splitItems',
					returnAll: true,
				},
				{ 'opaque-A': { full_name: 'Ada' } },
			),
		).resolves.toEqual([
			{ json: { full_name: 'Ada', player_id: 'opaque-A' }, pairedItem: { item: 0 } },
		]);
	});

	it('preserves a nonzero source index for raw, filtered-map, and split outputs', async () => {
		const source = {
			p1: { player_id: 'p1', full_name: 'One', team: 'SEA' },
			p2: { player_id: 'p2', full_name: 'Two', team: 'SEA' },
		};
		const raw = await format({ resource: 'player', operation: 'getMany' }, source, [], 3);
		const filteredMap = await format(
			{
				resource: 'player',
				operation: 'getMany',
				outputMode: 'singleMap',
				returnAll: true,
				playerOptions: { team: 'SEA', outputFields: 'full_name' },
			},
			source,
			[],
			3,
		);
		const splitItems = await format(
			{ resource: 'player', operation: 'getMany', outputMode: 'splitItems' },
			source,
			[],
			3,
		);
		const empty = await format(
			{
				resource: 'player',
				operation: 'getMany',
				outputMode: 'splitItems',
				playerOptions: { playerIds: 'unknown' },
			},
			source,
			[],
			3,
		);
		expect(raw[0]?.pairedItem).toEqual({ item: 3 });
		expect(filteredMap[0]?.pairedItem).toEqual({ item: 3 });
		expect(splitItems.map((item) => item.pairedItem)).toEqual([{ item: 3 }, { item: 3 }]);
		expect(empty).toEqual([]);
	});

	it('keeps an opaque __proto__ map key as data in filtered output', async () => {
		const map = JSON.parse('{"__proto__":{"full_name":"Proto Player","team":"SEA"}}') as Params;
		const result = await format(
			{
				resource: 'player',
				operation: 'getMany',
				outputMode: 'splitItems',
				returnAll: true,
				playerOptions: { outputFields: 'full_name' },
			},
			map,
		);
		expect(result).toEqual([
			{ json: { player_id: '__proto__', full_name: 'Proto Player' }, pairedItem: { item: 0 } },
		]);
		const singleMap = await format(
			{
				resource: 'player',
				operation: 'getMany',
				outputMode: 'singleMap',
				returnAll: true,
				playerOptions: { team: 'SEA', outputFields: 'full_name' },
			},
			map,
		);
		expect(JSON.stringify(singleMap[0]?.json)).toBe(
			'{"__proto__":{"full_name":"Proto Player","player_id":"__proto__"}}',
		);
	});

	it('uses the legacy truthy player_id fallback for split output', async () => {
		const result = await format(
			{
				resource: 'player',
				operation: 'getMany',
				outputMode: 'splitItems',
				returnAll: true,
			},
			{
				zero: { player_id: 0 },
				false: { player_id: false },
				valid: { player_id: 'upstream' },
			},
		);
		expect(result.map((item) => item.json.player_id)).toEqual(['zero', 'false', 'upstream']);
	});

	it('does not evaluate hidden map sort or all-results limit values', async () => {
		await expect(
			format(
				{
					resource: 'player',
					operation: 'getMany',
					outputMode: 'singleMap',
					returnAll: true,
					limit: 'invalid',
					sortBy: 'invalid',
					sortDirection: 'invalid',
				},
				playerMap,
				['limit', 'sortBy', 'sortDirection'],
			),
		).resolves.toEqual([{ json: playerMap, pairedItem: { item: 0 } }]);
		await expect(
			format(
				{
					resource: 'player',
					operation: 'getMany',
					outputMode: 'splitItems',
					returnAll: true,
					sortBy: '',
					sortDirection: 'invalid',
					limit: 'invalid',
				},
				playerMap,
				['sortDirection', 'limit'],
			),
		).resolves.toHaveLength(Object.keys(playerMap).length);
	});
});

describe('Player output pre-transport validation', () => {
	const valid = {
		resource: 'player',
		operation: 'getMany',
		sport: 'nfl',
		outputMode: 'splitItems',
	};

	it('accepts legacy saved nodes without the new optional output parameters', async () => {
		const request = { url: '/players/nfl' } as never;
		await expect(validateSleeperRequest.call(context(valid), request)).resolves.toBe(request);
	});

	it('does not validate hidden limit, sort direction, or sorting controls', async () => {
		const parameters = {
			resource: 'player',
			operation: 'getMany',
			sport: 'nfl',
			outputMode: 'singleMap',
			returnAll: true,
			limit: -3,
			sortBy: 'invalid',
			sortDirection: 'invalid',
		};
		const request = { url: '/players/nfl' } as never;
		await expect(
			validateSleeperRequest.call(
				context(parameters, 0, ['limit', 'sortBy', 'sortDirection']),
				request,
			),
		).resolves.toBe(request);
	});

	it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
		'rejects invalid limit %s before transport when Return All is off',
		async (limit) => {
			let error: unknown;
			try {
				await validateSleeperRequest.call(context({ ...valid, returnAll: false, limit }), {
					url: '/players',
				} as never);
			} catch (caught) {
				error = caught;
			}
			expect(error).toBeInstanceOf(NodeOperationError);
			expect((error as NodeOperationError).context.itemIndex).toBe(0);
			expect((error as NodeOperationError).description).toBeTruthy();
		},
	);

	it.each([
		{ playerOptions: null },
		{ playerOptions: 'team=SEA' },
		{ playerOptions: { team: 1 } },
		{ playerOptions: { hasTeam: 'yes' } },
		{ playerOptions: { playerIds: ['one', 'two'] } },
		{ playerOptions: { outputFields: '__proto__' } },
		{ playerOptions: { outputFields: 'nested.name' } },
		{ sortBy: 'constructor' },
		{ sortBy: 'team', sortDirection: 'sideways' },
		{ returnAll: 'false' },
	])('rejects malformed player options before transport: $playerOptions', async (extra) => {
		let error: unknown;
		try {
			await validateSleeperRequest.call(context({ ...valid, ...extra }, 3), {
				url: '/players',
			} as never);
		} catch (caught) {
			error = caught;
		}
		expect(error).toBeInstanceOf(NodeOperationError);
		expect((error as NodeOperationError).context.itemIndex).toBe(3);
		expect((error as NodeOperationError).message.length).toBeGreaterThan(0);
		expect((error as NodeOperationError).description).toBeTruthy();
	});

	it('does not add local player options to the Sleeper query', async () => {
		const request = { url: '/players/nfl', qs: { active: true, position: 'QB' } } as never;
		await validateSleeperRequest.call(
			context({
				...valid,
				activeOnly: true,
				position: 'QB',
				playerOptions: { team: 'SEA', hasTeam: true, playerIds: '42' },
				sortBy: 'team',
				sortDirection: 'desc',
			}),
			request,
		);
		expect(request).toEqual({ url: '/players/nfl', qs: { active: true, position: 'QB' } });
	});

	it('keeps the NHL saved-position guard intact', async () => {
		await expect(
			validateSleeperRequest.call(
				context({
					resource: 'player',
					operation: 'getMany',
					sport: 'nhl',
					outputMode: 'singleMap',
					position: 'G',
				}),
				{ url: '/players/nhl' } as never,
			),
		).rejects.toThrow('NHL position filtering is unavailable');
	});

	it('normalizes legacy parameters through n8n metadata with visible defaults', () => {
		const nodeDescription = new Sleeper().description;
		const normalized = NodeHelpers.getNodeParameters(
			nodeDescription.properties,
			{ resource: 'player', operation: 'getMany', sport: 'nfl' } as INodeParameters,
			true,
			false,
			{ typeVersion: 1 },
			nodeDescription,
		);
		expect(normalized?.returnAll).toBe(true);
		expect(normalized?.outputMode).toBe('singleMap');
		expect(normalized?.playerOptions).toEqual({});
		const limited = NodeHelpers.getNodeParameters(
			nodeDescription.properties,
			{
				resource: 'player',
				operation: 'getMany',
				sport: 'nfl',
				returnAll: false,
				outputMode: 'splitItems',
				sortBy: 'team',
			} as INodeParameters,
			true,
			false,
			{ typeVersion: 1 },
			nodeDescription,
		);
		expect(limited?.limit).toBe(50);
		expect(limited?.sortDirection).toBe('asc');
		expect(
			properties().find((property) => property.name === 'limit')?.displayOptions?.show,
		).toMatchObject({ returnAll: [false], operation: ['getMany'], resource: ['player'] });
	});
});
