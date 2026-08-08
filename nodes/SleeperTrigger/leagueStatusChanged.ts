import {
	NodeOperationError,
	type IDataObject,
	type INodeExecutionData,
	type IPollFunctions,
} from 'n8n-workflow';

import { sleeperApiRequest } from '../Sleeper/transport/sleeperApiRequest';
import { validateRequiredTrimmedString } from '../Sleeper/utils/validation';

export const LEAGUE_STATUS_CHANGED_EVENT = 'leagueStatusChanged';
export const LEAGUE_STATUS_CHANGED_EVENT_NAME = 'league.status_changed';
export const LEAGUE_STATUSES = ['pre_draft', 'drafting', 'in_season', 'complete'] as const;

export type LeagueStatus = (typeof LEAGUE_STATUSES)[number];

interface SleeperLeague extends IDataObject {
	status: LeagueStatus;
}

interface LeagueStatusStaticData extends IDataObject {
	configurationFingerprint: string;
	highestObservedLeagueStatus: LeagueStatus;
}

function isPlainObject(value: unknown): value is IDataObject {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function isLeagueStatus(value: unknown): value is LeagueStatus {
	return typeof value === 'string' && LEAGUE_STATUSES.includes(value as LeagueStatus);
}

function unexpectedLeagueResponse(
	context: IPollFunctions,
	description: string,
): NodeOperationError {
	return new NodeOperationError(
		context.getNode(),
		'Unexpected response from Sleeper for League Status Changed',
		{ description },
	);
}

function validateLeagueId(context: IPollFunctions, value: unknown): string {
	const leagueId = validateRequiredTrimmedString(context, value, 'League ID', 0);
	for (const character of leagueId) {
		const codePoint = character.codePointAt(0);
		if (codePoint !== undefined && (codePoint <= 31 || codePoint === 127)) {
			throw new NodeOperationError(context.getNode(), 'League ID must be a valid Sleeper ID', {
				description: 'League ID cannot contain control characters.',
				itemIndex: 0,
			});
		}
	}

	return leagueId;
}

export function validateLeagueResponse(context: IPollFunctions, response: unknown): SleeperLeague {
	if (!isPlainObject(response)) {
		throw unexpectedLeagueResponse(
			context,
			'Expected the league endpoint to return a plain object.',
		);
	}

	if (!isLeagueStatus(response.status)) {
		throw unexpectedLeagueResponse(
			context,
			`Expected status to be exactly one of: ${LEAGUE_STATUSES.join(', ')}.`,
		);
	}

	return response as SleeperLeague;
}

export function getLeagueStatusRank(status: LeagueStatus): number {
	return LEAGUE_STATUSES.indexOf(status);
}

function hasCompatibleState(
	staticData: IDataObject,
	configurationFingerprint: string,
): staticData is LeagueStatusStaticData {
	return (
		staticData.configurationFingerprint === configurationFingerprint &&
		isLeagueStatus(staticData.highestObservedLeagueStatus)
	);
}

function replaceState(
	staticData: IDataObject,
	configurationFingerprint: string,
	status: LeagueStatus,
): void {
	delete staticData.highestObservedPickNo;
	delete staticData.transactionStatusById;
	staticData.configurationFingerprint = configurationFingerprint;
	staticData.highestObservedLeagueStatus = status;
}

function toTriggerItem(league: SleeperLeague, observedAt: string): INodeExecutionData {
	return {
		json: {
			...league,
			event: LEAGUE_STATUS_CHANGED_EVENT_NAME,
			observed_at: observedAt,
		},
	};
}

export async function pollLeagueStatusChanged(
	context: IPollFunctions,
): Promise<INodeExecutionData[][] | null> {
	const leagueId = validateLeagueId(context, context.getNodeParameter('leagueId', ''));
	const configurationFingerprint = JSON.stringify([LEAGUE_STATUS_CHANGED_EVENT, leagueId]);
	const response = await sleeperApiRequest.call(context, {
		pathSegments: ['league', leagueId],
		itemIndex: 0,
		operation: 'Sleeper Trigger → League Status Changed',
	});
	const league = validateLeagueResponse(context, response);

	if (context.getMode() === 'manual') {
		return [[toTriggerItem(league, new Date().toISOString())]];
	}

	const staticData = context.getWorkflowStaticData('node');
	if (!hasCompatibleState(staticData, configurationFingerprint)) {
		replaceState(staticData, configurationFingerprint, league.status);
		return null;
	}

	if (
		getLeagueStatusRank(league.status) <=
		getLeagueStatusRank(staticData.highestObservedLeagueStatus)
	) {
		return null;
	}

	const outputItem = toTriggerItem(league, new Date().toISOString());
	replaceState(staticData, configurationFingerprint, league.status);
	return [[outputItem]];
}
