import {
	NodeOperationError,
	NodeHelpers,
	type IExecuteSingleFunctions,
	type INodeParameters,
	type INodeProperties,
	type INodePropertyOptions,
} from 'n8n-workflow';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Sleeper } from '../nodes/Sleeper/Sleeper.node';
import { formatDraftTradedPicks } from '../nodes/Sleeper/descriptions/response';
import { validateSleeperRequest } from '../nodes/Sleeper/descriptions/routing';
import { sportCapabilityForOperation, sportsForCapability } from '../nodes/Sleeper/utils/sports';

function context(
	parameters: Record<string, unknown>,
	evaluatedParameters: Record<string, unknown> = parameters,
	itemIndex = 0,
	rejectPositionEvaluation = false,
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
			if (rejectPositionEvaluation && name === 'position') {
				throw new Error('A saved NHL position expression must not be evaluated');
			}
			return Object.prototype.hasOwnProperty.call(evaluatedParameters, name)
				? evaluatedParameters[name]
				: fallback;
		},
		getItemIndex: () => itemIndex,
	} as unknown as IExecuteSingleFunctions;
}

function tradedPicksContext() {
	return {
		getNode: () => ({
			name: 'Sleeper',
			type: 'test.sleeper',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
	} as unknown as IExecuteSingleFunctions;
}

function properties(): INodeProperties[] {
	return new Sleeper().description.properties;
}

afterEach(() => vi.restoreAllMocks());

describe('operation-specific sport support', () => {
	it('declares the bounded sport capability matrix', () => {
		expect(sportCapabilityForOperation('league', 'getManyForUser')).toBe('seasonalListings');
		expect(sportCapabilityForOperation('draft', 'getManyForUser')).toBe('seasonalListings');
		expect(sportsForCapability('seasonalListings')).toEqual(['nfl', 'nba']);
		expect(sportsForCapability('playerCatalog')).toEqual(['nfl', 'nba', 'nhl']);
		expect(sportsForCapability('trending')).toEqual(['nfl', 'nba']);
		expect(sportsForCapability('state')).toEqual(['nfl', 'nba', 'nhl']);
	});

	it('keeps the action node identity, 14 resources, and 18 operations', () => {
		const node = new Sleeper().description;
		expect(node.name).toBe('sleeper');
		expect(
			node.properties.filter((property) => property.name === 'resource')[0]?.options,
		).toHaveLength(14);
		const operationCount = node.properties
			.filter((property) => property.name === 'operation')
			.reduce((count, property) => count + (property.options?.length ?? 0), 0);
		expect(operationCount).toBe(18);
	});

	it('shows supported selectors and the NHL position limitation notice', () => {
		const playerSport = properties().filter(
			(property) =>
				property.name === 'sport' && property.displayOptions?.show?.resource?.includes('player'),
		);
		expect(playerSport).toHaveLength(2);
		expect(
			(
				playerSport.find((property) =>
					property.displayOptions?.show?.operation?.includes('getMany'),
				)?.options as INodePropertyOptions[]
			).map((option) => option.value),
		).toEqual(['nfl', 'nba', 'nhl']);
		expect(
			(
				playerSport.find((property) =>
					property.displayOptions?.show?.operation?.includes('getTrending'),
				)?.options as INodePropertyOptions[]
			).map((option) => option.value),
		).toEqual(['nfl', 'nba']);
		const positions = properties().filter((property) => property.name === 'position');
		expect(positions).toHaveLength(3);
		const nflPosition = positions.find(
			(property) =>
				property.type === 'options' && property.displayOptions?.show?.sport?.includes('nfl'),
		);
		const nbaPosition = positions.find(
			(property) =>
				property.type === 'options' && property.displayOptions?.show?.sport?.includes('nba'),
		);
		expect(nflPosition?.displayOptions?.show?.sport).toEqual(['nfl']);
		expect(nflPosition?.default).toBe('');
		expect(nflPosition?.routing?.request?.qs).toEqual({
			position: '={{$value.trim() || undefined}}',
		});
		expect(
			(nflPosition?.options as INodePropertyOptions[]).map((option) => option.value).sort(),
		).toEqual(
			[
				'',
				'DB',
				'DEF',
				'DL',
				'K',
				'K/P',
				'LB',
				'LEO',
				'LS',
				'OG',
				'OL',
				'OT',
				'P',
				'QB',
				'RB',
				'TE',
				'WR',
			].sort(),
		);
		expect(nbaPosition?.displayOptions?.show?.sport).toEqual(['nba']);
		expect(nbaPosition?.default).toBe('');
		expect(
			(nbaPosition?.options as INodePropertyOptions[]).map((option) => option.value).sort(),
		).toEqual(['', 'C', 'DEF', 'PF', 'PG', 'SF', 'SG'].sort());
		for (const visiblePosition of [nflPosition, nbaPosition]) {
			expect(
				(visiblePosition?.options as INodePropertyOptions[]).find((option) => option.value === ''),
			).toMatchObject({ name: 'All Positions', value: '' });
			expect(visiblePosition?.routing?.request?.qs).toEqual({
				position: '={{$value.trim() || undefined}}',
			});
		}
		const hiddenPosition = positions.find((property) => property.type === 'hidden');
		expect(hiddenPosition?.displayOptions?.show?.sport).toEqual(['nhl']);
		expect(hiddenPosition?.routing).toBeUndefined();
		const notice = properties().find((property) => property.name === 'nhlPositionNotice');
		expect(notice?.type).toBe('notice');
		expect(notice?.displayOptions?.show?.sport).toEqual(['nhl']);
	});

	it.each([
		{ resource: 'sport', operation: 'getState', sport: 'nfl' },
		{ resource: 'sport', operation: 'getState', sport: 'nba' },
		{ resource: 'sport', operation: 'getState', sport: 'nhl' },
		{ resource: 'player', operation: 'getMany', sport: 'nhl', outputMode: 'singleMap' },
		{
			resource: 'player',
			operation: 'getTrending',
			sport: 'nba',
			trendType: 'add',
			lookbackHours: 24,
			resultLimit: 10,
		},
		{
			resource: 'league',
			operation: 'getManyForUser',
			userId: '123',
			sport: 'nba',
			season: '2026',
		},
		{ resource: 'draft', operation: 'getManyForUser', userId: '123', sport: 'nba', season: '2026' },
	])('accepts a supported operation and sport: $resource $operation $sport', async (parameters) => {
		const request = { url: '/route' } as never;
		await expect(validateSleeperRequest.call(context(parameters), request)).resolves.toBe(request);
	});

	it.each([
		{
			resource: 'player',
			operation: 'getTrending',
			sport: 'nhl',
			trendType: 'add',
			lookbackHours: 24,
			resultLimit: 10,
		},
		{
			resource: 'league',
			operation: 'getManyForUser',
			userId: '123',
			sport: 'nhl',
			season: '2026',
		},
		{ resource: 'draft', operation: 'getManyForUser', userId: '123', sport: 'nhl', season: '2026' },
		{ resource: 'player', operation: 'getMany', sport: 'mlb', outputMode: 'singleMap' },
	])(
		'rejects unsupported operation/sport values before transport: $resource $sport',
		async (parameters) => {
			await expect(
				validateSleeperRequest.call(context(parameters), { url: '/must-not-run' } as never),
			).rejects.toThrow('Unsupported sport');
		},
	);

	it.each(['G', ' ={{ $json.position }} ', 'QB/SG'])(
		'rejects NHL position value %j before transport',
		async (position) => {
			await expect(
				validateSleeperRequest.call(
					context({
						resource: 'player',
						operation: 'getMany',
						sport: 'nhl',
						outputMode: 'singleMap',
						position,
					}),
					{ url: '/must-not-run' } as never,
				),
			).rejects.toThrow(NodeOperationError);
		},
	);

	it('rejects saved NHL positions hidden from the active UI, including expressions, with the input index', async () => {
		const nodeParameters: INodeParameters = {
			resource: 'player',
			operation: 'getMany',
			sport: 'nhl',
			activeOnly: true,
			position: '={{ "G" }}',
			outputMode: 'singleMap',
		};
		const sleeperDescription = new Sleeper().description;
		const normalizedParameters = NodeHelpers.getNodeParameters(
			sleeperDescription.properties,
			nodeParameters,
			true,
			false,
			{ typeVersion: 1 },
			sleeperDescription,
		);
		expect(normalizedParameters?.position).toBe('={{ "G" }}');
		let error: unknown;
		try {
			await validateSleeperRequest.call(
				context(normalizedParameters as Record<string, unknown>, undefined, 2),
				{ url: '/must-not-run' } as never,
			);
		} catch (caught) {
			error = caught;
		}
		expect(error).toBeInstanceOf(NodeOperationError);
		expect((error as NodeOperationError).context.itemIndex).toBe(2);
		expect((error as NodeOperationError).description).toContain(
			'Switch to NFL or NBA, clear Position, then choose NHL',
		);
	});

	it('rejects a saved invalid NHL expression before evaluating it', async () => {
		const nodeParameters: INodeParameters = {
			resource: 'player',
			operation: 'getMany',
			sport: 'nhl',
			position: '={{ invalid( }}',
			outputMode: 'singleMap',
		};
		const sleeperDescription = new Sleeper().description;
		const normalizedParameters = NodeHelpers.getNodeParameters(
			sleeperDescription.properties,
			nodeParameters,
			true,
			false,
			{ typeVersion: 1 },
			sleeperDescription,
		);
		expect(normalizedParameters?.position).toBe('={{ invalid( }}');
		const evaluatedParameters = {
			resource: 'player',
			operation: 'getMany',
			sport: 'nhl',
			outputMode: 'singleMap',
		};
		await expect(
			validateSleeperRequest.call(
				context(normalizedParameters as Record<string, unknown>, evaluatedParameters, 0, true),
				{ url: '/must-not-run' } as never,
			),
		).rejects.toMatchObject({
			name: 'NodeOperationError',
			message: 'NHL position filtering is unavailable',
		});
	});

	it('allows blank saved NHL position and preserves NFL/NBA position query routing', async () => {
		for (const sport of ['nfl', 'nba']) {
			const request = { url: '/players', qs: { position: 'PG' } } as never;
			await expect(
				validateSleeperRequest.call(
					context({
						resource: 'player',
						operation: 'getMany',
						sport,
						outputMode: 'singleMap',
						position: 'PG',
					}),
					request,
				),
			).resolves.toBe(request);
		}
		await expect(
			validateSleeperRequest.call(
				context({
					resource: 'player',
					operation: 'getMany',
					sport: 'nhl',
					outputMode: 'singleMap',
					position: '',
				}),
				{ url: '/players' } as never,
			),
		).resolves.toBeDefined();
	});

	it('preserves saved NFL/NBA position expressions and unknown legacy values without enum validation', async () => {
		const sleeperDescription = new Sleeper().description;
		for (const { sport, position } of [
			{ sport: 'nfl', position: '={{ "QB" }}' },
			{ sport: 'nba', position: '={{ "PG" }}' },
			{ sport: 'nfl', position: 'XFL' },
		]) {
			const normalized = NodeHelpers.getNodeParameters(
				sleeperDescription.properties,
				{
					resource: 'player',
					operation: 'getMany',
					sport,
					position,
					outputMode: 'singleMap',
				} as INodeParameters,
				true,
				false,
				{ typeVersion: 1 },
				sleeperDescription,
			);
			expect(normalized?.position).toBe(position);
		}
		const request = { url: '/players/nfl', qs: { position: 'XFL' } } as never;
		await expect(
			validateSleeperRequest.call(
				context({
					resource: 'player',
					operation: 'getMany',
					sport: 'nfl',
					position: 'XFL',
					outputMode: 'singleMap',
				}),
				request,
			),
		).resolves.toBe(request);
	});
});

describe('draft traded-pick lossless response parser', () => {
	const response = (body: unknown) => ({ body, headers: {}, statusCode: 200 }) as never;
	const raw = String.raw`[{"draft_id":1382095101836136448,"round":2,"owner_id":12345,"label":"A\"B","nullable":null}]`;

	it('preserves unsafe opaque ID tokens while leaving safe numbers, strings, escapes, and null intact', async () => {
		const result = await formatDraftTradedPicks.call(tradedPicksContext(), [], response(raw));
		expect(result).toEqual([
			{
				json: {
					draft_id: '1382095101836136448',
					round: 2,
					owner_id: 12345,
					label: 'A"B',
					nullable: null,
				},
			},
		]);
	});

	it('preserves nested unsafe IDs and existing string IDs', async () => {
		const result = await formatDraftTradedPicks.call(
			tradedPicksContext(),
			[],
			response('[{"draft_id":"already-text","nested":{"league_id":9007199254740995,"count":9}}]'),
		);
		expect(result[0]?.json).toEqual({
			draft_id: 'already-text',
			nested: { league_id: '9007199254740995', count: 9 },
		});
	});

	it('returns an empty output for an empty array', async () => {
		expect(await formatDraftTradedPicks.call(tradedPicksContext(), [], response('[]'))).toEqual([]);
	});

	it('rejects unsafe identifiers if the runtime does not provide the exact source token', async () => {
		const nativeParse = JSON.parse;
		vi.spyOn(JSON, 'parse').mockImplementation(((
			text: string,
			reviver?: (key: string, value: unknown) => unknown,
		) =>
			nativeParse(
				text,
				reviver
					? function (this: unknown, key: string, value: unknown) {
							return reviver.call(this, key, value);
						}
					: undefined,
			)) as typeof JSON.parse);
		await expect(
			formatDraftTradedPicks.call(tradedPicksContext(), [], response(raw)),
		).rejects.toThrow('invalid draft traded picks');
	});

	it('rejects non-decimal source tokens for unsafe numeric opaque IDs', async () => {
		await expect(
			formatDraftTradedPicks.call(tradedPicksContext(), [], response('[{"draft_id":1e21}]')),
		).rejects.toThrow('invalid draft traded picks');
	});

	it.each(['not json', '{"draft_id":1382095101836136448}', '[null]', '[1]'])(
		'rejects malformed response %j with a focused Node error',
		async (body) => {
			await expect(
				formatDraftTradedPicks.call(tradedPicksContext(), [], response(body)),
			).rejects.toThrow('invalid draft traded picks');
		},
	);

	it('requests draft traded-picks as text and uses the lossless parser', () => {
		const operation = properties()
			.filter((property) => property.name === 'operation')
			.flatMap((property) => (property.options ?? []) as INodePropertyOptions[])
			.find(
				(option) =>
					option.value === 'getMany' &&
					option.routing?.output?.postReceive?.includes(formatDraftTradedPicks),
			);
		expect(operation?.routing?.request).toMatchObject({ json: false, encoding: 'text' });
	});
});
