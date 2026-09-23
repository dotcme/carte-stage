// Récupère la carte « Carte des stages » publiée sur macarte.ign.fr et produit data/stages.json.
// Usage : node scripts/build-data.mjs [fichier.json]
// Sans argument, le fichier est téléchargé depuis l'API publique de macarte.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAP_ID = 'R3wixb';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'data', 'stages.json');

async function load() {
  if (process.argv[2]) return JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const res = await fetch(`https://macarte.ign.fr/api/maps/${MAP_ID}/file`);
  if (!res.ok) throw new Error(`macarte a répondu ${res.status}`);
  return res.json();
}

// Texte encodé deux fois (« Ã© » au lieu de « é »).
function fixEncoding(s) {
  if (!/Ã|Â/.test(s)) return s;
  try { return Buffer.from(s, 'latin1').toString('utf8'); } catch { return s; }
}
function clean(s) {
  if (s === null || s === undefined) return '';
  return fixEncoding(String(s))
    .replace(/([A-Za-zÀ-ÿ])\?(?=[A-Za-zÀ-ÿ])/g, '$1’') // apostrophe perdue à l'export (« L?École »)
    .replace(/ \? /g, ' – ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CYCLES = { ING2: 'ing2', ING3: 'ing3', TSI: 'ing3', G2: 'geo', LG2: 'geo', LPRO: 'lpro' };

const PARCOURS = {
  PPMD: 'PPMD', PPMD23: 'PPMD', TSI: 'TSI', IGAST: 'IGAST', DESIGEO: 'DeSIGeo', CARTHAGEO: 'Carthageo',
  DDMEG: 'DDMEG', GDS: 'GDS', GDM: 'GDM', FRS: 'FRS', MPT: 'MPT', PDM: 'PDM'
};

const COUNTRIES = [
  [/^(france|paris|corse|bretagne)/i, 'France'],
  [/guyane/i, 'Guyane'], [/r[ée]union/i, 'La Réunion'], [/guadeloupe/i, 'Guadeloupe'], [/martinique/i, 'Martinique'],
  [/nouvelle-cal/i, 'Nouvelle-Calédonie'], [/polyn/i, 'Polynésie française'],
  [/allemagne|germany|deutschland/i, 'Allemagne'], [/angleterre|scotland|ecosse|royaume|united kingdom/i, 'Royaume-Uni'],
  [/australi/i, 'Australie'], [/austria|autriche/i, 'Autriche'], [/belgi/i, 'Belgique'], [/br[ée]sil/i, 'Brésil'],
  [/chine/i, 'Chine'], [/chil/i, 'Chili'], [/ch[yi]p?re|cyprus/i, 'Chypre'], [/cor[ée]e|korea/i, 'Corée du Sud'],
  [/tch[èe]que|czech|eská/i, 'Tchéquie'], [/danemark|denmark/i, 'Danemark'], [/espagne|spain|catalogne/i, 'Espagne'],
  [/estonia/i, 'Estonie'], [/[ée]tats-unis|usa|hawaii/i, 'États-Unis'], [/finland/i, 'Finlande'], [/gr[èe]ce/i, 'Grèce'],
  [/ireland|irlande/i, 'Irlande'], [/iceland|islande/i, 'Islande'], [/ital/i, 'Italie'], [/japan|japon/i, 'Japon'],
  [/malta|malte/i, 'Malte'], [/norv[èe]ge|norway/i, 'Norvège'], [/nederland|pays-bas|netherlands/i, 'Pays-Bas'],
  [/slov[ée]ni/i, 'Slovénie'], [/switzerland|suisse/i, 'Suisse'], [/ta[iï]wan/i, 'Taïwan'], [/viet/i, 'Viêt Nam'],
  [/zealand/i, 'Nouvelle-Zélande'], [/malaysia/i, 'Malaisie'], [/israel/i, 'Israël'], [/senegal/i, 'Sénégal'],
  [/egypte/i, 'Égypte'], [/tha[iï]lande/i, 'Thaïlande']
];
function country(raw) {
  const s = clean(raw).replace(/^\(|\)$/g, '');
  for (const [re, name] of COUNTRIES) if (re.test(s)) return name;
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// Classement des structures d'accueil (le type n'existe pas dans les données d'origine : il est déduit du nom).
// Les règles sont lues dans l'ordre ; la première qui correspond l'emporte.
// Pour corriger un cas particulier, ajoutez le nom exact dans data/structures-corrections.json.
const COMPANY = /engie|orange lab|spie batignolles|\bsncf\b(?! ?r[ée]seau)|\bedf\b|ign ?fi\b|ardanti|m[ée]tropole t[ée]l[ée]vision|thal[eè]s/i;
const IGN = /\bign\b|institute? nationa\w* de l.information g[ée]ograph|institut g[ée]ographique national|information g[ée]ograph\w* et forest/i;
const LABO = /laborato|\bdlr\b|cirad|ifp energies|univert|\blab\b|research|recherche|universit|univ\.|univers|\bcnrs\b|\bumr|\bums\b|inrae|\birstea\b|\bird\b|\binria\b|\bonera\b|\bbrgm\b|ifremer|\bcnes\b|centre national d.[ée]tudes spatiales|\besa\b|\bcea\b|commissariat [àa] l.[ée]nergie atomique|lastig|fondazion|foundation|kessler|nersc|nansen|ifsttar|iffstar|\bjrc\b|\bgfz|cesbio|cerege|ricerche|zrc.sazu|\bnioz\b|icrisat|\birsn\b|facult|school|[ée]cole|college|hochschule|caltech|taipei tech|agroparistech|supagro|conservatoire national des arts|\buppa\b|gembloux|heig-vd|ensta|polytech|technische|tu wien|g[ée]osciences rennes|espace-dev|\bispa\b|identit[ée] et diff[ée]renciation|environnement, ville et soci[ée]t[ée]|geoecomar|center for (spatial|geospatial)|centre d.[ée]tudes|irt aese|cra wallonie|mus[ée]e royal|observato|institut pasteur|curie|\bmnhn\b|museum|\bephe\b|\bipgp\b|isterre|g[ée]oazur|mines paris|^ensg$/i;
const PUBLIC = /cerema|espaces verts|minist[èe]re|mairie|ville d|m[ée]tropole|conseil (d[ée]partemental|r[ée]gional|g[ée]n[ée]ral)|d[ée]partement (de la|des|du|d.) |r[ée]gion |\bddt|\bdreal\b|\bdeal\b|direction (d[ée]partementale|r[ée]gionale|de l.environnement|des (affaires|services)|de l.alimentation|du renseignement)|agglom|communaut[ée]|\bsdis\b|parc (national|naturel|amazonien)|office national|office (de l.eau|fran[çc]ais de la biodiversit)|\bonf|\bofb\b|agence (de l.eau|d.urbanisme|nationale|r[ée]gionale|alpine|de l.environnement)|\bapur\b|\baudiar\b|\binsee\b|s?ncf r[ée]seau|scncf|y?ndicat mixte|syndicat|collectivit|arm[ée]es?\b|\bdgac?\b|service (public|r[ée]gional|de l.[ée]tat|hydrographique)|\bspf\b|cadastre|land survey|national land|kartverket|ordnance survey|swisstopo|cartogr[àa]fic|cartographique et g[ée]ologique|\bcommune\b|comune di|municipal|government|gouvernement|\bshom\b|institution patrimoniale|pr[ée]f[ée]cture|voies? navigables|sant[ée] publique france|bureau d.enqu[êe]tes|\barcep\b|autorit[ée] de r[ée]gulation|\binrap\b|ch[âa]teau de versailles|archives nationales|bundesamt|landesamt|maa-amet|nations unies|pompiers|affaires fonci[èe]res|administration de la nature|grand lyon|chambre d.agriculture|gistda|eau de paris|province sud|[ée]tablissement public territorial|\beptb\b|geological survey|\bdnum\b|ciren|vall[ée]e du haut anjou|service de l.informatique|\bdaaf\b|m[ée]t[ée]o|gendarmerie|\bsra\b/i;
const INSTITUTE = /institut|institute|academ|centre de recherche/i;

let CORRECTIONS = {};
try { CORRECTIONS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'structures-corrections.json'), 'utf8')); } catch {}

