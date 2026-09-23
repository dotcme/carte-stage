// Ajoute à chaque fichier du site chargé par index.html une empreinte de son contenu (?v=…),
// pour que les navigateurs prennent la nouvelle version dès qu'il change : node scripts/version.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const INDEX = path.join(ROOT, 'index.html');
const FILES = ['assets/style.css', 'assets/basemap.js', 'assets/app.js'];

let html = fs.readFileSync(INDEX, 'utf8');
FILES.forEach((f) => {
  const v = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex').slice(0, 8);
  const re = new RegExp(`(["'])${f.replace(/[.]/g, '\\.')}(\\?v=[0-9a-f]*)?\\1`, 'g');
  if (!re.test(html)) throw new Error(`${f} introuvable dans index.html`);
  html = html.replace(re, `$1${f}?v=${v}$1`);
  console.log(`${f}?v=${v}`);
});
fs.writeFileSync(INDEX, html);
