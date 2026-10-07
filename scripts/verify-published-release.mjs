import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function normalizeRepository(value = '') {
	return String(value)
		.trim()
		.replace(/^git\+/, '')
		.replace(/^git@github\.com:/, 'https://github.com/')
		.replace(/\.git\/?$/, '')
		.replace(/\/$/, '');
}

export function validatePublishedRelease(metadata, pkg) {
	const packageSpec = `${pkg.name}@${pkg.version}`;
	const expectedRepository = normalizeRepository(pkg.repository?.url ?? pkg.repository ?? '');
	const publishedRepository = normalizeRepository(
		metadata.repository?.url ?? metadata.repository ?? '',
	);
	if (metadata.version !== pkg.version)
		throw new Error(`Registry returned the wrong version for ${packageSpec}`);
	if (metadata['dist-tags']?.latest !== pkg.version)
		throw new Error(`npm latest does not point to ${packageSpec}`);
	if (expectedRepository && publishedRepository !== expectedRepository)
		throw new Error(`Registry repository does not match package.json for ${packageSpec}`);
	if (metadata['dist.attestations']?.provenance?.predicateType !== 'https://slsa.dev/provenance/v1')
		throw new Error(`SLSA provenance v1 is missing for ${packageSpec}`);
}

const isDirectExecution =
	process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectExecution) {
	const root = resolve(import.meta.dirname, '..');
	const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
	const packageSpec = `${pkg.name}@${pkg.version}`;
	const metadata = JSON.parse(
		execFileSync(
			'npm',
			['view', packageSpec, 'version', 'repository', 'dist-tags', 'dist.attestations', '--json'],
			{ cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
		),
	);
	validatePublishedRelease(metadata, pkg);
	console.log(`Verified npm metadata, latest tag, repository, and provenance for ${packageSpec}`);
}
