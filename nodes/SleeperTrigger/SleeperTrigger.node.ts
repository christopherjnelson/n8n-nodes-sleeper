import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
} from 'n8n-workflow';

import { sleeperApiRequest } from '../Sleeper/transport/sleeperApiRequest';
import { validateRequiredTrimmedString } from '../Sleeper/utils/validation';
import { LEAGUE_STATUS_CHANGED_EVENT, pollLeagueStatusChanged } from './leagueStatusChanged';
import { NFL_WEEK_CHANGED_EVENT, pollNflWeekChanged } from './nflWeekChanged';
import { pollTransactionChanged, TRANSACTION_CHANGED_EVENT } from './transactionChanged';

const DRAFT_PICK_MADE_EVENT = 'draftPickMade';
const DRAFT_PICK_EVENT_NAME = 'draft.pick_made';

interface DraftPick extends IDataObject {
	pick_no: number;
}

interface SleeperTriggerStaticData extends IDataObject {
	configurationFingerprint: string;
	highestObservedPickNo: number;
}

function isPlainObject(value: unknown): value is IDataObject {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function validateDraftPicks(
	node: ReturnType<IPollFunctions['getNode']>,
	response: unknown,
): DraftPick[] {
	if (!Array.isArray(response)) {
		throw new NodeOperationError(node, 'Unexpected response from Sleeper for Draft Pick Made', {
			description: 'Expected the draft-picks endpoint to return an array.',
		});
	}

	const picks = response.map((candidate, index) => {
		if (!isPlainObject(candidate)) {
			throw new NodeOperationError(node, 'Unexpected response from Sleeper for Draft Pick Made', {
				description: `Expected draft pick ${index + 1} to be a plain object.`,
			});
		}

		if (!Number.isSafeInteger(candidate.pick_no) || (candidate.pick_no as number) <= 0) {
			throw new NodeOperationError(node, 'Unexpected response from Sleeper for Draft Pick Made', {
				description: `Expected draft pick ${index + 1} to contain a positive safe-integer pick_no.`,
			});
		}

		return candidate as DraftPick;
	});

	return picks.sort((left, right) => left.pick_no - right.pick_no);
}

function getMaximumPickNumber(picks: readonly DraftPick[]): number {
	return picks.length === 0 ? 0 : picks[picks.length - 1].pick_no;
}

function hasCompatibleState(
	staticData: IDataObject,
	configurationFingerprint: string,
): staticData is SleeperTriggerStaticData {
	return (
		staticData.configurationFingerprint === configurationFingerprint &&
		Number.isSafeInteger(staticData.highestObservedPickNo) &&
		(staticData.highestObservedPickNo as number) >= 0
	);
}

function toTriggerItems(picks: readonly DraftPick[], observedAt: string): INodeExecutionData[] {
	return picks.map((pick) => ({
		json: {
			...pick,
			event: DRAFT_PICK_EVENT_NAME,
			observed_at: observedAt,
		},
	}));
}

// Polling triggers cannot be invoked as action tools by an AI agent.
export class SleeperTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sleeper Trigger',
		name: 'sleeperTrigger',
		icon: { light: 'file:sleeper.png', dark: 'file:sleeper.dark.png' },
		group: ['trigger'],
		version: 1,
		subtitle: 'Polling',
		description:
			'Starts the workflow when a documented public Sleeper event is observed by polling',
		defaults: {
			name: 'Sleeper Trigger',
		},
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: DRAFT_PICK_MADE_EVENT,
				options: [
					{
						name: 'Draft Pick Made',
						value: DRAFT_PICK_MADE_EVENT,
						description: 'When a new pick appears in a draft',
					},
					{
						name: 'Transaction Created or Updated',
						value: TRANSACTION_CHANGED_EVENT,
						description: 'When a transaction ID appears or its status_updated timestamp increases',
					},
					{
						name: 'League Status Changed',
						value: LEAGUE_STATUS_CHANGED_EVENT,
						description: 'When a league advances to a later documented lifecycle status',
					},
					{
						name: 'NFL Week Changed',
						value: NFL_WEEK_CHANGED_EVENT,
						description: "When Sleeper's global NFL week context advances",
					},
				],
			},
			{
				displayName: 'Draft ID',
				name: 'draftId',
				type: 'string',
				required: true,
				default: '',
				description: 'Sleeper draft ID to watch, preserved as an exact string',
				displayOptions: {
					show: {
						event: [DRAFT_PICK_MADE_EVENT],
					},
				},
			},
			{
				displayName: 'League ID',
				name: 'leagueId',
				type: 'string',
				required: true,
				default: '',
				description: 'The exact opaque Sleeper league ID, handled as text to preserve every digit',
				displayOptions: {
					show: {
						event: [TRANSACTION_CHANGED_EVENT, LEAGUE_STATUS_CHANGED_EVENT],
					},
				},
			},
			{
				displayName: 'Round or Week',
				name: 'round',
				type: 'number',
				required: true,
				default: 1,
				typeOptions: {
					minValue: 1,
					numberStepSize: 1,
				},
				description:
					"Sleeper's round path parameter. For NFL leagues this commonly corresponds to the week; the current week is not selected automatically.",
				displayOptions: {
					show: {
						event: [TRANSACTION_CHANGED_EVENT],
					},
				},
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const event = validateRequiredTrimmedString(
			this,
			this.getNodeParameter('event', DRAFT_PICK_MADE_EVENT),
			'Event',
			0,
		);
		if (event === TRANSACTION_CHANGED_EVENT) {
			return await pollTransactionChanged(this);
		}
		if (event === LEAGUE_STATUS_CHANGED_EVENT) {
			return await pollLeagueStatusChanged(this);
		}
		if (event === NFL_WEEK_CHANGED_EVENT) {
			return await pollNflWeekChanged(this);
		}

		if (event !== DRAFT_PICK_MADE_EVENT) {
			throw new NodeOperationError(this.getNode(), 'Unsupported Sleeper trigger event', {
				description: 'Choose a supported Sleeper trigger event.',
			});
		}

		const draftId = validateRequiredTrimmedString(
			this,
			this.getNodeParameter('draftId', ''),
			'Draft ID',
			0,
		);
		const configurationFingerprint = JSON.stringify([event, draftId]);
		const response = await sleeperApiRequest.call(this, {
			pathSegments: ['draft', draftId, 'picks'],
			itemIndex: 0,
			operation: 'Sleeper Trigger → Draft Pick Made',
		});
		const picks = validateDraftPicks(this.getNode(), response);
		const currentMaximum = getMaximumPickNumber(picks);

		if (this.getMode() === 'manual') {
			if (picks.length === 0) {
				return null;
			}

			return [toTriggerItems([picks[picks.length - 1]], new Date().toISOString())];
		}

		const staticData = this.getWorkflowStaticData('node');
		if (!hasCompatibleState(staticData, configurationFingerprint)) {
			delete staticData.transactionStatusById;
			delete staticData.highestObservedLeagueStatus;
			delete staticData.highestObservedNflWeekCursor;
			staticData.configurationFingerprint = configurationFingerprint;
			staticData.highestObservedPickNo = currentMaximum;
			return null;
		}

		if (currentMaximum <= staticData.highestObservedPickNo) {
			return null;
		}

		const newPicks = picks.filter((pick) => pick.pick_no > staticData.highestObservedPickNo);
		staticData.highestObservedPickNo = currentMaximum;
		if (newPicks.length === 0) {
			return null;
		}

		const observedAt = new Date().toISOString();
		return [toTriggerItems(newPicks, observedAt)];
	}
}
