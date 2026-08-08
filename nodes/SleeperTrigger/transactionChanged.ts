import {
	NodeOperationError,
	type IDataObject,
	type INodeExecutionData,
	type IPollFunctions,
} from 'n8n-workflow';

import { sleeperApiRequest } from '../Sleeper/transport/sleeperApiRequest';
import { validateRequiredTrimmedString } from '../Sleeper/utils/validation';

export const TRANSACTION_CHANGED_EVENT = 'transactionChanged';
export const TRANSACTION_CHANGED_EVENT_NAME = 'transaction.changed';
export const MAX_TRACKED_TRANSACTION_IDS = 1_000;

interface SleeperTransaction extends IDataObject {
	transaction_id: string;
	status_updated: number;
}

interface TransactionStatusEntry extends IDataObject {
	transactionId: string;
	statusUpdated: number;
}

function compareTransactionIds(leftId: string, rightId: string): number {
	if (leftId === rightId) return 0;
	return leftId < rightId ? -1 : 1;
}

function isPlainObject(value: unknown): value is IDataObject {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function unexpectedTransactionResponse(
	context: IPollFunctions,
	description: string,
): NodeOperationError {
	return new NodeOperationError(
		context.getNode(),
		'Unexpected response from Sleeper for Transaction Created or Updated',
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

function validateRound(context: IPollFunctions, value: unknown): string {
	let round: string | undefined;
	if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
		round = String(value);
	} else if (typeof value === 'string') {
		const trimmedValue = value.trim();
		if (/^\d+$/.test(trimmedValue)) {
			const integerValue = BigInt(trimmedValue);
			if (integerValue > BigInt(0) && integerValue <= BigInt(Number.MAX_SAFE_INTEGER)) {
				round = integerValue.toString(10);
			}
		}
	}

	if (round === undefined) {
		throw new NodeOperationError(
			context.getNode(),
			'Round or Week must be a positive safe integer',
			{
				description: `Enter Round or Week as a whole number greater than zero and no greater than ${Number.MAX_SAFE_INTEGER}.`,
				itemIndex: 0,
			},
		);
	}

	return round;
}

export function validateTransactions(
	context: IPollFunctions,
	response: unknown,
): SleeperTransaction[] {
	if (!Array.isArray(response)) {
		throw unexpectedTransactionResponse(
			context,
			'Expected the league-transactions endpoint to return an array.',
		);
	}

	const transactionIds = new Set<string>();
	const transactions = response.map((candidate, index) => {
		if (!isPlainObject(candidate)) {
			throw unexpectedTransactionResponse(
				context,
				`Expected transaction ${index + 1} to be a plain object.`,
			);
		}

		if (typeof candidate.transaction_id !== 'string' || candidate.transaction_id.length === 0) {
			throw unexpectedTransactionResponse(
				context,
				`Expected transaction ${index + 1} to contain a non-empty string transaction_id.`,
			);
		}

		if (transactionIds.has(candidate.transaction_id)) {
			throw unexpectedTransactionResponse(
				context,
				`Transaction ID ${candidate.transaction_id} appears more than once in the response.`,
			);
		}
		transactionIds.add(candidate.transaction_id);

		if (
			!Number.isSafeInteger(candidate.status_updated) ||
			(candidate.status_updated as number) < 0
		) {
			throw unexpectedTransactionResponse(
				context,
				`Expected transaction ${index + 1} to contain a non-negative safe-integer status_updated.`,
			);
		}

		return candidate as SleeperTransaction;
	});

	if (transactions.length > MAX_TRACKED_TRANSACTION_IDS) {
		throw unexpectedTransactionResponse(
			context,
			`The response contains ${transactions.length} transaction IDs, exceeding the supported maximum of ${MAX_TRACKED_TRANSACTION_IDS}.`,
		);
	}

	return transactions.sort(
		(left, right) =>
			left.status_updated - right.status_updated ||
			compareTransactionIds(left.transaction_id, right.transaction_id),
	);
}

function getCompatibleState(
	staticData: IDataObject,
	configurationFingerprint: string,
): Map<string, number> | undefined {
	if (
		staticData.configurationFingerprint !== configurationFingerprint ||
		!Array.isArray(staticData.transactionStatusById) ||
		staticData.transactionStatusById.length > MAX_TRACKED_TRANSACTION_IDS
	) {
		return undefined;
	}

	const statusById = new Map<string, number>();
	for (const candidate of staticData.transactionStatusById) {
		if (
			!isPlainObject(candidate) ||
			typeof candidate.transactionId !== 'string' ||
			candidate.transactionId.length === 0 ||
			!Number.isSafeInteger(candidate.statusUpdated) ||
			(candidate.statusUpdated as number) < 0 ||
			statusById.has(candidate.transactionId)
		) {
			return undefined;
		}

		statusById.set(candidate.transactionId, candidate.statusUpdated as number);
	}

	return statusById;
}

function serializeStatusById(statusById: ReadonlyMap<string, number>): TransactionStatusEntry[] {
	return [...statusById]
		.sort(([leftId], [rightId]) => compareTransactionIds(leftId, rightId))
		.map(([transactionId, statusUpdated]) => ({ transactionId, statusUpdated }));
}

function replaceState(
	staticData: IDataObject,
	configurationFingerprint: string,
	statusById: ReadonlyMap<string, number>,
): void {
	delete staticData.highestObservedPickNo;
	delete staticData.highestObservedLeagueStatus;
	staticData.configurationFingerprint = configurationFingerprint;
	staticData.transactionStatusById = serializeStatusById(statusById);
}

function toTriggerItems(
	transactions: readonly SleeperTransaction[],
	observedAt: string,
): INodeExecutionData[] {
	return transactions.map((transaction) => ({
		json: {
			...transaction,
			event: TRANSACTION_CHANGED_EVENT_NAME,
			observed_at: observedAt,
		},
	}));
}

export async function pollTransactionChanged(
	context: IPollFunctions,
): Promise<INodeExecutionData[][] | null> {
	const leagueId = validateLeagueId(context, context.getNodeParameter('leagueId', ''));
	const round = validateRound(context, context.getNodeParameter('round', ''));
	const configurationFingerprint = JSON.stringify([TRANSACTION_CHANGED_EVENT, leagueId, round]);
	const response = await sleeperApiRequest.call(context, {
		pathSegments: ['league', leagueId, 'transactions', round],
		itemIndex: 0,
		operation: 'Sleeper Trigger → Transaction Created or Updated',
	});
	const transactions = validateTransactions(context, response);

	if (context.getMode() === 'manual') {
		if (transactions.length === 0) {
			return null;
		}

		return [toTriggerItems([transactions[transactions.length - 1]], new Date().toISOString())];
	}

	const staticData = context.getWorkflowStaticData('node');
	const savedStatusById = getCompatibleState(staticData, configurationFingerprint);
	if (savedStatusById === undefined) {
		const baseline = new Map(
			transactions.map((transaction) => [transaction.transaction_id, transaction.status_updated]),
		);
		replaceState(staticData, configurationFingerprint, baseline);
		return null;
	}

	const nextStatusById = new Map(savedStatusById);
	const changedTransactions: SleeperTransaction[] = [];
	for (const transaction of transactions) {
		const savedStatus = savedStatusById.get(transaction.transaction_id);
		if (savedStatus === undefined || transaction.status_updated > savedStatus) {
			changedTransactions.push(transaction);
			nextStatusById.set(transaction.transaction_id, transaction.status_updated);
		}
	}

	if (nextStatusById.size > MAX_TRACKED_TRANSACTION_IDS) {
		throw unexpectedTransactionResponse(
			context,
			`Tracking this response would require ${nextStatusById.size} transaction IDs, exceeding the supported maximum of ${MAX_TRACKED_TRANSACTION_IDS}.`,
		);
	}

	if (changedTransactions.length === 0) {
		return null;
	}

	const outputItems = toTriggerItems(changedTransactions, new Date().toISOString());
	replaceState(staticData, configurationFingerprint, nextStatusById);
	return [outputItems];
}
