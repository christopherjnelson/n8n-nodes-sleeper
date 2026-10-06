export function requireFilenameConstructor(
	registration: string,
	exports: Record<string, unknown>,
): new (...arguments_: never[]) => unknown;
export function runNodeLoadSmoke(packageRoot?: string): { nodeCount: number };
