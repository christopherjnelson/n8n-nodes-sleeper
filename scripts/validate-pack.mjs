import { readFileSync } from 'node:fs';

let input = '';
for await (const chunk of process.stdin) input += chunk;
let report;
try {
	[report] = JSON.parse(input);
} catch {
	console.error('Package boundary check failed: npm pack did not return valid JSON');
	process.exit(1);
}
const metadata = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = new Set((report?.files ?? []).map(({ path }) => path));
const allowedRoot = new Set(['CHANGELOG.md', 'LICENSE', 'README.md', 'package.json']);
const failures = [];
for (const path of files)
	if (!allowedRoot.has(path) && !path.startsWith('dist/'))
		failures.push(`unexpected tarball file: ${path}`);
for (const registration of [...(metadata.n8n?.nodes ?? []), ...(metadata.n8n?.credentials ?? [])])
	if (!files.has(registration)) failures.push(`registered artifact missing: ${registration}`);
for (const required of allowedRoot)
	if (!files.has(required)) failures.push(`required file missing: ${required}`);
for (const path of files)
	if (
		/\.(?:ts|map)$/.test(path) ||
		/(?:^|\/)(?:test|tests|scripts|docs|examples)(?:\/|$)/.test(path)
	)
		failures.push(`development file packed: ${path}`);
if (failures.length) {
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}
console.log(`Package boundary passed: ${report.entryCount} files, ${report.size} packed bytes`);
