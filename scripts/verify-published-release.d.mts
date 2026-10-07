export function normalizeRepository(value?: string): string;
export function validatePublishedRelease(
	metadata: {
		version?: string;
		repository?: string | { url?: string };
		'dist-tags'?: { latest?: string };
		'dist.attestations'?: {
			provenance?: { predicateType?: string };
		};
	},
	pkg: {
		name: string;
		version: string;
		repository?: string | { url?: string };
	},
): void;
