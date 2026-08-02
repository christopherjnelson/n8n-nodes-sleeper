import { NodeOperationError, type IExecuteFunctions } from 'n8n-workflow';

export type SleeperSport = 'nfl';
export type SleeperBracketType = 'winners' | 'losers';
export type SleeperAvatarSize = 'full' | 'thumbnail';
export type SleeperPlayerOutputMode = 'singleMap' | 'splitItems';
export type SleeperTrendType = 'add' | 'drop';

const MAX_POSITION_CODE_LENGTH = 16;
const MAX_SAFE_INTEGER_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

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

function containsControlCharacter(value: string): boolean {
	for (const character of value) {
		const codePoint = character.codePointAt(0);
		if (codePoint !== undefined && (codePoint <= 31 || codePoint === 127)) {
			return true;
		}
	}

	return false;
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

export function getBooleanParameter(
	context: IExecuteFunctions,
	parameterName: string,
	itemIndex: number,
	displayName: string,
	defaultValue: boolean,
): boolean {
	const value = context.getNodeParameter(parameterName, itemIndex, defaultValue);

	if (typeof value !== 'boolean') {
		throw invalidParameter(
			context,
			`${displayName} must be a boolean`,
			`Turn ${displayName} on or off rather than entering a custom value.`,
			itemIndex,
		);
	}

	return value;
}

export function getPositiveIntegerParameter(
	context: IExecuteFunctions,
	parameterName: string,
	itemIndex: number,
	displayName: string,
): string {
	const value = context.getNodeParameter(parameterName, itemIndex, '');
	let normalizedValue: string | undefined;

	if (typeof value === 'number') {
		if (Number.isSafeInteger(value) && value > 0) {
			normalizedValue = String(value);
		}
	} else if (typeof value === 'string') {
		const trimmedValue = value.trim();
		if (/^\d+$/.test(trimmedValue)) {
			const integerValue = BigInt(trimmedValue);
			if (integerValue > BigInt(0)) {
				normalizedValue = integerValue.toString(10);
			}
		}
	}

	if (normalizedValue === undefined) {
		throw invalidParameter(
			context,
			`${displayName} must be a positive integer`,
			`Enter ${displayName} as a whole number greater than zero.`,
			itemIndex,
		);
	}

	return normalizedValue;
}

export function getPositiveSafeIntegerParameter(
	context: IExecuteFunctions,
	parameterName: string,
	itemIndex: number,
	displayName: string,
): string {
	const value = context.getNodeParameter(parameterName, itemIndex, '');
	let normalizedValue: string | undefined;

	if (typeof value === 'number') {
		if (Number.isSafeInteger(value) && value > 0) {
			normalizedValue = String(value);
		}
	} else if (typeof value === 'string') {
		const trimmedValue = value.trim();
		if (/^\d+$/.test(trimmedValue)) {
			const integerValue = BigInt(trimmedValue);
			if (integerValue > BigInt(0) && integerValue <= MAX_SAFE_INTEGER_BIGINT) {
				normalizedValue = integerValue.toString(10);
			}
		}
	}

	if (normalizedValue === undefined) {
		throw invalidParameter(
			context,
			`${displayName} must be a positive safe integer`,
			`Enter ${displayName} as a whole number greater than zero and no greater than ${Number.MAX_SAFE_INTEGER}.`,
			itemIndex,
		);
	}

	return normalizedValue;
}

export function getOptionalPositionCode(
	context: IExecuteFunctions,
	parameterName: string,
	itemIndex: number,
): string | undefined {
	const value = context.getNodeParameter(parameterName, itemIndex, '');

	if (typeof value !== 'string') {
		throw invalidParameter(
			context,
			'Position must be a string',
			'Enter an optional Sleeper fantasy-position code as text, such as QB.',
			itemIndex,
		);
	}

	if (containsControlCharacter(value)) {
		throw invalidParameter(
			context,
			'Position must be a valid fantasy-position code',
			'Position cannot contain control characters.',
			itemIndex,
		);
	}

	const position = value.trim().toUpperCase();
	if (position.length === 0) {
		return undefined;
	}

	if (position.length > MAX_POSITION_CODE_LENGTH || !/^[A-Z0-9_-]+$/.test(position)) {
		throw invalidParameter(
			context,
			'Position must be a valid fantasy-position code',
			`Use no more than ${MAX_POSITION_CODE_LENGTH} letters, digits, underscores, or hyphens without spaces or URL syntax.`,
			itemIndex,
		);
	}

	return position;
}

export function getPlayerOutputMode(
	context: IExecuteFunctions,
	parameterName: string,
	itemIndex: number,
): SleeperPlayerOutputMode {
	const outputMode = getRequiredTrimmedString(context, parameterName, itemIndex, 'Output Mode');

	if (outputMode !== 'singleMap' && outputMode !== 'splitItems') {
		throw invalidParameter(
			context,
			'Unsupported player output mode',
			'Choose either Single Map or One Item per Player.',
			itemIndex,
		);
	}

	return outputMode;
}

export function getTrendType(
	context: IExecuteFunctions,
	parameterName: string,
	itemIndex: number,
): SleeperTrendType {
	const trendType = getRequiredTrimmedString(context, parameterName, itemIndex, 'Trend Type');

	if (trendType !== 'add' && trendType !== 'drop') {
		throw invalidParameter(
			context,
			'Unsupported trend type',
			'Choose either Adds or Drops.',
			itemIndex,
		);
	}

	return trendType;
}

export function getAvatarSize(
	context: IExecuteFunctions,
	parameterName: string,
	itemIndex: number,
): SleeperAvatarSize {
	const avatarSize = getRequiredTrimmedString(context, parameterName, itemIndex, 'Image Size');

	if (avatarSize !== 'full' && avatarSize !== 'thumbnail') {
		throw invalidParameter(
			context,
			'Unsupported avatar image size',
			'Choose either Full Size or Thumbnail.',
			itemIndex,
		);
	}

	return avatarSize;
}

export function getBracketType(
	context: IExecuteFunctions,
	parameterName: string,
	itemIndex: number,
): SleeperBracketType {
	const bracketType = getRequiredTrimmedString(context, parameterName, itemIndex, 'Bracket Type');

	if (bracketType !== 'winners' && bracketType !== 'losers') {
		throw invalidParameter(
			context,
			'Unsupported bracket type',
			'Choose either the winners or losers playoff bracket.',
			itemIndex,
		);
	}

	return bracketType;
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
