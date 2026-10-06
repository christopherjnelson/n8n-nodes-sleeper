import {
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
} from 'n8n-workflow';

import { createAvatarResult } from '../utils/avatar';

function isDataObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function formatPlayerMap(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	_response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	void _response;
	const playerMap = items[0]?.json;
	if (!isDataObject(playerMap)) {
		throw new NodeOperationError(this.getNode(), 'Sleeper returned an invalid player map', {
			description: 'Expected Player → Get Many to return an object keyed by player ID.',
		});
	}
	if (this.getNodeParameter('outputMode') !== 'splitItems') return [{ json: playerMap }];

	const players: Array<[string, IDataObject]> = [];
	for (const [playerId, player] of Object.entries(playerMap)) {
		if (!isDataObject(player)) {
			throw new NodeOperationError(this.getNode(), 'Sleeper returned an invalid player entry', {
				description: `Expected player map entry ${playerId} to be an object.`,
			});
		}
		players.push([playerId, player]);
	}

	return players.map(([playerId, player]) => ({
		json: player.player_id ? player : { ...player, player_id: playerId },
	}));
}

type JsonSourceContext = { source?: string };
type JsonParseWithSource = (
	text: string,
	reviver: (this: unknown, key: string, value: unknown, context?: JsonSourceContext) => unknown,
) => unknown;

function invalidDraftTradedPicks(
	context: IExecuteSingleFunctions,
	description: string,
): NodeOperationError {
	return new NodeOperationError(context.getNode(), 'Sleeper returned invalid draft traded picks', {
		description,
	});
}

/**
 * The draft traded-picks endpoint emits large opaque IDs as JSON numbers. Read its raw
 * response text and use the V8 reviver source token to preserve unsafe *_id tokens exactly.
 */
export async function formatDraftTradedPicks(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	void _items;
	if (typeof response.body !== 'string') {
		throw invalidDraftTradedPicks(
			this,
			'Expected the raw response body to be JSON text so opaque numeric IDs can be preserved.',
		);
	}

	let parsed: unknown;
	try {
		const parseWithSource = JSON.parse as unknown as JsonParseWithSource;
		parsed = parseWithSource(response.body, function (_key, value, context) {
			if (typeof value === 'number' && !Number.isSafeInteger(value) && /(?:^|_)id$/i.test(_key)) {
				const source = context?.source;
				if (typeof source !== 'string' || !/^-?\d+$/.test(source)) {
					throw new Error('Unsafe opaque identifier has no exact decimal source token');
				}
				return source;
			}
			return value;
		});
	} catch {
		throw invalidDraftTradedPicks(
			this,
			'Expected valid JSON with exact decimal source tokens for unsafe numeric opaque IDs.',
		);
	}

	if (!Array.isArray(parsed)) {
		throw invalidDraftTradedPicks(this, 'Expected the draft traded-picks response to be an array.');
	}
	for (const record of parsed) {
		if (typeof record !== 'object' || record === null || Array.isArray(record)) {
			throw invalidDraftTradedPicks(
				this,
				'Expected every draft traded-pick record to be an object.',
			);
		}
	}
	return (parsed as IDataObject[]).map((json) => ({ json }));
}

export async function formatAvatarUrl(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	_response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	void _items;
	void _response;
	const avatarId = String(this.getNodeParameter('avatarId')).trim();
	const imageSize = this.getNodeParameter('imageSize') === 'thumbnail' ? 'thumbnail' : 'full';
	return [{ json: createAvatarResult(avatarId, imageSize) }];
}
