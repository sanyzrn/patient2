import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, '../data.ts');
const dest = resolve(__dirname, '../public/data.js');

try {
  // Strip TypeScript types and copy to public/
  const content = readFileSync(src, 'utf8');
  // data.ts is already valid JS (no type annotations) — just copy
  writeFileSync(dest, content, 'utf8');
  console.log(`✅ Synced data.ts → public/data.js`);
} catch (err) {
  console.error('❌ Failed to sync data:', err.message);
  process.exit(1);
}
