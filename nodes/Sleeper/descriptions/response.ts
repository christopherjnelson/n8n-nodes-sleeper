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
			itemIndex: this.getItemIndex(),
		});
	}
	const controls = readPlayerOptions(this);
	const { outputMode, returnAll, limit } = controls;
	if (
		outputMode !== 'splitItems' &&
		!controls.team &&
		!controls.hasTeam &&
		!controls.playerIds &&
		!controls.outputFields.length &&
		returnAll
	) {
		return [{ json: playerMap, pairedItem: { item: this.getItemIndex() } }];
	}
	const isSplit = outputMode === 'splitItems';
	const selectedSort = controls.sortBy;
	const direction = controls.sortDirection === 'desc' ? -1 : 1;

	let players: Array<[string, IDataObject]> = [];
	for (const [playerId, player] of Object.entries(playerMap)) {
		if (!isDataObject(player)) {
			throw new NodeOperationError(this.getNode(), 'Sleeper returned an invalid player entry', {
				description: `Expected player map entry ${playerId} to be an object.`,
				itemIndex: this.getItemIndex(),
			});
		}
		if (
			controls.team &&
			(typeof player.team !== 'string' ||
				player.team.trim().toLowerCase() !== controls.team.toLowerCase())
		)
			continue;
		if (controls.hasTeam && (typeof player.team !== 'string' || !player.team.trim())) continue;
		if (controls.playerIds && !controls.playerIds.has(playerId)) continue;
		players.push([playerId, player]);
	}
	if (selectedSort) {
		players.sort(([leftId, left], [rightId, right]) => {
			const a: unknown =
				selectedSort === 'player_id' ? effectivePlayerId(leftId, left) : left[selectedSort];
			const b: unknown =
				selectedSort === 'player_id' ? effectivePlayerId(rightId, right) : right[selectedSort];
			const aMissing = a === null || a === undefined || a === '';
			const bMissing = b === null || b === undefined || b === '';
			if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1;
			const av = String(a).toLowerCase();
			const bv = String(b).toLowerCase();
			return (av < bv ? -1 : av > bv ? 1 : 0) * direction;
		});
	}
	if (!returnAll) players = players.slice(0, limit);
	if (controls.outputFields.length) {
		players = players.map(([playerId, player]) => {
			const projected: IDataObject = {};
			for (const field of controls.outputFields) {
				if (field === 'player_id' && !Object.prototype.hasOwnProperty.call(player, 'player_id')) {
					projected.player_id = playerId;
				} else if (Object.prototype.hasOwnProperty.call(player, field)) {
					projected[field] = player[field];
				}
			}
			projected.player_id = effectivePlayerId(playerId, player);
			return [playerId, projected];
		});
	}
	if (!isSplit) {
		const filtered = Object.fromEntries(
			players.map(([playerId, player]) => [playerId, player]),
		) as IDataObject;
		return [{ json: filtered, pairedItem: { item: this.getItemIndex() } }];
	}

	return players.map(([playerId, player]) => ({
		json: controls.outputFields.length
			? player
			: player.player_id
				? player
				: { ...player, player_id: playerId },
		pairedItem: { item: this.getItemIndex() },
	}));
}

function effectivePlayerId(playerId: string, player: IDataObject): IDataObject[string] {
	return player.player_id ? (player.player_id as IDataObject[string]) : playerId;
}

type ParsedPlayerOptions = {
	team: string;
	hasTeam: boolean;
	playerIds: Set<string> | undefined;
	outputFields: string[];
	sortBy: string;
	sortDirection: string;
	outputMode: string;
	returnAll: boolean;
	limit: number;
};

export function readPlayerOptions(context: IExecuteSingleFunctions): ParsedPlayerOptions {
	const modeValue = context.getNodeParameter('outputMode', 'singleMap');
	const outputMode = modeValue === 'splitItems' ? 'splitItems' : 'singleMap';
	const returnAllValue = context.getNodeParameter('returnAll', true);
	const returnAll = returnAllValue === undefined ? true : returnAllValue;
	const limitValue = returnAll === false ? context.getNodeParameter('limit', 50) : 50;
	const sortByValue = outputMode === 'splitItems' ? context.getNodeParameter('sortBy', '') : '';
	const sortBy = typeof sortByValue === 'string' ? sortByValue : '';
	const sortDirectionValue =
		outputMode === 'splitItems' && sortBy !== ''
			? context.getNodeParameter('sortDirection', 'asc')
			: 'asc';
	return parsePlayerOptions(
		context.getNodeParameter('playerOptions', {}),
		outputMode,
		returnAll,
		limitValue,
		sortByValue,
		sortDirectionValue,
		context,
		context.getItemIndex(),
	);
}

