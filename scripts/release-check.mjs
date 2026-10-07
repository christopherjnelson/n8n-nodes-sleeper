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
	const job = (name, nextName) => {
		const start = release.indexOf(`\n  ${name}:`);
		const end = nextName ? release.indexOf(`\n  ${nextName}:`, start + 1) : release.length;
		return start < 0 || end < 0 ? '' : release.slice(start, end);
	};
	const quality = job('quality', 'publish');
	const publish = job('publish', 'verify-published');
	const verify = job('verify-published', 'github-release');
	const githubRelease = job('github-release');

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
	require(pkg.scripts?.['smoke:published'] ===
		'node scripts/published-package-smoke.mjs', 'published smoke script must be registered');
	require(pkg.packageManager ===
		'pnpm@11.15.0', 'package manager must remain pinned to pnpm 11.15.0');
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
	), 'published scan must use the pinned scanner');
	require(scanPublished.includes(
		'SCAN_TIMEOUT_MS = 360_000',
	), 'published scan wait must be bounded to 360 seconds');
	require(ci.indexOf('pnpm run review:source') >= 0 &&
		ci.indexOf('pnpm run review:source') <
			ci.indexOf('pnpm run build'), 'CI must review source before build');
	require(ci.indexOf('pnpm run package:check') >= 0 &&
		ci.indexOf('pnpm run package:check') <
			ci.indexOf('pnpm run release:check'), 'CI must inspect package before release audit');
	require(quality.indexOf('pnpm run review:source') >= 0 &&
		quality.indexOf('pnpm run review:source') <
			quality.indexOf('pnpm run build'), 'release quality must review source before build');
	require(quality.indexOf('pnpm run build') < quality.indexOf('pnpm run scan:source') &&
		quality.indexOf('pnpm run scan:source') < quality.indexOf('pnpm run package:check') &&
		quality.indexOf('pnpm run package:check') <
			quality.indexOf(
				'pnpm run release:check',
			), 'release quality must build, scan, inspect package, then audit');
	require(release.startsWith('name: Release'), 'release workflow must have its expected name');
	require(/on:\n  push:\n    tags:\n      - 'v\*\.\*\.\*'/.test(
		release,
	), 'release workflow must run on version tags');
	require(!/workflow_dispatch|trusted-stage|npm stage|NPM_TOKEN|NODE_AUTH_TOKEN/.test(
		release,
	), 'release workflow must not retain manual staging or token authentication');
	require(!/npm dist-tag|npm publish[^\n]*--tag\s+["']?\$/.test(
		release,
	), 'stable publication tag must not be user-selectable');
	require(quality.includes('fetch-depth: 0') &&
		quality.includes(
			'node scripts/verify-release-tag.mjs',
		), 'quality must check out full history and verify the tag');
	const checkout = quality.indexOf('actions/checkout@v6');
	const guard = quality.indexOf('node scripts/verify-release-tag.mjs');
	const setup = quality.indexOf('pnpm/action-setup@v4');
	require(checkout >= 0 &&
		guard > checkout &&
		setup > guard, 'tag guard must run after checkout and before tool setup');
	const checkoutStepEnd = quality.indexOf('\n      - ', checkout + 1);
	const guardStepEnd = quality.indexOf('\n      - ', checkoutStepEnd + 1);
	require(checkoutStepEnd >= 0 &&
		quality.slice(checkout, checkoutStepEnd).includes('fetch-depth: 0') &&
		quality
			.slice(checkoutStepEnd, guardStepEnd)
			.includes(
				'node scripts/verify-release-tag.mjs',
			), 'tag guard must be the first step after full-history checkout');
	for (const command of [
		'pnpm install --frozen-lockfile',
		'pnpm run validate',
		'pnpm run typecheck',
		'pnpm run lint',
		'pnpm run format:check',
		'pnpm run test',
		'pnpm run review:source',
		'pnpm run build',
		'pnpm run scan:source',
		'pnpm run smoke:load',
		'pnpm run smoke:install',
		'pnpm run package:check',
		'pnpm run release:check',
		'npm pack --json',
	])
		require(quality.includes(command), `release quality must run ${command}`);
	for (const command of [
		'npm run review:source',
		'npm run build',
		'npm run scan:source',
		'npm run package:check',
	]) {
		const ciIndex = ci.indexOf(command.replace('npm run ', 'pnpm run '));
		if (ciIndex < 0) require(false, `CI must retain ${command.replace('npm run ', 'pnpm run ')}`);
	}
	require(/environment:\s*npm-release/.test(
		publish,
	), 'publish must use the npm-release environment');
	require(publish.includes(
		'npm install --global npm@11.19.0',
	), 'publish must use the reviewed npm CLI version');
	require(publish.includes(
		'node scripts/prepare-npm-auth.mjs',
	), 'publish must remove setup-node token placeholder before OIDC');
	require(publish.indexOf('node scripts/prepare-npm-auth.mjs') >
		publish.indexOf('actions/setup-node@v6') &&
		publish.indexOf('node scripts/prepare-npm-auth.mjs') <
			publish.indexOf(
				'npm install --global npm@11.19.0',
			), 'npm auth placeholder must be removed immediately after setup-node, before npm installs tooling');
	require(publish.includes('needs: quality'), 'publish must wait for release quality');
	require(quality.includes('sha256: ${{ steps.pack.outputs.sha256 }}') &&
		quality.includes(
			'tarball: ${{ steps.pack.outputs.tarball }}',
		), 'quality must export the inspected tarball and its hash');
	require(publish.includes('actions/download-artifact@v4') &&
		publish.includes(
			'package-tarball-${{ github.run_id }}',
		), 'publish must download the quality artifact');
	require(publish.includes('needs: quality'), 'publish must wait for release quality');
	require(quality.includes('sha256: ${{ steps.pack.outputs.sha256 }}') &&
		quality.includes(
			'tarball: ${{ steps.pack.outputs.tarball }}',
		), 'quality must export the inspected tarball and its hash');
	require(publish.includes('actions/download-artifact@v4') &&
		publish.includes(
			'package-tarball-${{ github.run_id }}',
		), 'publish must download the quality artifact');
	require(/permissions:\n\s+contents:\s+read\n\s+id-token:\s+write/.test(
		publish,
	), 'publish must scope OIDC permission to its job');
	require(!/id-token:\s*write/.test(
		release.slice(0, release.indexOf('\njobs:')),
	), 'workflow must not grant OIDC globally');
	require(publish.includes(
		'npm publish "$PACKAGE_TARBALL" --provenance --access public --tag latest',
	), 'publish must publish the inspected tarball with provenance to latest');
	require(publish.includes(
		'sha256sum --check --strict',
	), 'publish must verify the inspected tarball hash');
	require(!/contents:\s*write/.test(
		publish,
	), 'npm publish job must not receive repository write permission');
	require(/permissions:\n\s+contents:\s+read/.test(quality), 'quality job must remain read-only');
	require(verify.includes('needs: publish') &&
		/permissions:\n\s+contents:\s+read/.test(
			verify,
		), 'published verification must depend on publish and remain read-only');
	require(verify.includes('node scripts/verify-published-release.mjs') &&
		verify.includes('pnpm run smoke:published') &&
		verify.includes(
			'pnpm run scan:published',
		), 'published verification must check registry metadata, install/load, and official scanner');
	require(!/id-token:\s*write|contents:\s*write|npm publish/.test(
		verify,
	), 'verification must have no publish or write permissions');
	require(githubRelease.includes('needs: [quality, verify-published]') &&
		/contents:\s*write/.test(
			githubRelease,
		), 'GitHub Release must wait for verification and scope contents write');
	require(!/contents:\s*write/.test(
		quality + publish + verify,
	), 'repository write permission must be limited to GitHub Release creation');
	require(githubRelease.includes('gh release create') &&
		!/id-token:\s*write/.test(
			githubRelease,
		), 'GitHub Release job must not receive npm OIDC permission');
	require(/id-token:\s*write/.test(publish) &&
		!/id-token:\s*write/.test(
			quality + verify + githubRelease,
		), 'only npm publish may receive OIDC permission');
	for (const gate of ['format:check', 'lint', 'typecheck', 'test', 'build', 'package:check']) {
		if (!ci.includes(`pnpm run ${gate}`) && !(gate === 'test' && ci.includes('pnpm run test')))
			require(false, `CI must run pnpm run ${gate}`);
	}
	try {
		const requireFromRoot = createRequire(resolve(root, 'package.json'));
		const compilerPath = requireFromRoot.resolve('typescript/package.json');
		const compiler = JSON.parse(readFileSync(compilerPath, 'utf8'));
		require(compiler.version === '5.9.3', 'node resolution must keep project TypeScript at 5.9.3');
		const compilerBinVersion = execFileSync(resolve(root, 'node_modules/.bin/tsc'), ['--version'], {
			encoding: 'utf8',
		});
		require(compilerBinVersion.trim() ===
			'Version 5.9.3', 'tsc must resolve to the project compiler');
		const scannerManifest = requireFromRoot.resolve('@n8n/scan-community-package/package.json');
		const requireFromScanner = createRequire(scannerManifest);
		const scannerCompilerPath = requireFromScanner.resolve('typescript/package.json');
		const scannerCompiler = JSON.parse(readFileSync(scannerCompilerPath, 'utf8'));
		require(scannerCompiler.version ===
			'6.0.2', 'scanner TypeScript alias must remain nested at 6.0.2');
	} catch (error) {
		failures.push(`could not resolve project and scanner TypeScript compilers: ${error.message}`);
	}
	const categories = [];
	for (const path of [
		'nodes/Sleeper/Sleeper.node.json',
		'nodes/SleeperTrigger/SleeperTrigger.node.json',
	]) {
		categories.push(...(JSON.parse(read(path)).categories ?? []));
	}
	require(categories.length > 0 &&
		categories.every(
			(category) => category === 'Development',
		), 'node metadata must use supported Development category');
	if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME !== `v${pkg.version}`)
		failures.push(`release tag must exactly match package version (v${pkg.version})`);
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
