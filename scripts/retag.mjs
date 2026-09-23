// Recalcule les tags de data/stages.json à partir du vocabulaire de scripts/tags.mjs,
// sans retélécharger la source : node scripts/retag.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tagsFor } from './tags.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FILE = path.join(ROOT, 'data', 'stages.json');

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
let vides = 0;
data.stages.forEach((s) => {
  s.tags = tagsFor(s.sujet);
  if (!s.tags.length) vides++;
});
fs.writeFileSync(FILE, JSON.stringify(data));

const compte = new Map();
data.stages.forEach((s) => s.tags.forEach((t) => compte.set(t, (compte.get(t) || 0) + 1)));
console.log(`${data.stages.length} stages, ${vides} sans tag`);
[...compte].sort((a, b) => b[1] - a[1]).forEach(([t, n]) => console.log(String(n).padStart(4), t));
