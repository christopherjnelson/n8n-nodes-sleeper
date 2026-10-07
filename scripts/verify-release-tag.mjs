import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const runGit = (repository, args) =>
	execFileSync('git', args, {
		cwd: repository,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	}).trim();

export function verifyReleaseTag({
	repository = process.cwd(),
	env = process.env,
	executeGit = runGit,
} = {}) {
	const packageJson = JSON.parse(readFileSync(resolve(repository, 'package.json'), 'utf8'));
	if (packageJson.version.includes('-'))
		throw new Error('stable release tags cannot publish a prerelease version to latest');
	const expectedRef = `refs/tags/v${packageJson.version}`;
	if (env.GITHUB_REF !== expectedRef)
		throw new Error(`GITHUB_REF must exactly match ${expectedRef}`);

	try {
		executeGit(repository, ['show-ref', '--verify', '--quiet', expectedRef]);
	} catch {
		throw new Error(`release tag ref is missing: ${expectedRef}`);
	}
	if (executeGit(repository, ['cat-file', '-t', expectedRef]) !== 'tag')
		throw new Error(`release tag must be annotated: ${expectedRef}`);

	const taggedCommit = executeGit(repository, ['rev-parse', `${expectedRef}^{commit}`]);
	if (taggedCommit !== executeGit(repository, ['rev-parse', 'HEAD']))
		throw new Error('release tag does not resolve to the checked-out HEAD');
	if (env.GITHUB_SHA && taggedCommit !== env.GITHUB_SHA)
		throw new Error('release tag does not resolve to the selected workflow SHA');

	try {
		executeGit(repository, ['fetch', '--no-tags', 'origin', 'main']);
	} catch {
		throw new Error('unable to fetch current origin/main for release verification');
	}
	const reviewedMain = executeGit(repository, ['rev-parse', 'refs/remotes/origin/main']);
	if (taggedCommit !== reviewedMain)
		throw new Error('release tag must point exactly to the freshly fetched origin/main commit');

	return { expectedRef, taggedCommit };
}

const isDirectExecution =
	process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectExecution) {
	try {
		const result = verifyReleaseTag();
		console.log(`Verified annotated release tag ${result.expectedRef} at current origin/main`);
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	}
}
