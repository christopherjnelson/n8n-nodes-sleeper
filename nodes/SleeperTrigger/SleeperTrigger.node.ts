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
// eslint-disable-next-line @n8n/community-nodes/node-usable-as-tool
export class SleeperTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sleeper Trigger',
		name: 'sleeperTrigger',
		icon: { light: 'file:sleeper.svg', dark: 'file:sleeper.dark.svg' },
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
				],
			},
			{
				displayName: 'Draft ID',
				name: 'draftId',
				type: 'string',
				required: true,
				default: '',
				description: 'Sleeper draft ID to watch, preserved as an exact string',
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
		if (event !== DRAFT_PICK_MADE_EVENT) {
			throw new NodeOperationError(this.getNode(), 'Unsupported Sleeper trigger event', {
				description: 'Draft Pick Made is the only event supported by this node version.',
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