function structure(name) {
  if (CORRECTIONS[name]) return CORRECTIONS[name];
  if (COMPANY.test(name)) return 'entreprise';
  if (IGN.test(name)) return /lastig|recherche|ipgp/i.test(name) ? 'labo' : 'public';
  if (LABO.test(name)) return 'labo';
  if (PUBLIC.test(name)) return 'public';
  if (INSTITUTE.test(name)) return 'labo';
  return 'entreprise';
}

// Pays absent ou illisible dans la source.
const COUNTRY_FIX = { 'Decyda SRLS': 'Italie', 'Geodätisches Institut, Universität Stuttgart': 'Allemagne', 'EPTB Seine Grands Lacs': 'France', 'Institut Pasteur de Madagascar': 'Madagascar' };

function academicYear(s) {
  const m = /(\d{4})\s*-\s*(\d{4})/.exec(s || '');
  return m ? `${m[1]}-${m[2]}` : '';
}

const file = await load();
const layer = file.layers.find((l) => l.data && Array.isArray(l.data.hashProperties) && l.data.hashProperties.includes('idStage'));
if (!layer) throw new Error('Calque des stages introuvable');
const { hashProperties: keys, features, style } = layer.data;

const stages = [];
features.forEach((f, i) => {
  const s = style[i] || {};
  if (s.pgy === 'fa-remove') return; // points masqués sur la carte d'origine
  const p = {};
  for (let k = 0; k < f[1].length; k += 2) p[keys[f[1][k]]] = f[1][k + 1];
  const cycle = CYCLES[clean(p.Cycle).toUpperCase()];
  const lat = Number(p.latitude), lon = Number(p.longitude);
  if (!cycle || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
  const org = clean(p.entrepriseNom);
  const detail = clean(p['Cycle_détail']).toUpperCase().replace(/\s+/g, '');
  const annee = academicYear(p.Annee);
  stages.push({
    id: `${annee.slice(0, 4)}-${p.idStage}`, // idStage seul n'est pas unique d'une année à l'autre
    annee,
    cycle,
    type: clean(p.TypeStage) || null,
    parcours: cycle === 'ing3' ? PARCOURS[detail] || null : null,
    sujet: clean(p.Sujet),
    org,
    structure: structure(org),
    ville: clean(p.entrepriseVille).replace(/^\S/, (c) => c.toUpperCase()),
    pays: COUNTRY_FIX[org] || country(p.entreprisePays),
    lat: Math.round(lat * 1e5) / 1e5,
    lon: Math.round(lon * 1e5) / 1e5
  });
});

stages.sort((a, b) => b.annee.localeCompare(a.annee) || a.org.localeCompare(b.org, 'fr'));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ source: `https://macarte.ign.fr/carte/${MAP_ID}`, generated: new Date().toISOString().slice(0, 10), stages }));

const count = (key) => stages.reduce((acc, s) => ((acc[s[key]] = (acc[s[key]] || 0) + 1), acc), {});
console.log(`${stages.length} stages écrits dans ${path.relative(ROOT, OUT)}`);
console.log('structure', count('structure'));
console.log('cycle', count('cycle'));
console.log('annee', count('annee'));
