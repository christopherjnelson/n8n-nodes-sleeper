import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { Sleeper } from '../nodes/Sleeper/Sleeper.node';
import { formatAvatarUrl, formatPlayerMap } from '../nodes/Sleeper/descriptions/response';
import { validateSleeperRequest } from '../nodes/Sleeper/descriptions/routing';

function operations(properties: INodeProperties[]) {
	return properties
		.filter((property) => property.name === 'operation')
		.flatMap((property) => property.options ?? []) as INodePropertyOptions[];
}

function context(parameters: Record<string, unknown>): IExecuteSingleFunctions {
	return {
		getNode: () => ({
			name: 'Sleeper',
			type: 'test.sleeper',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		getNodeParameter: (name: string) => parameters[name],
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

	it('uses HEAD and the avatar response formatter', () => {
		const avatar = operations(new Sleeper().description.properties).find(
			(option) => option.value === 'getUrl',
		);
		expect(avatar?.routing?.request?.method).toBe('HEAD');
		expect(avatar?.routing?.output?.postReceive).toEqual([formatAvatarUrl]);
	});
});

describe('routing hooks', () => {
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
		[{ resource: 'sport', operation: 'getState', sport: 'nba' }, 'sport'],
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
		expect(result.map((item) => item.json)).toEqual([
			{ full_name: 'One', player_id: 'p1' },
			{ player_id: 'p2' },
		]);
	});

	it('preserves single maps and permits empty split output', async () => {
		const map = { p1: { player_id: 'p1' } };
		expect(
			await formatPlayerMap.call(
				context({ outputMode: 'singleMap' }),
				[{ json: map }],
				{} as never,
			),
		).toEqual([{ json: map }]);
		expect(
			await formatPlayerMap.call(
				context({ outputMode: 'splitItems' }),
				[{ json: {} }],
				{} as never,
			),
		).toEqual([]);
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
			context({ avatarId: 'abc/def', imageSize: 'thumbnail' }),
			[],
			{} as never,
		);
		expect(result[0]?.json).toEqual({
			avatar_id: 'abc/def',
			size: 'thumbnail',
			url: 'https://sleepercdn.com/avatars/thumbs/abc%2Fdef',
		});
	});
});
