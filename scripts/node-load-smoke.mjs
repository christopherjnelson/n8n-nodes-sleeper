import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, relative, resolve, sep } from 'node:path';

const packageRoot = resolve(process.argv[2] ?? resolve(import.meta.dirname, '..'));
const metadata = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));
const require = createRequire(import.meta.url);

for (const registration of metadata.n8n.nodes) {
	const exports = require(resolve(packageRoot, registration));
	const Constructor = Object.values(exports).find((value) => typeof value === 'function');
	const node = Constructor ? new Constructor() : undefined;
	if (!node?.description?.name) throw new Error(`No node description exported by ${registration}`);
	for (const icon of [node.description.icon?.light, node.description.icon?.dark].filter(Boolean)) {
		if (!icon.startsWith('file:')) throw new Error(`Non-file icon in ${registration}`);
		const iconPath = resolve(packageRoot, registration, '..', icon.slice(5));
		const fromRoot = relative(packageRoot, iconPath);
		if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot))
			throw new Error(`Icon escapes package root: ${icon}`);
		if (!existsSync(iconPath) || statSync(iconPath).size === 0) {
			throw new Error(`Missing icon ${icon} for ${registration}`);
		}
		if (!/\.(?:svg|png)$/i.test(iconPath)) throw new Error(`Unsupported icon type: ${icon}`);
		if (/\.svg$/i.test(iconPath)) {
			const values =
				/<svg\b[^>]*\bviewBox=["']([^"']+)["']/i
					.exec(readFileSync(iconPath, 'utf8'))?.[1]
					.trim()
					.split(/[\s,]+/)
					.map(Number) ?? [];
			if (values.length !== 4 || !values.every(Number.isFinite) || values[2] <= 0 || values[3] <= 0)
				throw new Error(`Invalid SVG viewBox: ${icon}`);
		}
	}
}
console.log(`Loaded ${metadata.n8n.nodes.length} compiled node(s) from package registrations`);
