export const SCAN_TIMEOUT_MS: 360000;
export function scanPublishedPackage(options: {
	packageSpec: string;
	spawn?: (
		command: string,
		arguments_: string[],
		options: Record<string, unknown>,
	) => { status: number | null; stdout?: string; stderr?: string; error?: Error };
	sleep?: (duration: number) => Promise<void>;
	now?: () => number;
	timeoutMs?: number;
	retryDelayMs?: number;
}): Promise<{ attempts: number; output: string }>;
