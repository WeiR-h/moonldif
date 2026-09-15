import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Runtime packages bundled in the browser output; build-only tools are not shipped.
const root = new URL('../', import.meta.url);
const notices = ['MoonLDIF workbench — bundled runtime licenses\n'];
for (const name of ['react', 'react-dom', 'scheduler']) {
  const folder = new URL(`node_modules/${name}/`, root);
  const metadata = JSON.parse(readFileSync(new URL('package.json', folder), 'utf8'));
  notices.push(`${name} ${metadata.version}\n${readFileSync(new URL('LICENSE', folder), 'utf8')}`);
}
const output = new URL('dist/THIRD_PARTY_LICENSES.txt', root);
writeFileSync(output, notices.join('\n\n'), 'utf8');
console.log(`Bundled license notices: ${fileURLToPath(output)}`);