export function parsePlayerOptions(
	value: unknown,
	outputMode: unknown,
	returnAllValue: unknown,
	limitValue: unknown,
	sortByValue: unknown,
	sortDirectionValue: unknown,
	context: IExecuteSingleFunctions,
	itemIndex: number,
): ParsedPlayerOptions {
	const invalid = (message: string, description: string): never => {
		throw new NodeOperationError(context.getNode(), message, { description, itemIndex });
	};
	if (value !== undefined && !isDataObject(value))
		invalid(
			'Player Options has an invalid value',
			'Provide Player Options as a collection of named fields.',
		);
	const options = isDataObject(value) ? value : {};
	if (options.team !== undefined && typeof options.team !== 'string')
		invalid('Team must be text', 'Enter a team code as text.');
	if (options.hasTeam !== undefined && typeof options.hasTeam !== 'boolean')
		invalid('Has Team must be true or false', 'Choose a boolean value for Has Team.');
	if (options.playerIds !== undefined && typeof options.playerIds !== 'string')
		invalid('Player IDs must be text', 'Enter comma-separated player IDs as text.');
	if (options.outputFields !== undefined && typeof options.outputFields !== 'string')
		invalid('Output Fields must be text', 'Enter comma-separated field names as text.');
	if (returnAllValue !== undefined && typeof returnAllValue !== 'boolean')
		invalid('Return All must be true or false', 'Choose whether to return all matching players.');
	const returnAll = returnAllValue === undefined ? true : returnAllValue === true;
	if (limitValue !== undefined && typeof limitValue !== 'number')
		invalid('Limit must be a number', 'Enter Limit as a whole number greater than zero.');
	const limit = typeof limitValue === 'number' ? limitValue : 50;
	if (!returnAll && (!Number.isSafeInteger(limit) || limit < 1))
		invalid(
			'Limit must be a positive integer',
			'Set Limit to a whole number greater than zero when Return All is off.',
		);
	const team = typeof options.team === 'string' ? options.team.trim() : '';
	const hasTeam = options.hasTeam === true;
	const parsedPlayerIds =
		typeof options.playerIds === 'string'
			? [
					...new Set(
						options.playerIds
							.split(',')
							.map((id) => id.trim())
							.filter(Boolean),
					),
				]
			: [];
	const playerIds = parsedPlayerIds.length ? new Set(parsedPlayerIds) : undefined;
	const outputFields =
		typeof options.outputFields === 'string'
			? [
					...new Set(
						options.outputFields
							.split(',')
							.map((field) => field.trim())
							.filter(Boolean),
					),
				]
			: [];
	for (const field of outputFields) {
		if (
			!/^[A-Za-z][A-Za-z0-9_]*$/.test(field) ||
			['__proto__', 'prototype', 'constructor'].includes(field)
		) {
			invalid(
				'Output Fields contains an invalid field name',
				`"${field}" is not a supported flat field name. Use simple names such as full_name, team, or position.`,
			);
		}
	}
	const sorting = outputMode === 'splitItems';
	if (sorting && sortByValue !== undefined && typeof sortByValue !== 'string')
		invalid('Sort By must be text', 'Choose a supported sort field.');
	if (sorting && sortDirectionValue !== undefined && typeof sortDirectionValue !== 'string')
		invalid('Sort Direction has an invalid value', 'Choose Ascending or Descending.');
	const sortBy = sorting && typeof sortByValue === 'string' ? sortByValue : '';
	if (!['', 'full_name', 'team', 'position', 'player_id'].includes(sortBy)) {
		invalid(
			'Sort By has an unsupported value',
			'Choose None, Full Name, Team, Position, or Player ID.',
		);
	}
	const sortDirection = sorting && sortDirectionValue === 'desc' ? 'desc' : 'asc';
	if (
		sorting &&
		sortDirectionValue !== undefined &&
		!['asc', 'desc'].includes(String(sortDirectionValue))
	)
		invalid('Sort Direction has an unsupported value', 'Choose Ascending or Descending.');
	return {
		team,
		hasTeam,
		playerIds,
		outputFields,
		sortBy,
		sortDirection,
		outputMode: outputMode === 'splitItems' ? 'splitItems' : 'singleMap',
		returnAll,
		limit,
	};
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
