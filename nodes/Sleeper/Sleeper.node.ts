import {
	NodeConnectionTypes,
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { sleeperProperties } from './descriptions';
import { sleeperApiRequest } from './transport/sleeperApiRequest';
import { createAvatarResult } from './utils/avatar';
import {
	ensureExecutionError,
	toErrorExecutionItem,
	toExecutionItems,
	toPlayerMapExecutionItems,
} from './utils/output';
import {
	getAvatarSize,
	getBracketType,
	getBooleanParameter,
	getOptionalPositionCode,
	getPlayerOutputMode,
	getPositiveIntegerParameter,
	getPositiveSafeIntegerParameter,
	getRequiredTrimmedString,
	getSeason,
	getSleeperId,
	getSport,
	getTrendType,
	type SleeperPlayerOutputMode,
} from './utils/validation';

interface SleeperOperationRequest {
	pathSegments: string[];
	query?: Readonly<Record<string, string | boolean | undefined>>;
	responseShape: 'array' | 'object' | 'playerMap';
	playerOutputMode?: SleeperPlayerOutputMode;
	context: string;
}

function unsupportedSelection(
	context: IExecuteFunctions,
	resource: string,
	operation: string,
	itemIndex: number,
): NodeOperationError {
	return new NodeOperationError(context.getNode(), 'Unsupported Sleeper operation', {
		description: `The combination ${resource} → ${operation} is not available in this node version.`,
		itemIndex,
	});
}

function getOperationRequest(
	context: IExecuteFunctions,
	resource: string,
	operation: string,
	itemIndex: number,
): SleeperOperationRequest {
	if (resource === 'player' && operation === 'getMany') {
		const sport = getSport(context, 'sport', itemIndex);
		const activeOnly = getBooleanParameter(context, 'activeOnly', itemIndex, 'Active Only', true);
		const position = getOptionalPositionCode(context, 'position', itemIndex);
		const outputMode = getPlayerOutputMode(context, 'outputMode', itemIndex);

		return {
			pathSegments: ['players', sport],
			query: {
				active: activeOnly ? true : undefined,
				position,
			},
			responseShape: 'playerMap',
			playerOutputMode: outputMode,
			context: 'Player → Get Many',
		};
	}

	if (resource === 'player' && operation === 'getTrending') {
		const sport = getSport(context, 'sport', itemIndex);
		const trendType = getTrendType(context, 'trendType', itemIndex);
		const lookbackHours = getPositiveSafeIntegerParameter(
			context,
			'lookbackHours',
			itemIndex,
			'Lookback Hours',
		);
		const limit = getPositiveSafeIntegerParameter(context, 'resultLimit', itemIndex, 'Limit');

		return {
			pathSegments: ['players', sport, 'trending', trendType],
			query: {
				lookback_hours: lookbackHours,
				limit,
			},
			responseShape: 'array',
			context: 'Player → Get Trending',
		};
	}

	if (resource === 'draft' && operation === 'get') {
		const draftId = getSleeperId(context, 'draftId', itemIndex, 'Draft ID');

		return {
			pathSegments: ['draft', draftId],
			responseShape: 'object',
			context: 'Draft → Get',
		};
	}

	if (resource === 'draft' && operation === 'getManyForLeague') {
		const leagueId = getSleeperId(context, 'leagueId', itemIndex, 'League ID');

		return {
			pathSegments: ['league', leagueId, 'drafts'],
			responseShape: 'array',
			context: 'Draft → Get Many for League',
		};
	}

	if (resource === 'draft' && operation === 'getManyForUser') {
		const userId = getSleeperId(context, 'userId', itemIndex, 'User ID');
		const sport = getSport(context, 'sport', itemIndex);
		const season = getSeason(context, 'season', itemIndex);

		return {
			pathSegments: ['user', userId, 'drafts', sport, season],
			responseShape: 'array',
			context: 'Draft → Get Many for User',
		};
	}

	if (resource === 'draftPick' && operation === 'getMany') {
		const draftId = getSleeperId(context, 'draftId', itemIndex, 'Draft ID');

		return {
			pathSegments: ['draft', draftId, 'picks'],
			responseShape: 'array',
			context: 'Draft Pick → Get Many',
		};
	}

	if (resource === 'draftTradedPick' && operation === 'getMany') {
		const draftId = getSleeperId(context, 'draftId', itemIndex, 'Draft ID');

		return {
			pathSegments: ['draft', draftId, 'traded_picks'],
			responseShape: 'array',
			context: 'Draft Traded Pick → Get Many',
		};
	}

	if (resource === 'user' && operation === 'get') {
		const usernameOrUserId = getRequiredTrimmedString(
			context,
			'usernameOrUserId',
			itemIndex,
			'Username or User ID',
		);

		return {
			pathSegments: ['user', usernameOrUserId],
			responseShape: 'object',
			context: 'User → Get',
		};
	}

	if (resource === 'league' && operation === 'get') {
		const leagueId = getSleeperId(context, 'leagueId', itemIndex, 'League ID');

		return {
			pathSegments: ['league', leagueId],
			responseShape: 'object',
			context: 'League → Get',
		};
	}

	if (resource === 'league' && operation === 'getManyForUser') {
		const userId = getSleeperId(context, 'userId', itemIndex, 'User ID');
		const sport = getSport(context, 'sport', itemIndex);
		const season = getSeason(context, 'season', itemIndex);

		return {
			pathSegments: ['user', userId, 'leagues', sport, season],
			responseShape: 'array',
			context: 'League → Get Many for User',
		};
	}

	if (resource === 'leagueUser' && operation === 'getMany') {
		const leagueId = getSleeperId(context, 'leagueId', itemIndex, 'League ID');

		return {
			pathSegments: ['league', leagueId, 'users'],
			responseShape: 'array',
			context: 'League User → Get Many',
		};
	}

	if (resource === 'roster' && operation === 'getMany') {
		const leagueId = getSleeperId(context, 'leagueId', itemIndex, 'League ID');

		return {
			pathSegments: ['league', leagueId, 'rosters'],
			responseShape: 'array',
			context: 'Roster → Get Many',
		};
	}

	if (resource === 'matchup' && operation === 'getMany') {
		const leagueId = getSleeperId(context, 'leagueId', itemIndex, 'League ID');
		const week = getPositiveIntegerParameter(context, 'week', itemIndex, 'Week');

		return {
			pathSegments: ['league', leagueId, 'matchups', week],
			responseShape: 'array',
			context: 'Matchup → Get Many',
		};
	}

	if (resource === 'transaction' && operation === 'getMany') {
		const leagueId = getSleeperId(context, 'leagueId', itemIndex, 'League ID');
		const round = getPositiveIntegerParameter(context, 'round', itemIndex, 'Round or Week');

		return {
			pathSegments: ['league', leagueId, 'transactions', round],
			responseShape: 'array',
			context: 'Transaction → Get Many',
		};
	}

	if (resource === 'playoff' && operation === 'getBracket') {
		const leagueId = getSleeperId(context, 'leagueId', itemIndex, 'League ID');
		const bracketType = getBracketType(context, 'bracketType', itemIndex);
		const bracketPath = bracketType === 'winners' ? 'winners_bracket' : 'losers_bracket';

		return {
			pathSegments: ['league', leagueId, bracketPath],
			responseShape: 'array',
			context: 'Playoff → Get Bracket',
		};
	}

	if (resource === 'tradedPick' && operation === 'getMany') {
		const leagueId = getSleeperId(context, 'leagueId', itemIndex, 'League ID');

		return {
			pathSegments: ['league', leagueId, 'traded_picks'],
			responseShape: 'array',
			context: 'Traded Pick → Get Many',
		};
	}

	if (resource === 'sport' && operation === 'getState') {
		const sport = getSport(context, 'sport', itemIndex);

		return {
			pathSegments: ['state', sport],
			responseShape: 'object',
			context: 'Sport → Get State',
		};
	}

	throw unsupportedSelection(context, resource, operation, itemIndex);
}

export class Sleeper implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sleeper',
		name: 'sleeper',
		icon: { light: 'file:sleeper.svg', dark: 'file:sleeper.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Retrieve public Sleeper draft, user, league, player, roster, matchup, avatar URL, and NFL state data',
		defaults: {
			name: 'Sleeper',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: sleeperProperties,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const inputItems = this.getInputData();
		const outputItems: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < inputItems.length; itemIndex++) {
			try {
				const resource = getRequiredTrimmedString(this, 'resource', itemIndex, 'Resource');
				const operation = getRequiredTrimmedString(this, 'operation', itemIndex, 'Operation');

				if (resource === 'avatar') {
					if (operation !== 'getUrl') {
						throw unsupportedSelection(this, resource, operation, itemIndex);
					}

					const avatarId = getRequiredTrimmedString(this, 'avatarId', itemIndex, 'Avatar ID');
					const imageSize = getAvatarSize(this, 'imageSize', itemIndex);
					outputItems.push({
						json: createAvatarResult(avatarId, imageSize),
						pairedItem: { item: itemIndex },
					});
					continue;
				}

				const request = getOperationRequest(this, resource, operation, itemIndex);
				const response = await sleeperApiRequest.call(this, {
					pathSegments: request.pathSegments,
					query: request.query,
					itemIndex,
					operation: request.context,
				});

				if (request.responseShape === 'playerMap') {
					outputItems.push(
						...toPlayerMapExecutionItems(
							this.getNode(),
							response,
							request.playerOutputMode ?? 'singleMap',
							itemIndex,
						),
					);
				} else {
					outputItems.push(
						...toExecutionItems(
							this.getNode(),
							response,
							request.responseShape,
							itemIndex,
							request.context,
						),
					);
				}
			} catch (error: unknown) {
				const executionError = ensureExecutionError(this.getNode(), error, itemIndex);
				if (!this.continueOnFail()) {
					throw executionError;
				}

				outputItems.push(toErrorExecutionItem(executionError, itemIndex));
			}
		}

		return [outputItems];
	}
}
