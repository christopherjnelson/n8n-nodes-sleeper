import {
	NodeOperationError,
	type IHttpRequestOptions,
	type IExecuteSingleFunctions,
	type INodeProperties,
	type PostReceiveAction,
} from 'n8n-workflow';
import { validateSleeperSport } from '../utils/validation';
import { sportCapabilityForOperation, sportsForCapability } from '../utils/sports';

const requiredParameters: Record<string, readonly string[]> = {
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

const allowedValues: Record<string, readonly string[]> = {
	bracketType: ['winners', 'losers'],
	imageSize: ['full', 'thumbnail'],
	outputMode: ['singleMap', 'splitItems'],
	trendType: ['add', 'drop'],
};

function isBlank(value: unknown): boolean {
	return value === undefined || value === null || (typeof value === 'string' && !value.trim());
}

function isConfigured(value: unknown): boolean {
	return (
		value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== '')
	);
}

export async function validateSleeperRequest(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const resource = String(this.getNodeParameter('resource'));
	const operation = String(this.getNodeParameter('operation'));
	const itemIndex = this.getItemIndex();
	const key = `${resource}:${operation}`;
	const required = requiredParameters[key];

	if (!required) {
		throw new NodeOperationError(this.getNode(), 'Unsupported Sleeper operation', {
			description: `The combination ${resource} → ${operation} is not available in this node version.`,
		});
	}

	for (const parameter of required) {
		const value = this.getNodeParameter(parameter);
		if (isBlank(value)) {
			throw new NodeOperationError(this.getNode(), `${parameter} is required`, {
				description: `Provide ${parameter} before running ${resource} → ${operation}.`,
			});
		}
		const allowed = allowedValues[parameter];
		if (allowed && !allowed.includes(String(value))) {
			throw new NodeOperationError(this.getNode(), `${parameter} has an unsupported value`, {
				description: `${parameter} must be one of: ${allowed.join(', ')}.`,
			});
		}
	}

	const sportCapability = sportCapabilityForOperation(resource, operation);
	if (sportCapability) {
		const sport = validateSleeperSport(
			this,
			this.getNodeParameter('sport'),
			itemIndex,
			sportsForCapability(sportCapability),
		);
		if (resource === 'player' && operation === 'getMany' && sport === 'nhl') {
			const savedPosition = this.getNode().parameters.position;
			const evaluatedPosition = this.getNodeParameter('position', '');
			if (isConfigured(savedPosition) || isConfigured(evaluatedPosition)) {
				throw new NodeOperationError(this.getNode(), 'NHL position filtering is unavailable', {
					description:
						'Tested NHL position filters returned no players. Switch to NFL or NBA, clear Position, then choose NHL to retrieve the unfiltered player map.',
					itemIndex,
				});
			}
		}
	}

	for (const parameter of ['week', 'round', 'lookbackHours', 'resultLimit']) {
		if (!required.includes(parameter)) continue;
		const value = Number(this.getNodeParameter(parameter));
		if (!Number.isSafeInteger(value) || value < 1) {
			throw new NodeOperationError(this.getNode(), `${parameter} must be a positive integer`);
		}
	}

	if (required.includes('season')) {
		const season = String(this.getNodeParameter('season')).trim();
		if (!/^\d{4}$/.test(season)) {
			throw new NodeOperationError(this.getNode(), 'Season must be a four-digit year');
		}
	}

	return requestOptions;
}

type Routing = NonNullable<INodeProperties['routing']>;

export function sleeperRoute(
	url: string,
	options: {
		method?: 'GET' | 'HEAD';
		postReceive?: PostReceiveAction[];
		request?: Pick<IHttpRequestOptions, 'json' | 'encoding'>;
	} = {},
): Routing {
	return {
		request: {
			method: options.method ?? 'GET',
			url,
			...options.request,
		},
		send: {
			preSend: [validateSleeperRequest],
		},
		...(options.postReceive ? { output: { postReceive: options.postReceive } } : {}),
	};
}
