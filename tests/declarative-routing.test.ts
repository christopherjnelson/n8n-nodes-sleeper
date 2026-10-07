import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { Sleeper } from '../nodes/Sleeper/Sleeper.node';
import {
	attachSleeperPairedItem,
	formatAvatarUrl,
	formatDraftTradedPicks,
	formatPlayerMap,
	normalizeSleeperResponse,
} from '../nodes/Sleeper/descriptions/response';
import { sleeperRoute, validateSleeperRequest } from '../nodes/Sleeper/descriptions/routing';

function operations(properties: INodeProperties[]) {
	return properties
		.filter((property) => property.name === 'operation')
		.flatMap((property) => property.options ?? []) as INodePropertyOptions[];
}

function context(parameters: Record<string, unknown>, itemIndex = 0): IExecuteSingleFunctions {
	return {
		getNode: () => ({
			name: 'Sleeper',
			type: 'test.sleeper',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		getNodeParameter: (name: string) => parameters[name],
		getItemIndex: () => itemIndex,
	} as unknown as IExecuteSingleFunctions;
}

describe('Sleeper declarative contract', () => {
	it('has request defaults and no programmatic executor', () => {
		const node = new Sleeper();
		expect(node.description.requestDefaults).toMatchObject({
			baseURL: 'https://api.sleeper.app/v1',
			returnFullResponse: false,
		});
		expect('execute' in node).toBe(false);
	});

	it('routes every public operation through a preSend hook', () => {
		const routes = operations(new Sleeper().description.properties);
		expect(routes).toHaveLength(18);
		for (const operation of routes) {
			expect(operation.routing?.request).toBeDefined();
			expect(operation.routing?.send?.preSend).toContain(validateSleeperRequest);
		}
	});

	it('encodes opaque identifiers in every path expression', () => {
		const routeText = JSON.stringify(operations(new Sleeper().description.properties));
		for (const parameter of ['avatarId', 'draftId', 'leagueId', 'userId', 'usernameOrUserId']) {
			expect(routeText).toContain(`encodeURIComponent(String($parameter.${parameter}).trim())`);
		}
	});

	it('uses declarative query routing for player filters', () => {
		const properties = new Sleeper().description.properties;
		expect(
			properties.find((property) => property.name === 'activeOnly')?.routing?.request?.qs,
		).toEqual({
			active: '={{$value ? true : undefined}}',
		});
		expect(properties.find((property) => property.name === 'lookbackHours')?.routing?.send).toEqual(
			{
				type: 'query',
				property: 'lookback_hours',
			},
		);
		expect(
			properties.find((property) => property.name === 'position')?.routing?.request?.qs,
		).toEqual({ position: '={{$value.trim() || undefined}}' });
		expect(properties.find((property) => property.name === 'resultLimit')?.routing?.send).toEqual({
			type: 'query',
			property: 'limit',
		});
	});

	it('declares all required controls under matching display conditions', () => {
		const properties = new Sleeper().description.properties;
		const expected: Record<string, string[]> = {
			'avatar:getUrl': ['avatarId', 'imageSize'],
			'draft:get': ['draftId'],
			'draft:getManyForLeague': ['leagueId'],
			'draft:getManyForUser': ['userId', 'sport', 'season'],
			'draftPick:getMany': ['draftId'],
			'draftTradedPick:getMany': ['draftId'],
			'league:get': ['leagueId'],
			'league:getManyForUser': ['userId', 'sport', 'season'],
			'leagueUser:getMany': ['leagueId'],
			'matchup:getMany': ['leagueId', 'week'],
			'player:getMany': ['sport', 'outputMode'],
			'player:getTrending': ['sport', 'trendType', 'lookbackHours', 'resultLimit'],
			'playoff:getBracket': ['leagueId', 'bracketType'],
			'roster:getMany': ['leagueId'],
			'sport:getState': ['sport'],
			'tradedPick:getMany': ['leagueId'],
			'transaction:getMany': ['leagueId', 'round'],
			'user:get': ['usernameOrUserId'],
		};
		for (const [key, names] of Object.entries(expected)) {
			const [resource, operation] = key.split(':');
			for (const name of names)
				expect(
					properties.some(
						(property) =>
							property.name === name &&
							property.required === true &&
							property.displayOptions?.show?.resource?.includes(resource!) &&
							property.displayOptions?.show?.operation?.includes(operation!),
					),
				).toBe(true);
		}
	});

	it('runs response normalization, custom transforms, and pairing for all 18 operations', () => {
		const avatar = operations(new Sleeper().description.properties).find(
			(option) => option.value === 'getUrl',
		);
		expect(avatar?.routing?.request?.method).toBe('HEAD');
		const routes = operations(new Sleeper().description.properties);
		expect(routes).toHaveLength(18);
		for (const route of routes) {
			const handlers = route.routing?.output?.postReceive;
			expect(handlers?.at(-1)).toBe(attachSleeperPairedItem);
			if (handlers?.includes(formatAvatarUrl)) {
				expect(handlers).toEqual([formatAvatarUrl, attachSleeperPairedItem]);
			} else if (handlers?.includes(formatPlayerMap)) {
				expect(handlers).toEqual([formatPlayerMap, attachSleeperPairedItem]);
			} else if (handlers?.includes(formatDraftTradedPicks)) {
				expect(handlers).toEqual([formatDraftTradedPicks, attachSleeperPairedItem]);
			} else {
				expect(handlers?.[0]).toBe(normalizeSleeperResponse);
			}
		}
		expect(sleeperRoute('/test', { postReceive: [] }).output?.postReceive).toEqual([
			normalizeSleeperResponse,
			attachSleeperPairedItem,
		]);
	});
});

describe('routing hooks', () => {
	it('normalizes API arrays, objects, and empty results without inventing items', async () => {
		const ctx = context({}, 4);
		const object = {
			json: { league_id: 'opaque', nested: { ok: true } },
			pairedItem: { item: 99 },
		};
		expect(await normalizeSleeperResponse.call(ctx, [object], {} as never)).toEqual([
			{ ...object, pairedItem: { item: 99 } },
		]);
		expect(
			await normalizeSleeperResponse.call(
				ctx,
				[{ json: [{ roster_id: 'a' }, { roster_id: 'b' }] }] as never,
				{} as never,
			),
		).toEqual([{ json: { roster_id: 'a' } }, { json: { roster_id: 'b' } }]);
		expect(await normalizeSleeperResponse.call(ctx, [{ json: [] }] as never, {} as never)).toEqual(
			[],
		);
	});

	it('pairs every response from each input independently, including uneven result counts', async () => {
		const inputA = await normalizeSleeperResponse.call(
			context({}, 0),
			[{ json: [{ roster_id: 'a1' }, { roster_id: 'a2' }] }] as never,
			{} as never,
		);
		const inputB = await normalizeSleeperResponse.call(
			context({}, 1),
			[{ json: [] }] as never,
			{} as never,
		);
		const outputA = await attachSleeperPairedItem.call(context({}, 0), inputA, {} as never);
		const outputB = await attachSleeperPairedItem.call(context({}, 1), inputB, {} as never);
		expect([...outputA, ...outputB]).toEqual([
			{ json: { roster_id: 'a1' }, pairedItem: { item: 0 } },
			{ json: { roster_id: 'a2' }, pairedItem: { item: 0 } },
		]);
	});

	it('rejects null API responses as indexed not-found errors', async () => {
		await expect(
			normalizeSleeperResponse.call(context({}, 3), [{ json: null }] as never, {} as never),
		).rejects.toMatchObject({
			message: 'Sleeper resource was not found',
			context: { itemIndex: 3 },
		});
		await expect(
			normalizeSleeperResponse.call(context({}, 3), [], {} as never),
		).rejects.toMatchObject({
			message: 'Sleeper returned an invalid response',
			context: { itemIndex: 3 },
		});
	});

	it('rejects blank IDs and invalid integers before transport', async () => {
		const request = { url: '/draft/' } as IHttpRequestOptions;
		await expect(
			validateSleeperRequest.call(
				context({ resource: 'draft', operation: 'get', draftId: '  ' }),
				request,
			),
		).rejects.toThrow('draftId is required');
		await expect(
			validateSleeperRequest.call(
				context({ resource: 'matchup', operation: 'getMany', leagueId: '1', week: 0 }),
				request,
			),
		).rejects.toThrow('week must be a positive integer');
	});

	it('accepts a minimal valid operation unchanged', async () => {
		const request = { url: '/league/123' } as IHttpRequestOptions;
		await expect(
			validateSleeperRequest.call(
				context({ resource: 'league', operation: 'get', leagueId: '123' }),
				request,
			),
		).resolves.toBe(request);
	});

	it.each([
		[
			{
				resource: 'player',
				operation: 'getTrending',
				sport: 'nfl',
				trendType: 'trade',
				lookbackHours: 1,
				resultLimit: 1,
			},
			'trendType',
		],
		[
			{ resource: 'playoff', operation: 'getBracket', leagueId: '1', bracketType: 'finals' },
			'bracketType',
		],
		[{ resource: 'avatar', operation: 'getUrl', avatarId: '1', imageSize: 'tiny' }, 'imageSize'],
		[{ resource: 'player', operation: 'getMany', sport: 'nfl', outputMode: 'rows' }, 'outputMode'],
	])('rejects unsupported controlled values', async (parameters, parameter) => {
		await expect(
			validateSleeperRequest.call(context(parameters), { url: '/' } as IHttpRequestOptions),
		).rejects.toThrow(`${parameter} has an unsupported value`);
	});

	it('splits player maps while retaining a missing player ID', async () => {
		const result = await formatPlayerMap.call(
			context({ outputMode: 'splitItems' }),
			[{ json: { p1: { full_name: 'One' }, p2: { player_id: 'p2' } } }],
			{} as never,
		);
		expect(result).toEqual([
			{ json: { full_name: 'One', player_id: 'p1' }, pairedItem: { item: 0 } },
			{ json: { player_id: 'p2' }, pairedItem: { item: 0 } },
		]);
	});

	it('preserves single maps and permits empty split output', async () => {
		const map = { p1: { player_id: 'p1' } };
		expect(
			await formatPlayerMap.call(
				context({ outputMode: 'singleMap' }, 3),
				[{ json: map }],
				{} as never,
			),
		).toEqual([{ json: map, pairedItem: { item: 3 } }]);
		expect(
			await formatPlayerMap.call(
				context({ outputMode: 'splitItems' }),
				[{ json: {} }],
				{} as never,
			),
		).toEqual([]);
	});

	it('retains the originating input index for map and split outputs', async () => {
		const map = { p1: { player_id: 'p1' }, p2: { full_name: 'Two' } };
		const singleMap = await formatPlayerMap.call(
			context({ outputMode: 'singleMap', playerOptions: { outputFields: 'full_name' } }, 3),
			[{ json: map }],
			{} as never,
		);
		const splitItems = await formatPlayerMap.call(
			context({ outputMode: 'splitItems' }, 3),
			[{ json: map }],
			{} as never,
		);
		expect(singleMap.map((item) => item.pairedItem)).toEqual([{ item: 3 }]);
		expect(splitItems.map((item) => item.pairedItem)).toEqual([{ item: 3 }, { item: 3 }]);
	});

	it('rejects malformed player maps', async () => {
		await expect(
			formatPlayerMap.call(
				context({ outputMode: 'singleMap' }),
				[{ json: [] as never }],
				{} as never,
			),
		).rejects.toThrow('invalid player map');
	});

	it('rejects an invalid entry inside an object-shaped player map', async () => {
		await expect(
			formatPlayerMap.call(
				context({ outputMode: 'splitItems' }),
				[{ json: { valid: { player_id: 'valid' }, broken: 'not-an-object' } }],
				{} as never,
			),
		).rejects.toThrow('invalid player entry');
	});

	it('returns the validated avatar URL after the CDN HEAD request', async () => {
		const result = await formatAvatarUrl.call(
			context({ avatarId: 'abc/def', imageSize: 'thumbnail' }, 2),
			[],
			{} as never,
		);
		expect(result[0]?.json).toEqual({
			avatar_id: 'abc/def',
			size: 'thumbnail',
			url: 'https://sleepercdn.com/avatars/thumbs/abc%2Fdef',
		});
		expect(await attachSleeperPairedItem.call(context({}, 2), result, {} as never)).toEqual([
			{ ...result[0], pairedItem: { item: 2 } },
		]);
	});
});
