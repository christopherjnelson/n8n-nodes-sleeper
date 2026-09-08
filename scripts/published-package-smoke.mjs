import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const { name, version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const packageSpec = `${name}@${version}`;
const temporaryRoot = mkdtempSync(join(tmpdir(), 'sleeper-published-smoke-'));

try {
	const packOutput = execFileSync(
		'npm',
		['pack', packageSpec, '--json', '--pack-destination', temporaryRoot, '--ignore-scripts'],
		{ cwd: temporaryRoot, encoding: 'utf8' },
	);
	const [{ filename }] = JSON.parse(packOutput);
	const boundary = spawnSync(process.execPath, [resolve(root, 'scripts/validate-pack.mjs')], {
		cwd: root,
		input: packOutput,
		encoding: 'utf8',
		stdio: ['pipe', 'inherit', 'inherit'],
	});
	if (boundary.status !== 0) throw new Error('Published package boundary validation failed');

	const consumer = join(temporaryRoot, 'consumer');
	mkdirSync(consumer);
	writeFileSync(
		join(consumer, 'package.json'),
		'{"name":"sleeper-published-smoke","private":true}\n',
	);
	execFileSync(
		'npm',
		[
			'install',
			'--ignore-scripts',
			'--no-package-lock',
			'--omit=peer',
			'--no-audit',
			'--no-fund',
			join(temporaryRoot, filename),
		],
		{ cwd: consumer, stdio: 'pipe' },
	);
	execFileSync(
		process.execPath,
		[
			resolve(root, 'scripts/node-load-smoke.mjs'),
			resolve(consumer, 'node_modules', ...name.split('/')),
		],
		{
			cwd: consumer,
			stdio: 'inherit',
			env: { ...process.env, NODE_PATH: resolve(root, 'node_modules') },
		},
	);
	console.log(`Published package ${packageSpec} passed boundary, install, load, and icon checks`);
} finally {
	rmSync(temporaryRoot, { recursive: true, force: true });
}
