import { NodeOperationError, type IExecuteFunctions, type INode } from 'n8n-workflow';

export type SleeperSport = 'nfl' | 'nba' | 'nhl';
export type SleeperAvatarSize = 'full' | 'thumbnail';

function invalidParameter(
	context: Pick<IExecuteFunctions, 'getNode'>,
	message: string,
	description: string,
	itemIndex: number,
): NodeOperationError {
	return new NodeOperationError(context.getNode(), message, {
		description,
		itemIndex,
	});
}

export function validateRequiredTrimmedString(
	context: { getNode(): INode },
	value: unknown,
	displayName: string,
	itemIndex: number,
): string {
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

export function validateSleeperSport(
	context: Pick<IExecuteFunctions, 'getNode'>,
	value: unknown,
	itemIndex: number,
	allowedSports: readonly SleeperSport[],
): SleeperSport {
	const sport = validateRequiredTrimmedString(context, value, 'Sport', itemIndex);
	if (!allowedSports.includes(sport as SleeperSport)) {
		throw invalidParameter(
			context,
			'Unsupported sport',
			`Choose one of the supported sports: ${allowedSports.join(', ')}.`,
			itemIndex,
		);
	}

	return sport as SleeperSport;
}
