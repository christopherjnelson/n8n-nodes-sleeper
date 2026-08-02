import {
	NodeApiError,
	NodeOperationError,
	type IDataObject,
	type INode,
	type INodeExecutionData,
} from 'n8n-workflow';

import type { SleeperPlayerOutputMode } from './validation';

export type SleeperResponseShape = 'array' | 'object';

function isJsonValue(value: unknown): boolean {
	if (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		return true;
	}

	if (Array.isArray(value)) {
		return value.every((entry) => isJsonValue(entry));
	}

	if (typeof value === 'object') {
		return Object.values(value).every((entry) => isJsonValue(entry));
	}

	return false;
}

export function isJsonObject(value: unknown): value is IDataObject {
	return value !== null && typeof value === 'object' && !Array.isArray(value) && isJsonValue(value);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPlayerMap(value: unknown): value is IDataObject {
	return isPlainRecord(value) && Object.values(value).every((player) => isJsonObject(player));
}

function unexpectedResponseError(
	node: INode,
	operation: string,
	itemIndex: number,
	description: string,
): NodeOperationError {
	return new NodeOperationError(node, `Unexpected response from Sleeper for ${operation}`, {
		description,
		itemIndex,
	});
}

export function toExecutionItems(
	node: INode,
	response: unknown,
	shape: SleeperResponseShape,
	itemIndex: number,
	operation: string,
): INodeExecutionData[] {
	if (shape === 'array') {
		if (!Array.isArray(response)) {
			throw unexpectedResponseError(
				node,
				operation,
				itemIndex,
				'Expected Sleeper to return an array of objects.',
			);
		}

		return response.map((entry) => {
			if (!isJsonObject(entry)) {
				throw unexpectedResponseError(
					node,
					operation,
					itemIndex,
					'Expected every Sleeper array entry to be a JSON object.',
				);
			}

			return {
				json: entry,
				pairedItem: { item: itemIndex },
			};
		});
	}

	if (response === null) {
		throw new NodeOperationError(node, 'Sleeper resource was not found', {
			description: `${operation} returned no resource. Check the supplied identifier.`,
			itemIndex,
		});
	}

	if (!isJsonObject(response)) {
		throw unexpectedResponseError(
			node,
			operation,
			itemIndex,
			'Expected Sleeper to return a JSON object.',
		);
	}

	return [
		{
			json: response,
			pairedItem: { item: itemIndex },
		},
	];
}

export function toPlayerMapExecutionItems(
	node: INode,
	response: unknown,
	outputMode: SleeperPlayerOutputMode,
	itemIndex: number,
): INodeExecutionData[] {
	const operation = 'Player → Get Many';
	if (!isPlainRecord(response)) {
		throw unexpectedResponseError(
			node,
			operation,
			itemIndex,
			'Expected Sleeper to return a JSON object keyed by player ID.',
		);
	}

	if (outputMode === 'singleMap') {
		if (!isPlayerMap(response)) {
			throw unexpectedResponseError(
				node,
				operation,
				itemIndex,
				'Expected every player-map entry to be a JSON object.',
			);
		}

		return [
			{
				json: response,
				pairedItem: { item: itemIndex },
			},
		];
	}

	return Object.entries(response).map(([playerId, player]) => {
		if (!isJsonObject(player)) {
			throw unexpectedResponseError(
				node,
				operation,
				itemIndex,
				'Expected every player-map entry to be a JSON object.',
			);
		}

		return {
			json: Object.prototype.hasOwnProperty.call(player, 'player_id')
				? player
				: { player_id: playerId, ...player },
			pairedItem: { item: itemIndex },
		};
	});
}

export function ensureExecutionError(
	node: INode,
	error: unknown,
	itemIndex: number,
): NodeApiError | NodeOperationError {
	if (error instanceof NodeApiError || error instanceof NodeOperationError) {
		return error;
	}

	return new NodeOperationError(node, error instanceof Error ? error : 'Sleeper operation failed', {
		itemIndex,
	});
}

export function toErrorExecutionItem(
	error: NodeApiError | NodeOperationError,
	itemIndex: number,
): INodeExecutionData {
	return {
		json: {
			error: {
				message: error.message,
				...(error.description ? { description: error.description } : {}),
				...(error instanceof NodeApiError && error.httpCode ? { httpCode: error.httpCode } : {}),
			},
		},
		pairedItem: { item: itemIndex },
	};
}
