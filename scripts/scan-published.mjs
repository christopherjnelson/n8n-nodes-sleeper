import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { isDeterministicSecurityFailure, isLikelyPropagationFailure } from './scan-policy.mjs';

export const SCAN_TIMEOUT_MS = 360_000;
const RETRY_DELAY_MS = 10_000;

export async function scanPublishedPackage({
	packageSpec,
	spawn = spawnSync,
	sleep = (duration) => new Promise((resolve) => setTimeout(resolve, duration)),
	now = Date.now,
	timeoutMs = SCAN_TIMEOUT_MS,
	retryDelayMs = RETRY_DELAY_MS,
}) {
	const deadline = now() + timeoutMs;
	for (let attempt = 1; ; attempt += 1) {
		const remainingMs = deadline - now();
		if (remainingMs <= 0)
			throw new Error(`Official scanner exceeded ${timeoutMs}ms for ${packageSpec}`);
		const result = spawn('npx', ['--yes', '@n8n/scan-community-package@0.38.0', packageSpec], {
			cwd: process.cwd(),
			encoding: 'utf8',
			timeout: remainingMs,
			killSignal: 'SIGTERM',
		});
		const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
		if (result.error) throw new Error(`Official scanner process failed: ${result.error.message}`);
		if (
			result.status === 0 &&
			output.includes(`Package ${packageSpec} has passed all security checks`)
		)
			return { attempts: attempt, output };
		if (isDeterministicSecurityFailure(output, packageSpec))
			throw new Error(
				`Official scanner reported a security failure for ${packageSpec}:\n${output}`,
			);
		if (!isLikelyPropagationFailure(output, packageSpec))
			throw new Error(
				`Official scanner failed without a retryable propagation error for ${packageSpec}:\n${output}`,
			);
		const waitMs = Math.min(retryDelayMs, deadline - now());
		if (waitMs <= 0) break;
		await sleep(waitMs);
	}
	throw new Error(
		`Official scanner did not explicitly report success for ${packageSpec} within ${timeoutMs}ms`,
	);
}

const isDirectExecution =
	process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectExecution) {
	const { readFileSync } = await import('node:fs');
	const { resolve } = await import('node:path');
	const { name, version } = JSON.parse(
		readFileSync(resolve(import.meta.dirname, '../package.json'), 'utf8'),
	);
	const packageSpec = `${name}@${version}`;
	scanPublishedPackage({ packageSpec })
		.then(({ output }) => {
			process.stdout.write(output);
			console.log(`Official scanner succeeded for ${packageSpec}`);
		})
		.catch((error) => {
			console.error(error instanceof Error ? error.message : error);
			process.exitCode = 1;
		});
}
