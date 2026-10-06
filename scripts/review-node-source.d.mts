export function findEmptyPropertyPlaceholders(
	root?: string,
): Array<{ path: string; reason: string }>;
export function reviewNodeSource(root?: string): { reviewedRoot: string; fileCount: number };
