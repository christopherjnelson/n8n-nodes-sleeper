/* eslint-disable @n8n/community-nodes/no-restricted-imports, @n8n/community-nodes/no-restricted-globals, @n8n/community-nodes/no-dangerous-functions -- Node APIs and child Git processes are used only for disposable unit-test fixtures. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDevProcessOptions, DEV_PORT } from '../scripts/dev.mjs';
import { requireFilenameConstructor } from '../scripts/node-load-smoke.mjs';
import { auditReleaseConfiguration } from '../scripts/release-check.mjs';
import { findEmptyPropertyPlaceholders } from '../scripts/review-node-source.mjs';
import { scanPublishedPackage } from '../scripts/scan-published.mjs';
import { verifyReleaseTag } from '../scripts/verify-release-tag.mjs';

const temporaryRoots: string[] = [];

function temporaryRoot(prefix: string) {
	const scratch = join(process.cwd(), '.codex-scratch');
	mkdirSync(scratch, { recursive: true });
	const root = mkdtempSync(join(scratch, prefix));
	temporaryRoots.push(root);
	return root;
}

afterEach(() => {
	for (const path of temporaryRoots.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe('template alignment safeguards', () => {
	it('uses port 5690 while forwarding isolated development arguments', () => {
		const options = createDevProcessOptions({ N8N_PORT: '5678', PATH: '/bin' }, [
			'--custom-user-folder',
			'.codex-scratch/n8n-dev',
		]);
		expect(DEV_PORT).toBe('5690');
		expect(options.environment).toMatchObject({ N8N_PORT: '5690', PATH: '/bin' });
		expect(options.arguments).toEqual(['dev', '--custom-user-folder', '.codex-scratch/n8n-dev']);
	});

	it('rejects operation-property files that only export typed empty arrays', () => {
		const root = temporaryRoot('source-review-');
		const file = join(root, 'nodes/Example/resources/team/get.ts');
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(
			file,
			"import type { INodeProperties } from 'n8n-workflow';\nexport const fields: INodeProperties[] = [];\n",
		);
		expect(findEmptyPropertyPlaceholders(root)).toHaveLength(1);
	});

	it('allows modules with runtime work or value exports', () => {
		const root = temporaryRoot('source-review-allowed-');
		const folder = join(root, 'nodes/Example');
		mkdirSync(folder, { recursive: true });
		writeFileSync(join(folder, 'imports.ts'), "import type { IDataObject } from 'n8n-workflow';\n");
		writeFileSync(join(folder, 'logic.ts'), 'export const operation = { value: true };\n');
		expect(findEmptyPropertyPlaceholders(root)).toEqual([]);
	});

	it('requires the filename-matching node constructor without aliases', () => {
		class SleeperNode {}
		const helper = () => true;
		expect(requireFilenameConstructor('dist/nodes/Sleeper.node.js', { Sleeper: SleeperNode })).toBe(
			SleeperNode,
		);
		expect(
			requireFilenameConstructor('dist/nodes/Sleeper.node.js', { Sleeper: SleeperNode, helper }),
		).toBe(SleeperNode);
		expect(() =>
			requireFilenameConstructor('dist/nodes/Sleeper.node.js', { Sleeper: helper }),
		).toThrow('must export only constructible Sleeper');
		expect(() =>
			requireFilenameConstructor('dist/nodes/Sleeper.node.js', {
				Sleeper: SleeperNode,
				Alias: SleeperNode,
			}),
		).toThrow('constructible exports: Sleeper, Alias');
	});

	it('passes the package release configuration audit', () => {
		expect(auditReleaseConfiguration(process.cwd())).toEqual([]);
	});

	it('waits for recognized registry propagation and requires explicit zero-exit success', async () => {
		let time = 0;
		let calls = 0;
		const delays: number[] = [];
		const result = await scanPublishedPackage({
			packageSpec: 'n8n-nodes-sleeper@0.2.1',
			timeoutMs: 30,
			retryDelayMs: 10,
			now: () => time,
			sleep: async (duration) => {
				delays.push(duration);
				time += duration;
			},
			spawn: (_command, _args, options) => {
				expect(options.timeout).toBe(30 - calls * 10);
				calls += 1;
				return calls === 1
					? { status: 1, stdout: 'Reason: No package metadata found for version 0.2.1' }
					: { status: 0, stdout: 'Package n8n-nodes-sleeper@0.2.1 has passed all security checks' };
			},
		});
		expect(result.attempts).toBe(2);
		expect(delays).toEqual([10]);
	});

	it('fails deterministic scanner findings and process timeouts without retrying', async () => {
		let calls = 0;
		await expect(
			scanPublishedPackage({
				packageSpec: 'n8n-nodes-sleeper@0.2.1',
				spawn: () => {
					calls += 1;
					return {
						status: 1,
						stdout: 'Package n8n-nodes-sleeper@0.2.1 has failed security checks',
					};
				},
			}),
		).rejects.toThrow('security failure');
		expect(calls).toBe(1);
		await expect(
			scanPublishedPackage({
				packageSpec: 'n8n-nodes-sleeper@0.2.1',
				spawn: () => ({
					status: 1,
					stdout: 'Package n8n-nodes-sleeper@0.2.1 has passed all security checks',
				}),
			}),
		).rejects.toThrow('without a retryable propagation error');
		await expect(
			scanPublishedPackage({
				packageSpec: 'n8n-nodes-sleeper@0.2.1',
				spawn: () => ({
					status: 1,
					stdout: 'Reason: Analysis failed: Request failed with status code 404',
				}),
			}),
		).rejects.toThrow('without a retryable propagation error');
		calls = 0;
		await expect(
			scanPublishedPackage({
				packageSpec: 'n8n-nodes-sleeper@0.2.1',
				spawn: () => {
					calls += 1;
					return { status: null, error: new Error('timed out') };
				},
			}),
		).rejects.toThrow('process failed');
		expect(calls).toBe(1);
	});

	it('stops retrying when the total propagation deadline expires', async () => {
		let time = 0;
		let calls = 0;
		const timeouts: number[] = [];
		await expect(
			scanPublishedPackage({
				packageSpec: 'n8n-nodes-sleeper@0.2.1',
				timeoutMs: 15,
				retryDelayMs: 10,
				now: () => time,
				sleep: async (duration) => {
					time += duration;
				},
				spawn: (_command, _args, options) => {
					timeouts.push(Number(options.timeout));
					calls += 1;
					return { status: 1, stdout: 'Reason: No package metadata found for version 0.2.1' };
				},
			}),
		).rejects.toThrow('exceeded 15ms');
		expect(calls).toBe(2);
		expect(timeouts).toEqual([15, 5]);
	});

	it('accepts a release tag only at the freshly fetched current main tip', () => {
		const root = temporaryRoot('release-tag-mock-');
		writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '0.2.1' }));
		let mainCommit = 'reviewed-commit';
		const commands: string[] = [];
		const executeGit = (_repository: string, arguments_: string[]) => {
			commands.push(arguments_.join(' '));
			if (arguments_[0] === 'cat-file') return 'tag';
			if (arguments_[0] === 'rev-parse' && arguments_[1] === 'refs/tags/v0.2.1^{commit}')
				return 'reviewed-commit';
			if (arguments_[0] === 'rev-parse' && arguments_[1] === 'HEAD') return 'reviewed-commit';
			if (arguments_[0] === 'rev-parse' && arguments_[1] === 'refs/remotes/origin/main')
				return mainCommit;
			return '';
		};
		expect(
			verifyReleaseTag({
				repository: root,
				env: { GITHUB_REF: 'refs/tags/v0.2.1', GITHUB_SHA: 'reviewed-commit' },
				executeGit,
			}).expectedRef,
		).toBe('refs/tags/v0.2.1');
		expect(commands).toContain('fetch --no-tags origin main');
		mainCommit = 'newer-main-tip';
		expect(() =>
			verifyReleaseTag({
				repository: root,
				env: { GITHUB_REF: 'refs/tags/v0.2.1' },
				executeGit,
			}),
		).toThrow('exactly to the freshly fetched origin/main commit');
	});

	it('checks annotated tags, selected HEAD, and the actual fetched origin/main tip', () => {
		const root = temporaryRoot('release-tag-git-');
		const remote = join(root, 'remote.git');
		const repository = join(root, 'repository');
		const git = (args: string[]) =>
			execFileSync('git', args, { cwd: repository, encoding: 'utf8' }).trim();
		execFileSync('git', ['init', '--bare', remote], { encoding: 'utf8', stdio: 'ignore' });
		execFileSync('git', ['clone', remote, repository], { encoding: 'utf8', stdio: 'ignore' });
		git(['config', 'user.name', 'Template Fixture']);
		git(['config', 'user.email', 'template-fixture@example.invalid']);
		git(['switch', '-c', 'main']);
		writeFileSync(join(repository, 'package.json'), JSON.stringify({ version: '0.2.1' }));
		git(['add', 'package.json']);
		git(['commit', '-m', 'initial']);
		git(['push', '-u', 'origin', 'main']);
		git(['tag', '-a', 'v0.2.1', '-m', 'release 0.2.1']);
		const firstCommit = git(['rev-parse', 'HEAD']);
		expect(
			verifyReleaseTag({
				repository,
				env: { GITHUB_REF: 'refs/tags/v0.2.1', GITHUB_SHA: firstCommit },
			}).taggedCommit,
		).toBe(firstCommit);
		expect(() =>
			verifyReleaseTag({
				repository,
				env: { GITHUB_REF: 'refs/tags/v0.2.1', GITHUB_SHA: 'different-workflow-sha' },
			}),
		).toThrow('selected workflow SHA');

		writeFileSync(join(repository, 'package.json'), JSON.stringify({ version: '0.2.2' }));
		git(['add', 'package.json']);
		git(['commit', '-m', 'release candidate']);
		git(['tag', '-a', 'v0.2.2', '-m', 'release 0.2.2']);
		const taggedCommit = git(['rev-parse', 'HEAD']);
		writeFileSync(join(repository, 'advance.txt'), 'new main tip');
		git(['add', 'advance.txt']);
		git(['commit', '-m', 'advance main']);
		git(['push', 'origin', 'main']);
		git(['checkout', 'v0.2.2']);
		expect(() =>
			verifyReleaseTag({
				repository,
				env: { GITHUB_REF: 'refs/tags/v0.2.2', GITHUB_SHA: taggedCommit },
			}),
		).toThrow('exactly to the freshly fetched origin/main commit');

		git(['checkout', 'main']);
		writeFileSync(join(repository, 'package.json'), JSON.stringify({ version: '0.2.3' }));
		git(['add', 'package.json']);
		git(['commit', '-m', 'lightweight-tag release']);
		git(['tag', 'v0.2.3']);
		const lightweightCommit = git(['rev-parse', 'HEAD']);
		git(['push', 'origin', 'main']);
		expect(() =>
			verifyReleaseTag({
				repository,
				env: { GITHUB_REF: 'refs/tags/v0.2.3', GITHUB_SHA: lightweightCommit },
			}),
		).toThrow('release tag must be annotated');
	});
});
