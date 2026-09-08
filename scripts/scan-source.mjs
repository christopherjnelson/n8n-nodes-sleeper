import { resolve } from 'node:path';
import {
	SOURCE_FILE_PATTERNS,
	analyzePackage,
} from '@n8n/scan-community-package/scanner/scanner.mjs';

const root = resolve(import.meta.dirname, '..');

for (const [label, patterns] of [
	['Official scanner source preflight', SOURCE_FILE_PATTERNS],
	['Official scanner built-package preflight', ['dist/**/*.js', 'package.json']],
]) {
	const result = await analyzePackage(root, patterns);
	if (!result.passed) {
		console.error(`${label} failed: ${result.message}`);
		if (result.details) console.error(result.details);
		process.exitCode = 1;
	} else console.log(`${label} passed`);
}
