import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
await mkdir(output, { recursive: true });
const files = ['index.html', 'index.css', 'admin.html', 'admin.css', 'admin.js', 'qr.html', 'menu-config.js', 'menu-model.js', 'menu-store.js', 'duplicate-cleanup.js', 'images'];
for (const file of files) await cp(new URL(file, root), new URL(file, output), { recursive: true });
console.log(`Built Blanco website: ${fileURLToPath(output)}`);
