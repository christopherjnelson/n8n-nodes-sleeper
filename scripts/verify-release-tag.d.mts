export function verifyReleaseTag(options?: {
	repository?: string;
	env?: Record<string, string | undefined>;
	executeGit?: (repository: string, arguments_: string[]) => string;
}): { expectedRef: string; taggedCommit: string };
