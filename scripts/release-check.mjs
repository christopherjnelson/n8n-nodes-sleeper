import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function auditReleaseConfiguration(root = process.cwd()) {
	const read = (path) => readFileSync(resolve(root, path), 'utf8');
	const pkg = JSON.parse(read('package.json'));
	const ci = read('.github/workflows/ci.yml');
	const release = read('.github/workflows/release.yml');
	const sourceReview = read('scripts/review-node-source.mjs');
	const scanSource = read('scripts/scan-source.mjs');
	const scanPublished = read('scripts/scan-published.mjs');
	const marker = JSON.parse(read('.blackswamp/template.json'));
	const failures = [];
	const require = (condition, message) => {
		if (!condition) failures.push(message);
	};

	require(pkg.devDependencies?.['@n8n/scan-community-package'] ===
		'0.38.0', 'scanner pin must be 0.38.0');
	require(pkg.devDependencies?.typescript ===
		'5.9.3', 'project TypeScript must remain pinned to 5.9.3');
	require(Object.keys(pkg.dependencies ?? {}).length ===
		0, 'runtime dependencies must remain empty');
	require(pkg.peerDependencies?.['n8n-workflow'] === '*', 'n8n-workflow must remain a host peer');
	require(pkg.scripts?.['review:source'] ===
		'node scripts/review-node-source.mjs', 'source review script must be registered');
	require(pkg.scripts?.['release:check'] ===
		'node scripts/release-check.mjs', 'release audit script must be registered');
	require(pkg.scripts?.dev === 'node scripts/dev.mjs', 'dev must use the isolated port wrapper');
	require(marker.templateVersion === '2.2.0', 'template marker must identify baseline 2.2.0');
	require(sourceReview.includes('createSourceFile') &&
		sourceReview.includes(
			'INodeProperties',
		), 'AST source review must inspect node property placeholders');
	require(scanSource.includes('SOURCE_FILE_PATTERNS') &&
		scanSource.includes("'dist/**/*.js'"), 'source scanner must inspect source and built output');
	require(scanPublished.includes(
		'@n8n/scan-community-package@0.38.0',
	), 'published scanner must use the pinned scanner');
	require(scanPublished.includes(
		'SCAN_TIMEOUT_MS = 360_000',
	), 'published scan wait must be bounded to 360 seconds');
	require(ci.indexOf('pnpm run review:source') >= 0 &&
		ci.indexOf('pnpm run review:source') <
			ci.indexOf('pnpm run build'), 'CI must review source before build');
	require(release.indexOf('pnpm run review:source') >= 0 &&
		release.indexOf('pnpm run review:source') <
			release.indexOf('pnpm run build'), 'release quality must review source before build');
	require(ci.indexOf('pnpm run package:check') >= 0 &&
		ci.indexOf('pnpm run package:check') <
			ci.indexOf('pnpm run release:check'), 'CI must run package inspection before release audit');
	require(release.indexOf('pnpm run package:check') >= 0 &&
		release.indexOf('pnpm run package:check') <
			release.indexOf(
				'pnpm run release:check',
			), 'release quality must inspect package before release audit');
	require(release.startsWith(
		'# Manual-only by design',
	), 'release workflow must remain manual-only');
	require(/- trusted-stage[\s\S]*?- verify-published/.test(
		release,
	), 'release workflow must preserve separate stage and verify modes');
	require(release.includes('npm stage publish') &&
		!/\bnpm publish\b/.test(release), 'release workflow must stage through npm trusted publishing');
	require(!/NPM_TOKEN|NODE_AUTH_TOKEN|secrets\./.test(
		release,
	), 'release workflow must not add token fallback or secret use');
	require(!/npm stage (?:approve|reject)/.test(
		release,
	), 'stage approval must remain an owner action');
	for (const job of [
		release.slice(release.indexOf('  quality:')),
		release.slice(release.indexOf('  verify-published:')),
	]) {
		const checkout = job.indexOf('actions/checkout@v6');
		const guard = job.indexOf('node scripts/verify-release-tag.mjs');
		const setup = job.indexOf('pnpm/action-setup@v4');
		const checkoutStepEnd = job.indexOf('\n      - ', checkout + 1);
		const guardStepEnd = job.indexOf('\n      - ', checkoutStepEnd + 1);
		require(checkout >= 0 &&
			setup >= 0 &&
			guard >= 0, 'staging and verification jobs must include checkout, setup, and tag guard');
		require(checkoutStepEnd >= 0 &&
			job.slice(checkout, checkoutStepEnd).includes('fetch-depth: 0') &&
			job.slice(checkoutStepEnd, guardStepEnd).includes('node scripts/verify-release-tag.mjs') &&
			guard <
				setup, 'tag jobs must check full history and guard in the first step after checkout, before setup');
	}
	try {
		const requireFromRoot = createRequire(resolve(root, 'package.json'));
		const compilerPath = requireFromRoot.resolve('typescript/package.json');
		const compiler = JSON.parse(readFileSync(compilerPath, 'utf8'));
		require(compiler.version ===
			'5.9.3', 'node resolution must keep the project TypeScript compiler at 5.9.3');
		const compilerBinVersion = execFileSync(resolve(root, 'node_modules/.bin/tsc'), ['--version'], {
			encoding: 'utf8',
		});
		require(compilerBinVersion.trim() ===
			'Version 5.9.3', 'node_modules/.bin/tsc must resolve to the project compiler');
		const scannerManifest = requireFromRoot.resolve('@n8n/scan-community-package/package.json');
		const requireFromScanner = createRequire(scannerManifest);
		const scannerCompilerPath = requireFromScanner.resolve('typescript/package.json');
		const scannerCompiler = JSON.parse(readFileSync(scannerCompilerPath, 'utf8'));
		require(scannerCompiler.version ===
			'6.0.2', 'scanner TypeScript 6 alias must remain nested at 6.0.2');
	} catch (error) {
		failures.push(
			`could not resolve the project and scanner TypeScript compilers: ${error.message}`,
		);
	}
	const categories = [];
	for (const path of [
		'nodes/Sleeper/Sleeper.node.json',
		'nodes/SleeperTrigger/SleeperTrigger.node.json',
	]) {
		const metadata = JSON.parse(read(path));
		categories.push(...(metadata.categories ?? []));
	}
	require(categories.length > 0 &&
		categories.every(
			(category) => category === 'Development',
		), 'node metadata must use supported Development category');
	return failures;
}

const isDirectExecution =
	process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectExecution) {
	const failures = auditReleaseConfiguration();
	if (failures.length) {
		console.error(
			'Release configuration audit failed:\n' +
				failures.map((failure) => `- ${failure}`).join('\n'),
		);
		process.exitCode = 1;
	} else console.log('Release configuration audit passed');
}
