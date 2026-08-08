import {
	NodeOperationError,
	type IDataObject,
	type INodeExecutionData,
	type IPollFunctions,
} from 'n8n-workflow';

import { sleeperApiRequest } from '../Sleeper/transport/sleeperApiRequest';

export const NFL_WEEK_CHANGED_EVENT = 'nflWeekChanged';
export const NFL_WEEK_CHANGED_EVENT_NAME = 'nfl.week_changed';
export const NFL_SEASON_TYPES = ['pre', 'regular', 'post'] as const;

export type NflSeasonType = (typeof NFL_SEASON_TYPES)[number];

export interface NflWeekCursor extends IDataObject {
	season: string;
	seasonType: NflSeasonType;
	week: number;
}

interface SleeperNflState extends IDataObject {
	season: string;
	season_type: NflSeasonType;
	week: number;
}

interface NflWeekStaticData extends IDataObject {
	configurationFingerprint: string;
	highestObservedNflWeekCursor: NflWeekCursor;
}

function isPlainObject(value: unknown): value is IDataObject {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function isSeasonType(value: unknown): value is NflSeasonType {
	return typeof value === 'string' && NFL_SEASON_TYPES.includes(value as NflSeasonType);
}

function isValidSeason(value: unknown): value is string {
	return typeof value === 'string' && /^\d+$/.test(value);
}

function isValidWeek(value: unknown): value is number {
	return Number.isSafeInteger(value) && (value as number) >= 0;
}

function unexpectedNflState(context: IPollFunctions, description: string): NodeOperationError {
	return new NodeOperationError(
		context.getNode(),
		'Unexpected response from Sleeper for NFL Week Changed',
		{
			description,
		},
	);
}

export function validateNflStateResponse(
	context: IPollFunctions,
	response: unknown,
): SleeperNflState {
	if (!isPlainObject(response)) {
		throw unexpectedNflState(context, 'Expected the NFL state endpoint to return a plain object.');
	}

	if (!isValidSeason(response.season)) {
		throw unexpectedNflState(
			context,
			'Expected season to be a non-empty string containing decimal digits only.',
		);
	}

	if (!isSeasonType(response.season_type)) {
		throw unexpectedNflState(
			context,
			`Expected season_type to be exactly one of: ${NFL_SEASON_TYPES.join(', ')}.`,
		);
	}

	if (!isValidWeek(response.week)) {
		throw unexpectedNflState(context, 'Expected week to be a non-negative safe integer.');
	}

	return response as SleeperNflState;
}

export function getNflSeasonTypeRank(seasonType: NflSeasonType): number {
	return NFL_SEASON_TYPES.indexOf(seasonType);
}

export function compareNflWeekCursors(left: NflWeekCursor, right: NflWeekCursor): number {
	const leftSeason = BigInt(left.season);
	const rightSeason = BigInt(right.season);
	if (leftSeason !== rightSeason) {
		return leftSeason < rightSeason ? -1 : 1;
	}

	const phaseDifference =
		getNflSeasonTypeRank(left.seasonType) - getNflSeasonTypeRank(right.seasonType);
	if (phaseDifference !== 0) {
		return phaseDifference < 0 ? -1 : 1;
	}

	if (left.week === right.week) return 0;
	return left.week < right.week ? -1 : 1;
}

function toCursor(state: SleeperNflState): NflWeekCursor {
	return {
		season: state.season,
		seasonType: state.season_type,
		week: state.week,
	};
}

function isValidSavedCursor(value: unknown): value is NflWeekCursor {
	return (
		isPlainObject(value) &&
		isValidSeason(value.season) &&
		isSeasonType(value.seasonType) &&
		isValidWeek(value.week)
	);
}

function hasCompatibleState(
	staticData: IDataObject,
	configurationFingerprint: string,
): staticData is NflWeekStaticData {
	return (
		staticData.configurationFingerprint === configurationFingerprint &&
		isValidSavedCursor(staticData.highestObservedNflWeekCursor)
	);
}

function replaceState(
	staticData: IDataObject,
	configurationFingerprint: string,
	cursor: NflWeekCursor,
): void {
	delete staticData.highestObservedPickNo;
	delete staticData.transactionStatusById;
	delete staticData.highestObservedLeagueStatus;
	staticData.configurationFingerprint = configurationFingerprint;
	staticData.highestObservedNflWeekCursor = cursor;
}

function toTriggerItem(state: SleeperNflState, observedAt: string): INodeExecutionData {
	return {
		json: {
			...state,
			event: NFL_WEEK_CHANGED_EVENT_NAME,
			observed_at: observedAt,
		},
	};
}

export async function pollNflWeekChanged(
	context: IPollFunctions,
): Promise<INodeExecutionData[][] | null> {
	const configurationFingerprint = JSON.stringify([NFL_WEEK_CHANGED_EVENT, 'nfl']);
	const response = await sleeperApiRequest.call(context, {
		pathSegments: ['state', 'nfl'],
		itemIndex: 0,
		operation: 'Sleeper Trigger → NFL Week Changed',
	});
	const nflState = validateNflStateResponse(context, response);
	const currentCursor = toCursor(nflState);

	if (context.getMode() === 'manual') {
		return [[toTriggerItem(nflState, new Date().toISOString())]];
	}

	const staticData = context.getWorkflowStaticData('node');
	if (!hasCompatibleState(staticData, configurationFingerprint)) {
		replaceState(staticData, configurationFingerprint, currentCursor);
		return null;
	}

	if (compareNflWeekCursors(currentCursor, staticData.highestObservedNflWeekCursor) <= 0) {
		return null;
	}

	const outputItem = toTriggerItem(nflState, new Date().toISOString());
	replaceState(staticData, configurationFingerprint, currentCursor);
	return [[outputItem]];
}
