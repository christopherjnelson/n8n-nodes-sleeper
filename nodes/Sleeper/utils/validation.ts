import { NodeOperationError, type IExecuteFunctions } from 'n8n-workflow';

export type SleeperSport = 'nfl';

function invalidParameter(
	context: IExecuteFunctions,
	message: string,
	description: string,
	itemIndex: number,
): NodeOperationError {
	return new NodeOperationError(context.getNode(), message, {
		description,
		itemIndex,
	});
}

export function getRequiredTrimmedString(
	context: IExecuteFunctions,
	parameterName: string,
	itemIndex: number,
	displayName: string,
): string {
	const value = context.getNodeParameter(parameterName, itemIndex, '');

	if (typeof value !== 'string') {
		throw invalidParameter(
			context,
			`${displayName} must be a string`,
			`Provide ${displayName} as text so its exact value is preserved.`,
			itemIndex,
		);
	}

	const trimmedValue = value.trim();
	if (trimmedValue.length === 0) {
		throw invalidParameter(
			context,
			`${displayName} is required`,
			`Enter a non-empty value for ${displayName}.`,
			itemIndex,
		);
	}

	return trimmedValue;
}

export function getSleeperId(
	context: IExecuteFunctions,
	parameterName: string,
	itemIndex: number,
	displayName: string,
): string {
	return getRequiredTrimmedString(context, parameterName, itemIndex, displayName);
}

export function getSeason(
	context: IExecuteFunctions,
	parameterName: string,
	itemIndex: number,
): string {
	const value = context.getNodeParameter(parameterName, itemIndex, '');
	const season = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';

	if (!/^\d{4}$/.test(season)) {
		throw invalidParameter(
			context,
			'Season must be a four-digit year',
			'Enter a season using exactly four decimal digits, such as 2026.',
			itemIndex,
		);
	}

	return season;
}

export function getSport(
	context: IExecuteFunctions,
	parameterName: string,
	itemIndex: number,
): SleeperSport {
	const sport = getRequiredTrimmedString(context, parameterName, itemIndex, 'Sport');

	if (sport !== 'nfl') {
		throw invalidParameter(
			context,
			'Unsupported sport',
			'NFL is the only sport supported by this version of the Sleeper node.',
			itemIndex,
		);
	}

	return sport;
}
