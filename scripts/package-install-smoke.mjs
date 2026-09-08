import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const { name } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const temporaryRoot = mkdtempSync(join(tmpdir(), 'sleeper-node-smoke-'));
try {
	const [{ filename }] = JSON.parse(
		execFileSync('npm', ['pack', '--json', '--pack-destination', temporaryRoot], {
			cwd: root,
			encoding: 'utf8',
		}),
	);
	const consumer = join(temporaryRoot, 'consumer');
	mkdirSync(consumer);
	writeFileSync(
		join(consumer, 'package.json'),
		'{"name":"sleeper-install-smoke","private":true}\n',
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
	console.log('Packed package installed and loaded in an isolated consumer');
} finally {
	rmSync(temporaryRoot, { recursive: true, force: true });
}
