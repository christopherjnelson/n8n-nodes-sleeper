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
