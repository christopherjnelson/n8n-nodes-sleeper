export const DEV_PORT: '5690';
export function createDevProcessOptions(
	environment?: Record<string, string | undefined>,
	arguments_?: string[],
): { arguments: string[]; environment: Record<string, string | undefined> };
