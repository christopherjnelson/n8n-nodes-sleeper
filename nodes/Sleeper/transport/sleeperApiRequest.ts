import {
	NodeApiError,
	type IDataObject,
	type INode,
	type JsonObject,
	type RequestHelperFunctions,
} from 'n8n-workflow';

export const SLEEPER_API_BASE_URL = 'https://api.sleeper.app/v1';
export const SLEEPER_API_TIMEOUT_MS = 30_000;

export type SleeperQueryValue = string | number | boolean | undefined;

export interface SleeperApiRequestOptions {
	pathSegments: readonly string[];
	query?: Readonly<Record<string, SleeperQueryValue>>;
	itemIndex: number;
	operation: string;
}

export interface SleeperApiRequestContext {
	getNode(): INode;
	helpers: Pick<RequestHelperFunctions, 'httpRequest'>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getNestedValue(value: unknown, keys: readonly string[]): unknown {
	let current = value;

	for (const key of keys) {
		if (!isRecord(current)) {
			return undefined;
		}

		current = current[key];
	}

	return current;
}

function getStringValue(value: unknown): string | undefined {
	if (typeof value === 'string' && value.length > 0) {
		return value;
	}

	if (typeof value === 'number' && Number.isFinite(value)) {
		return String(value);
	}

	return undefined;
}

function getStatusCode(error: unknown): string | undefined {
	const candidates = [
		getNestedValue(error, ['statusCode']),
		getNestedValue(error, ['httpCode']),
		getNestedValue(error, ['response', 'statusCode']),
		getNestedValue(error, ['response', 'status']),
	];

	for (const candidate of candidates) {
		const value = getStringValue(candidate);
		if (value !== undefined) {
			return value;
		}
	}

	return undefined;
}

function getRetryAfter(error: unknown): string | undefined {
	const headers = getNestedValue(error, ['response', 'headers']);
	if (!isRecord(headers)) {
		return undefined;
	}

	return getStringValue(headers['retry-after'] ?? headers['Retry-After']);
}

function truncate(value: string, maximumLength = 500): string {
	return value.length <= maximumLength ? value : `${value.slice(0, maximumLength)}...`;
}

function getSafeResponseContext(error: unknown): string | undefined {
	const body =
		getNestedValue(error, ['response', 'body']) ??
		getNestedValue(error, ['response', 'data']) ??
		getNestedValue(error, ['body']);

	if (typeof body === 'string') {
		return truncate(body.trim());
	}

	if (body === undefined || body === null) {
		return undefined;
	}

	try {
		return truncate(JSON.stringify(body));
	} catch {
		return undefined;
	}
}

function isTimeoutError(error: unknown): boolean {
	const code = getStringValue(getNestedValue(error, ['code']));
	const message =
		error instanceof Error ? error.message : getStringValue(getNestedValue(error, ['message']));

	return (
		code === 'ETIMEDOUT' ||
		code === 'ESOCKETTIMEDOUT' ||
		(message?.toLowerCase().includes('timeout') ?? false) ||
		(message?.toLowerCase().includes('timed out') ?? false)
	);
}

function getErrorDetails(
	error: unknown,
	operation: string,
): {
	message: string;
	description: string;
	httpCode?: string;
	retryAfter?: string;
} {
	const httpCode = getStatusCode(error);
	const responseContext = getSafeResponseContext(error);
	const retryAfter = getRetryAfter(error);
	const safeSuffix = responseContext ? ` Sleeper response: ${responseContext}` : '';

	switch (httpCode) {
		case '400':
			return {
				message: 'Sleeper rejected the request',
				description: `${operation} was rejected as invalid.${safeSuffix}`,
				httpCode,
			};
		case '404':
			return {
				message: 'Sleeper resource was not found',
				description: `${operation} could not find the requested resource.${safeSuffix}`,
				httpCode,
			};
		case '429': {
			const retryDescription = retryAfter ? ` Retry after ${retryAfter}.` : '';
			return {
				message: 'Sleeper rate limit exceeded',
				description: `Reduce request or polling frequency; Sleeper advises staying under approximately 1,000 calls per minute.${retryDescription}`,
				httpCode,
				retryAfter,
			};
		}
		case '500':
		case '503':
			return {
				message: 'Sleeper service failure',
				description: `${operation} failed because the Sleeper service returned HTTP ${httpCode}.${safeSuffix}`,
				httpCode,
			};
		default:
			if (isTimeoutError(error)) {
				return {
					message: 'Sleeper request timed out',
					description: `${operation} did not receive a response within ${SLEEPER_API_TIMEOUT_MS / 1_000} seconds.`,
				};
			}

			if (httpCode === undefined) {
				return {
					message: 'Could not connect to Sleeper',
					description: `${operation} failed before Sleeper returned an HTTP response.`,
				};
			}

			return {
				message: 'Sleeper API request failed',
				description: `${operation} failed with HTTP ${httpCode}.${safeSuffix}`,
				httpCode,
			};
	}
}

export function buildSleeperUrl(pathSegments: readonly string[]): string {
	return `${SLEEPER_API_BASE_URL}/${pathSegments.map((segment) => encodeURIComponent(segment)).join('/')}`;
}

export function buildQueryParameters(
	query: Readonly<Record<string, SleeperQueryValue>> | undefined,
): IDataObject | undefined {
	if (query === undefined) {
		return undefined;
	}

	const definedQuery: IDataObject = {};
	for (const [key, value] of Object.entries(query)) {
		if (value !== undefined) {
			definedQuery[key] = value;
		}
	}

	return Object.keys(definedQuery).length > 0 ? definedQuery : undefined;
}

export async function sleeperApiRequest(
	this: SleeperApiRequestContext,
	options: SleeperApiRequestOptions,
): Promise<unknown> {
	const query = buildQueryParameters(options.query);

	try {
		return await this.helpers.httpRequest({
			method: 'GET',
			url: buildSleeperUrl(options.pathSegments),
			...(query === undefined ? {} : { qs: query }),
			json: true,
			timeout: SLEEPER_API_TIMEOUT_MS,
		});
	} catch (error: unknown) {
		const details = getErrorDetails(error, options.operation);
		const errorResponse: JsonObject = {
			message: details.message,
			description: details.description,
			...(details.httpCode === undefined ? {} : { httpCode: details.httpCode }),
			...(details.retryAfter === undefined ? {} : { retryAfter: details.retryAfter }),
		};

		const nodeApiError = new NodeApiError(this.getNode(), errorResponse, {
			message: details.message,
			description: details.description,
			httpCode: details.httpCode,
			itemIndex: options.itemIndex,
		});

		if (details.retryAfter !== undefined) {
			nodeApiError.context.retryAfter = details.retryAfter;
		}

		throw nodeApiError;
	}
}
