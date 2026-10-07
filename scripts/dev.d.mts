export const DEV_PORT: '5690';
export const DEV_BROKER_PORT: '5691';
export function createDevProcessOptions(
	environment?: Record<string, string | undefined>,
	arguments_?: string[],
): { arguments: string[]; environment: Record<string, string | undefined> };
