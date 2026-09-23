(function () {
  'use strict';

  const CYCLES = {
    ing2: { label: 'Ingénieur 2e année', short: '2e année' },
    ing3: { label: 'Ingénieur 3e année', short: '3e année' },
    geo: { label: 'Géomètre-géomaticien', short: 'Géomètre' },
    lpro: { label: 'Licence professionnelle', short: 'Licence pro' }
  };
  const STRUCTURES = {
    labo: { label: 'Laboratoire', long: 'Laboratoire ou recherche' },
    entreprise: { label: 'Entreprise', long: 'Entreprise' },
    public: { label: 'Service public', long: 'Service public ou collectivité' }
  };
  const TYPES = { Pluri: 'Stage pluridisciplinaire', TFE: 'Travail de fin d’études' };
  // Tags des stages (générés par scripts/tags.mjs) : 10 techniques et 9 domaines d’application.
  const TAGS = {
    techniques: {
      geodesie: 'Géodésie', cartographie: 'Cartographie', teledetection: 'Télédétection', sig: 'SIG',
      photogrammetrie: 'Photogrammétrie', lasergrammetrie: 'Lasergrammétrie', topometrie: 'Topométrie',
      dev: 'Développement', modelisation3d: 'Modélisation 3D', ia: 'IA'
    },
    domaines: {
      eau: 'Eau', environnement: 'Environnement', urbanisme: 'Urbanisme', agriculture: 'Agriculture',
      littoral: 'Littoral', mobilite: 'Mobilité', patrimoine: 'Patrimoine', risques: 'Risques', energie: 'Énergie'
    }
  };
  const TAG_KEYS = Object.keys(TAGS.techniques).concat(Object.keys(TAGS.domaines));
  const FRANCE = ['France', 'Guyane', 'La Réunion', 'Guadeloupe', 'Martinique', 'Nouvelle-Calédonie', 'Polynésie française'];
  const EUROPE = [[36, -11], [60, 30]];
  const DESKTOP = window.matchMedia('(min-width: 900px)');

  const svg = (cls, body) => `<svg class="icon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
  const CHECK = svg('check', '<path d="M5 12.5l4.5 4.5L19 7.5"/>');
  const ICONS = {
    chevronRight: '<path d="M9.5 6.5l6 5.5-6 5.5"/>',
    chevronDown: '<path d="M6.5 9.5l5.5 5.5 5.5-5.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    place: '<path d="M12 21s-6.5-5.9-6.5-11a6.5 6.5 0 0 1 13 0c0 5.1-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    share: '<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M8.5 10.5H7a2.5 2.5 0 0 0-2.5 2.5v5A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5v-5a2.5 2.5 0 0 0-2.5-2.5h-1.5"/>',
    locate: '<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    labo: '<path d="M9.5 3.5h5M10.3 3.5v5.8L5.2 17.8a1.6 1.6 0 0 0 1.4 2.4h10.8a1.6 1.6 0 0 0 1.4-2.4l-5.1-8.5V3.5"/><path d="M7.5 14.5h9"/>',
    entreprise: '<rect x="3.5" y="7.5" width="17" height="12.5" rx="2.5"/><path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 12.5h17"/>',
    public: '<path d="M3.5 9L12 4.5 20.5 9"/><path d="M4.5 20h15M6.5 11.5v5.5M10.2 11.5v5.5M13.8 11.5v5.5M17.5 11.5v5.5"/>'
  };
  const PIN_PATH = 'M13 1C6.4 1 1 6.2 1 12.7c0 8.6 10.3 18.9 11.2 19.8a1.1 1.1 0 0 0 1.6 0C14.7 31.6 25 21.3 25 12.7 25 6.2 19.6 1 13 1z';
  const pinSvg = (cls) => `<svg class="${cls}" viewBox="0 0 26 34" aria-hidden="true"><path d="${PIN_PATH}"/><circle class="pin-dot" cx="13" cy="12.5" r="4.2"/></svg>`;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const fmt = (n) => n.toLocaleString('fr-FR');
  const plural = (n, one, many) => fmt(n) + '\u00a0' + (n > 1 ? many : one);
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  /* ---------- Compteurs à rouleaux ---------- */
  // Chaque chiffre est un rouleau (0-9 répété 5 fois) qui tourne comme sur un compteur mécanique :
  // vers le haut quand le nombre monte, vers le bas quand il baisse, et d'autant plus de crans que le chiffre est à droite.
  const REEL_REST = 20; // position de repos : la 3e série de 0-9, pour pouvoir tourner jusqu'à 19 crans dans les deux sens
  const REEL_DIGITS = Array.from({ length: 50 }, (_, i) => `<span>${i % 10}</span>`).join('');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setReel(strip, idx, ms, delay) {
    strip.style.transition = ms ? `transform ${ms}ms cubic-bezier(0.25, 1.15, 0.4, 1) ${delay}ms` : 'none';
    strip.style.transform = `translateY(${-idx * 2}%)`; // 50 chiffres : 2 % de la bande par cran
    strip.dataset.idx = idx;
  }
  function makeRoll() {
    const el = document.createElement('span');
    el.className = 'roll';
    el.innerHTML = '<span class="sr-only"></span><span class="roll-digits" aria-hidden="true"></span>';
    return el;
  }
  function roll(el, n) {
    const from = el._n || 0;
    if (el._n === n) return;
    el._n = n;
    const text = fmt(n);
    el.firstElementChild.textContent = text;
    const box = el.lastElementChild;
    const old = $$('.reel', box).reverse(); // de droite à gauche : les unités d'abord
    let pos = text.replace(/\D/g, '').length;
    const nodes = Array.from(text).map((c) => {
      if (!/\d/.test(c)) {
        const sep = document.createElement('span');
        sep.textContent = c;
        return sep;
      }
      pos -= 1;
      let reel = old[pos];
      if (!reel) {
        reel = document.createElement('span');
        reel.className = 'reel';
        reel.innerHTML = `<span class="reel-strip">${REEL_DIGITS}</span>`;
        const strip = reel.firstChild;
        setReel(strip, REEL_REST, 0, 0);
        strip.addEventListener('transitionend', () => setReel(strip, REEL_REST + (+strip.dataset.idx % 10), 0, 0));
      }
      reel._pos = pos;
      return reel;
    });
    box.replaceChildren(...nodes);
    const reels = nodes.filter((r) => r.className === 'reel');
    // Chaque rouleau repart du chiffre de l'ancien nombre, sans transition…
    reels.forEach((r) => setReel(r.firstChild, REEL_REST + Math.floor(from / 10 ** r._pos) % 10, 0, 0));
    if (reducedMotion.matches) {
      reels.forEach((r) => setReel(r.firstChild, REEL_REST + Math.floor(n / 10 ** r._pos) % 10, 0, 0));
      return;
    }
    void box.offsetWidth;
    // … puis tourne d'autant de crans qu'un vrai compteur, plafonnés à 19 en gardant le bon chiffre d'arrivée.
    reels.forEach((r) => {
      const p = 10 ** r._pos;
      const raw = Math.floor(n / p) - Math.floor(from / p);
      if (!raw) return;
      const steps = Math.abs(raw) > 19 ? Math.sign(raw) * (10 + Math.abs(raw) % 10) : raw;
      const strip = r.firstChild;
      setReel(strip, +strip.dataset.idx + steps, 420 + 40 * Math.abs(steps), 50 * r._pos);
    });
  }
  // Remplit el avec « [avant]1 234 stages », le nombre en rouleaux, en gardant les rouleaux d'un appel à l'autre.
  function rollCount(el, n, one, many, before) {
    if (!el._roll || !el.contains(el._roll)) {
      el._roll = el._roll || makeRoll();
      el.replaceChildren(before || '', el._roll, ...(one ? [' ', document.createElement('span')] : []));
    }
    roll(el._roll, n);
    if (one) el.lastElementChild.textContent = n > 1 ? many : one;
  }

  let STAGES = [];
  let YEARS = [];
  let PARCOURS = [];
  let COUNTRIES = [];
  let countryCounts = {}; // comptes par pays, pour le menu du filtre Lieu
  let parcoursCounts = {}; // comptes par parcours, pour les lignes des filtres et le menu des filtres rapides
  let parcoursOpen = false; // parcours de 3e année dépliés sous la ligne ing3 (état d'affichage seul)
  let resultsOpen = false; // panneau de la liste des stages, ouvert (bureau)
  let sheetBeforeDetail = 'peek'; // hauteur de la feuille mobile à retrouver en fermant la fiche
  const byId = new Map();
  const markers = new Map();

  const DEFAULTS = { annee: 'all', cycles: Object.keys(CYCLES), structures: Object.keys(STRUCTURES), lieu: 'all', q: '' };
  // Parcours : tous cochés (en décocher un l'exclut) ; tags : aucun coché (en cocher un inclut, OU entre eux).
  // Le filtre Lieu : « all » (partout), un choix de LIEUX (la France hexagonale, ou l'étranger et l'outre-mer) ou un pays.
  const state = { annee: 'all', cycles: new Set(DEFAULTS.cycles), structures: new Set(DEFAULTS.structures), lieu: 'all', parcours: new Set(), tags: new Set(), q: '', sel: null };

  /* ---------- Carte ---------- */
  const map = L.map('map', { zoomControl: false, minZoom: 2, maxZoom: 19, worldCopyJump: true });
  const geopf = (layer, format, maxZoom) => L.tileLayer(
    `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=normal&TILEMATRIXSET=PM&FORMAT=${format}&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`,
    { maxZoom, attribution: '&copy; <a href="https://www.ign.fr/" target="_blank" rel="noopener">IGN</a> · Géoplateforme' }
  );
  const CARTO_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
  // Le Plan IGN n'a pas de tuiles détaillées partout hors de France : une tuile manquante est remplacée par un plan clair.
  function withFallback(layer) {
    layer.getAttribution = () => layer.options.attribution + ', ' + OSM_ATTRIBUTION + ', &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>';
    layer.on('tileerror', (e) => {
      if (e.tile.dataset.fallback) return;
      e.tile.dataset.fallback = '1';
      e.tile.src = L.Util.template(CARTO_URL, Object.assign({ s: 'abcd'[(e.coords.x + e.coords.y) % 4], r: L.Browser.retina ? '@2x' : '' }, e.coords));
    });
    return layer;
  }

  // Apparence : automatique (celle du système), claire ou sombre ; le choix est gardé dans le navigateur.
  const APPEARANCES = [
    { id: 'auto', label: 'Automatique' },
    { id: 'light', label: 'Clair' },
    { id: 'dark', label: 'Sombre' }
  ];
  const DARK = window.matchMedia('(prefers-color-scheme: dark)');
  let appearance = 'auto';
  try { appearance = localStorage.getItem('apparence') || 'auto'; } catch (e) { /* stockage indisponible */ }
  if (!APPEARANCES.some((a) => a.id === appearance)) appearance = 'auto';
  const theme = () => (appearance === 'auto' ? (DARK.matches ? 'dark' : 'light') : appearance);

  // Plan clair : fond vectoriel aux couleurs de Lucent (assets/basemap.js), dans l'apparence choisie.
  const vector = L.maplibreGL({
    style: window.lucentBasemapStyle(theme()),
    attribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> ' + OSM_ATTRIBUTION
  });
  function applyTheme() {
    const t = theme();
    if (document.documentElement.dataset.theme === t) return;
    document.documentElement.dataset.theme = t;
    document.querySelector('meta[name="theme-color"]').content = t === 'dark' ? '#000000' : '#f2f2f7';
    const gl = vector.getMaplibreMap && vector.getMaplibreMap();
    if (gl) gl.setStyle(window.lucentBasemapStyle(t));
    clusters.refreshClusters(); // les parts de cycle des groupes prennent les couleurs du thème
  }
  function setAppearance(id) {
    appearance = id;
    try {
      if (id === 'auto') localStorage.removeItem('apparence');
      else localStorage.setItem('apparence', id);
    } catch (e) { /* le choix vaut pour cette visite seulement */ }
    applyTheme();
  }
  DARK.addEventListener('change', () => { if (appearance === 'auto') applyTheme(); });

  const BASES = [
    { id: 'clair', label: 'Plan clair', layer: vector },
    { id: 'plan', label: 'Plan IGN', layer: withFallback(geopf('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', 'image/png', 19)) },
    { id: 'ortho', label: 'Photographies aériennes', layer: withFallback(geopf('ORTHOIMAGERY.ORTHOPHOTOS', 'image/jpeg', 19)) }
  ];
  let base = null;
  // Le fond choisi est noté sur <html> : les pins et les groupes gardent un centre blanc sur le Plan IGN et les photos (style.css).
  function setBase(next) {
    if (base) map.removeLayer(base.layer);
    base = next;
    base.layer.addTo(map);
    document.documentElement.dataset.base = base.id;
  }
  setBase(BASES[0]);
  map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');

  const icons = {};
  function pinIcon(cycle, selected) {
    const key = cycle + (selected ? '-sel' : '');
    if (!icons[key]) {
      const size = selected ? [34, 44] : [26, 34];
      icons[key] = L.divIcon({
        className: `pin pin--${cycle}${selected ? ' pin--selected' : ''}`,
        html: pinSvg(''),
        iconSize: size,
        iconAnchor: [size[0] / 2, size[1] - 1]
      });
    }
    return icons[key];
  }

  const clusters = L.markerClusterGroup({
    maxClusterRadius: 44,
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    chunkedLoading: true,
    iconCreateFunction(cluster) {
      const children = cluster.getAllChildMarkers();
      const counts = {};
      children.forEach((m) => { counts[m.options.cycle] = (counts[m.options.cycle] || 0) + 1; });
      let acc = 0;
      const stops = Object.keys(CYCLES).filter((k) => counts[k]).map((k) => {
        const a0 = (acc / children.length) * 360;
        acc += counts[k];
        return `${cssVar('--c-' + k)} ${a0.toFixed(1)}deg ${((acc / children.length) * 360).toFixed(1)}deg`;
      });
      const n = children.length;
      const large = n >= 100;
      const size = large ? 50 : 42;
      return L.divIcon({
        className: 'cluster-icon',
        html: `<div class="cluster${large ? ' large' : ''}" style="background: conic-gradient(${stops.join(', ')})"><span>${n}</span></div>`,
        iconSize: [size, size]
      });
    }
  });
  map.addLayer(clusters);

  function mapPadding() {
    // Bureau : le panneau des résultats ouvert réduit d'autant la partie utile de la carte.
    const gauche = 16 * 2 + 392 + 24 + (resultsOpen ? 392 + 16 : 0);
    // La fiche ouverte occupe le côté droit, à gauche des outils (sous 1280 px, elle se pose sur la liste ouverte).
    const card = state.sel !== null && !(resultsOpen && window.innerWidth < 1280);
    if (DESKTOP.matches) return { paddingTopLeft: [gauche, 32], paddingBottomRight: [card ? 16 + 48 + 12 + 380 + 24 : 80, 32] };
    // Hauteur visée par la feuille (la transition CSS peut être en cours) : voir style.css.
    const H = sheetHeights();
    const sheet = H[document.body.dataset.sheet] || H.peek;
    return { paddingTopLeft: [24, 96], paddingBottomRight: [72, sheet + 32] };
  }

  /* ---------- Filtres ---------- */
  function inFrance(pays) { return FRANCE.includes(pays); }
  function isFrance(s) { return inFrance(s.pays); }
  // France hexagonale, Corse comprise : un stage noté « France » mais situé outre-mer (Saint-Denis de La Réunion,
  // Cayenne, Papeete…) n'en fait pas partie.
  function inHexagone(s) { return s.lat > 41 && s.lat < 51.5 && s.lon > -5.5 && s.lon < 10; }
  function isHexagone(s) { return s.pays === 'France' && inHexagone(s); }
  // Choix du filtre Lieu autres qu'un pays, dans l'ordre du menu.
  const LIEUX = {
    'hors-hexagone': { label: 'Étranger et outre-mer', test: (s) => !isHexagone(s) },
    hexagone: { label: 'France hexagonale', test: isHexagone }
  };
  const lieuChoice = (v) => (Object.hasOwn(LIEUX, v) ? LIEUX[v] : null);
  function matches(s, skip) {
    const sk = skip || '';
    if (state.annee !== 'all' && s.annee !== state.annee) return false;
    if (!sk.includes('cycle') && !state.cycles.has(s.cycle)) return false;
    if (!sk.includes('structure') && !state.structures.has(s.structure)) return false;
    if (!sk.includes('lieu') && state.lieu !== 'all') {
      const choice = lieuChoice(state.lieu);
      if (choice ? !choice.test(s) : s.pays !== state.lieu) return false;
    }
    if (!sk.includes('parcours') && s.parcours && !state.parcours.has(s.parcours)) return false;
    if (!sk.includes('tags') && state.tags.size && !s.tags.some((t) => state.tags.has(t))) return false;
    if (state.q) {
      const words = norm(state.q).split(/\s+/).filter(Boolean);
      if (!words.every((w) => s._text.includes(w))) return false;
    }
    return true;
  }
  function changedCount() {
    let n = 0;
    if (state.cycles.size !== DEFAULTS.cycles.length) n++;
    if (state.structures.size !== DEFAULTS.structures.length) n++;
    if (state.lieu !== 'all') n++;
    if (state.parcours.size !== PARCOURS.length) n++;
    if (state.tags.size) n++;
    return n;
  }
  function isDefault() { return !changedCount() && state.annee === 'all' && !state.q; }

  // Parcours de 3e année, menu des filtres rapides (mobile) : « Tous les parcours » exclut les autres choix.
  // Depuis « Tous », toucher un parcours ne garde que lui ; les touchers suivants en ajoutent ou en retirent,
  // et retirer le dernier revient à tous.
  const allParcours = () => state.parcours.size === PARCOURS.length;
  function pickParcours(v) {
    if (v === 'all') state.parcours = new Set(PARCOURS);
    else if (allParcours()) state.parcours = new Set([v]);
    else {
      if (state.parcours.has(v)) state.parcours.delete(v); else state.parcours.add(v);
      if (!state.parcours.size) state.parcours = new Set(PARCOURS);
    }
    state.cycles.add('ing3'); // sinon le parcours choisi resterait masqué
  }
  function parcoursSummary() {
    if (allParcours()) return null;
    if (!state.parcours.size) return 'Aucun parcours';
    return state.parcours.size === 1 ? [...state.parcours][0] : `${state.parcours.size} parcours`;
  }

  /* ---------- Rendu des contrôles ---------- */
  const MENUS = {
    annee: { name: 'Année', options: () => YEARS, label: (v) => (v === 'all' ? 'Toutes les années' : v) },
    lieu: {
      // « null » trace un séparateur dans le menu : les deux choix autour de la France hexagonale à part, puis les pays.
      name: 'Lieu', options: () => [...Object.keys(LIEUX), null, ...COUNTRIES],
      label: (v) => (v === 'all' ? 'Partout' : lieuChoice(v) ? lieuChoice(v).label : v),
      count: (v) => countryCounts[v] || 0
    },
    // Choix multiple : le menu reste ouvert pendant qu'on coche.
    parcours: {
      name: 'Parcours', heading: 'Parcours de 3e année', multi: true, options: () => PARCOURS,
      label: (v) => (v === 'all' ? 'Tous les parcours' : v),
      count: (v) => parcoursCounts[v] || 0,
      selected: (v) => (v === 'all' ? allParcours() : !allParcours() && state.parcours.has(v)),
      summary: parcoursSummary,
      pick: pickParcours
    }
  };
  function renderMenu(key) {
    const m = MENUS[key];
    const selected = m.selected || ((v) => state[key] === v);
    const item = (v) => `
      <button type="button" class="menu-item" role="option" data-option="${esc(v)}" aria-selected="${selected(v)}" tabindex="-1">
        ${CHECK}${esc(m.label(v))}${m.count && v !== 'all' ? `<span class="menu-count">${fmt(m.count(v))}</span>` : ''}
      </button>`;
    const menu = $('[data-options-menu]');
    const sep = '<div class="menu-sep" role="separator"></div>';
    menu.setAttribute('aria-label', m.heading || m.name);
    menu.setAttribute('aria-multiselectable', String(!!m.multi));
    const heading = m.heading ? `<div class="menu-heading" aria-hidden="true">${m.heading}${m.multi ? '<small>Plusieurs choix possibles</small>' : ''}</div>` : '';
    menu.innerHTML = heading + item('all') + sep + m.options().map((v) => (v === null ? sep : item(v))).join('');
  }

  // Les contrôles sont redessinés à chaque filtre : le focus clavier revient sur le même contrôle.
  function focusKey(el) {
    const box = el && el.closest && el.closest('[data-cycles], [data-structure-rows], [data-tags], [data-quick-filters], [data-detail-card], [data-detail]');
    if (!box) return null;
    const attr = ['data-cycle', 'data-structure', 'data-tag', 'data-parcours', 'data-menu', 'data-toggle-parcours'].find((a) => el.hasAttribute(a));
    return attr ? { box, sel: `[${attr}="${CSS.escape(el.getAttribute(attr))}"]` } : null;
  }

  function renderControls() {
    const focused = focusKey(document.activeElement);
    const cycleCounts = {};
    const structCounts = {};
    const tagCounts = {};
    countryCounts = {};
    parcoursCounts = {};
    STAGES.forEach((s) => {
      if (matches(s, 'cycle')) cycleCounts[s.cycle] = (cycleCounts[s.cycle] || 0) + 1;
      if (matches(s, 'structure')) structCounts[s.structure] = (structCounts[s.structure] || 0) + 1;
      if (s.parcours && matches(s, 'cycle+parcours')) parcoursCounts[s.parcours] = (parcoursCounts[s.parcours] || 0) + 1;
      // Les comptes du menu Lieu ignorent le filtre de lieu : c'est ce qu'on obtiendra en le choisissant.
      if (matches(s, 'lieu')) {
        countryCounts[s.pays] = (countryCounts[s.pays] || 0) + 1;
        Object.keys(LIEUX).forEach((k) => { if (LIEUX[k].test(s)) countryCounts[k] = (countryCounts[k] || 0) + 1; });
      }
      if (matches(s, 'tags')) s.tags.forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    });

    // Ingénieur 3e année : une ligne « Parcours » en retrait, sous la ligne du cycle, déplie
    // les parcours ; cochés, ils s'affichent indentés sous elle.
    const cycleRow = (k) => `
      <button type="button" class="row" data-cycle="${k}" aria-pressed="${state.cycles.has(k)}">
        ${pinSvg('pin-glyph pin--' + k)}
        <span class="row-label">${CYCLES[k].label}</span>
        <span class="row-count">${fmt(cycleCounts[k] || 0)}</span>
        ${CHECK}
      </button>`;
    const parcoursValue = state.parcours.size === PARCOURS.length ? 'Tous'
      : state.parcours.size ? `${state.parcours.size} sur ${PARCOURS.length}` : 'Aucun';
    const parcoursRows = !PARCOURS.length ? '' : `
      <button type="button" class="row row-parcours" data-toggle-parcours aria-expanded="${parcoursOpen}">
        <span class="row-label">Parcours de 3e année</span>
        <span class="row-count">${parcoursValue}</span>
        ${svg('chevron', ICONS.chevronRight)}
      </button>
      ${parcoursOpen ? `<div class="subrows" role="group" aria-label="Parcours">${PARCOURS.map((p) => `
        <button type="button" class="row row-sub" data-parcours="${esc(p)}" aria-pressed="${state.parcours.has(p)}">
          <span class="row-label">${esc(p)}</span>
          <span class="row-count">${fmt(parcoursCounts[p] || 0)}</span>
          ${CHECK}
        </button>`).join('')}</div>` : ''}`;
    const cycleRows = Object.keys(CYCLES).map((k) => cycleRow(k) + (k === 'ing3' ? parcoursRows : '')).join('');
    $$('[data-cycles]').forEach((el) => { el.innerHTML = cycleRows; });

    $$('[data-structure-rows]').forEach((el) => {
      el.innerHTML = Object.keys(STRUCTURES).map((k) => `
        <button type="button" class="row" data-structure="${k}" aria-pressed="${state.structures.has(k)}">
          ${svg('lead', ICONS[k])}
          <span class="row-label">${STRUCTURES[k].label}</span>
          <span class="row-count">${fmt(structCounts[k] || 0)}</span>
          ${CHECK}
        </button>`).join('');
    });

    const tagChip = (t, label) => `
      <button type="button" class="tag-chip" data-tag="${t}" aria-pressed="${state.tags.has(t)}">
        <span>${label}</span><span class="tag-count">${fmt(tagCounts[t] || 0)}</span>
      </button>`;
    $$('[data-tags]').forEach((el) => {
      const group = TAGS[el.dataset.tags] || TAGS.techniques;
      el.innerHTML = Object.keys(group).map((t) => tagChip(t, group[t])).join('');
    });

    // Mobile : filtres rapides dans la feuille (année, cycles, parcours de 3e année, lieu), les mêmes que sur ordinateur.
    const quickMenu = (key) => {
      const m = MENUS[key];
      const value = m.summary ? m.summary() : state[key] !== 'all' ? m.label(state[key]) : null;
      return `
        <button type="button" class="chip${value ? ' is-set' : ''}" data-menu="${key}" aria-haspopup="listbox" aria-expanded="false" aria-label="${m.heading || m.name} : ${esc(value || m.label('all'))}">
          <span>${esc(value || m.name)}</span>${svg('chevron', ICONS.chevronDown)}
        </button>`;
    };
    const quickCycle = (k) => `
      <button type="button" class="chip" data-cycle="${k}" aria-pressed="${state.cycles.has(k)}" style="--cycle: var(--c-${k})">
        <span class="dot"></span>${CYCLES[k].short}
      </button>`;
    // La capsule des parcours suit celle de la 3e année, dont elle affine le filtre.
    const quickCycles = Object.keys(CYCLES).map((k) => quickCycle(k) + (k === 'ing3' && PARCOURS.length ? quickMenu('parcours') : '')).join('');
    $$('[data-quick-filters]').forEach((el) => {
      const scroll = el.scrollLeft;
      el.innerHTML = quickMenu('annee') + quickCycles + quickMenu('lieu');
      el.scrollLeft = scroll;
    });

    $$('[data-menu-value]').forEach((el) => {
      const k = el.dataset.menuValue;
      el.textContent = MENUS[k].label(state[k]);
      el.closest('.select-row').classList.toggle('is-set', state[k] !== 'all');
    });
    $$('[data-search]').forEach((input) => { if (input.value !== state.q) input.value = state.q; });

    const changed = changedCount();
    const badge = $('[data-filter-badge]');
    badge.hidden = !changed;
    badge.textContent = changed;
    $('[data-action="open-filters"]').setAttribute('aria-label', changed ? `Filtres, ${changed} actif${changed > 1 ? 's' : ''}` : 'Filtres');
    // Réinitialiser : masqué quand rien n'est filtré, sauf dans la feuille des filtres où il reste visible, inactif.
    // Dans le pied du panneau, il se replie en animation plutôt que de disparaître d'un coup.
    $$('[data-action="reset"]').forEach((b) => {
      if (b.closest('[data-filters-sheet]')) b.disabled = isDefault();
      else if (b.closest('.panel-footer')) { b.classList.toggle('is-collapsed', isDefault()); b.inert = isDefault(); }
      else b.hidden = isDefault();
    });
    restoreFocus(focused);
    edgeUpdaters.forEach((f) => f());
  }
  function restoreFocus(focused) {
    if (!focused || focused.box.contains(document.activeElement)) return;
    const el = $(focused.sel, focused.box);
    if (el) el.focus({ preventScroll: true });
  }

  // Fondu en haut ou en bas d'une zone qui défile, seulement quand il reste du contenu de ce côté.
  const edgeUpdaters = [];
  $$('[data-scroll-fade]').forEach((el) => {
    const f = () => {
      el.classList.toggle('fade-top', el.scrollTop > 1);
      el.classList.toggle('fade-bottom', el.scrollTop + el.clientHeight < el.scrollHeight - 1);
    };
    el.addEventListener('scroll', f, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(f).observe(el);
    edgeUpdaters.push(f);
  });

  /* ---------- Liste et carte ---------- */
  let visible = [];
  let listLimit = 200;

  function update(options) {
    const opts = options || {};
    visible = STAGES.filter((s) => matches(s));
    const abroad = visible.filter((s) => !isFrance(s)).length;
    const countries = new Set(visible.map((s) => s.pays)).size;

    $$('[data-count]').forEach((el) => rollCount(el, visible.length, 'stage', 'stages'));
    // L'année est déjà dans les filtres rapides de la feuille : le résumé donne les pays.
    $('[data-summary]').textContent = `${plural(countries, 'pays', 'pays')} · ${fmt(abroad)} à l’étranger`;
    rollCount($('[data-apply]'), visible.length, 'stage', 'stages', 'Afficher ');
    // Les chiffres clés gardent leurs éléments pour que les rouleaux tournent d'une valeur à l'autre.
    const stats = $('[data-stats]');
    if (!stats.children.length) stats.innerHTML = '<div class="stat"><dt></dt><dd></dd></div>'.repeat(3);
    [[visible.length, 'stage', 'stages'], [countries, 'pays', 'pays'], [abroad, 'à l’étranger', 'à l’étranger']].forEach(([n, one, many], i) => {
      const stat = stats.children[i];
      stat.firstElementChild.textContent = n > 1 ? many : one;
      rollCount(stat.lastElementChild, n);
    });

    if (state.sel !== null && !visible.some((s) => s.id === state.sel)) setSelection(null, { silent: true });

    clusters.clearLayers();
    clusters.addLayers(visible.map((s) => markers.get(s.id)));

    if (!opts.keepLimit) listLimit = 200;
    renderList();
    renderControls();
    renderResultsButton();
    if (state.sel !== null) renderDetail(); // les tags de la fiche suivent les filtres
    writeHash();
  }

  function listRow(s) {
    return `
      <button type="button" class="item" data-id="${esc(s.id)}" aria-current="${s.id === state.sel}">
        ${pinSvg('pin-glyph pin--' + s.cycle)}
        <span class="item-text">
          <span class="item-title">${esc(s.org || 'Structure non renseignée')}</span>
          <span class="item-sub">${esc(placeOf(s))} · ${CYCLES[s.cycle].short}</span>
        </span>
      </button>`;
  }

  function renderList() {
    let html;
    if (!visible.length) {
      html = `<div class="empty">${svg('', ICONS.search)}<strong>Aucun stage</strong><span>${state.q
        ? `Rien ne correspond à « ${esc(state.q.trim())} » avec ces filtres. Vérifiez l’orthographe ou essayez un autre mot.`
        : 'Élargissez l’année, le cycle ou le lieu pour voir plus de stages.'}</span>
        <button type="button" class="plain" data-action="reset">Réinitialiser les filtres</button></div>`;
    } else {
      // La liste suit l'ordre des données (année décroissante) : un intertitre par année.
      const perYear = {};
      visible.forEach((s) => { perYear[s.annee] = (perYear[s.annee] || 0) + 1; });
      let year = null;
      const rows = [];
      visible.slice(0, listLimit).forEach((s) => {
        if (s.annee !== year) {
          year = s.annee;
          rows.push(`<h3 class="list-heading"><span>${esc(year)}</span><span>${plural(perYear[year], 'stage', 'stages')}</span></h3>`);
        }
        rows.push(listRow(s));
      });
      if (visible.length > listLimit) {
        rows.push(`<button type="button" class="plain more" data-action="more">Afficher ${plural(Math.min(200, visible.length - listLimit), 'stage de plus', 'stages de plus')}</button>`);
      }
      html = rows.join('');
    }
    // Deux contenants partagent la même liste : le panneau adjacent (bureau) et la feuille (mobile).
    $$('[data-list]').forEach((list) => { list.innerHTML = html; });
  }

  /* ---------- Panneau de la liste des stages (bureau) ---------- */
  function renderResultsButton() {
    $('[data-action="toggle-results"]').setAttribute('aria-expanded', String(resultsOpen));
    const label = $('[data-results-label]');
    if (resultsOpen) label.textContent = 'Fermer la liste';
    else rollCount(label, visible.length, 'stage', 'stages', 'Afficher ');
  }
  function setResults(open) {
    resultsOpen = open;
    $('[data-results]').hidden = !open;
    document.body.classList.toggle('results-open', open);
    renderResultsButton();
  }

  function placeOf(s) {
    return [s.ville, s.pays === 'France' ? '' : s.pays].filter(Boolean).join(', ') || s.pays || 'Lieu non renseigné';
  }

  /* ---------- Modes d’affichage ---------- */
  function showView(name) {
    $$('[data-view]').forEach((v) => { v.hidden = v.dataset.view !== name; });
  }

  /* ---------- Fiche ---------- */
  const tagLabel = (t) => TAGS.techniques[t] || TAGS.domaines[t] || t;
  function detailHtml(s, withClose) {
    const org = s.org || 'Structure non renseignée';
    // Autres stages de la même structure, parmi ceux qu'affichent les filtres.
    const others = s.org ? visible.filter((o) => o.org === s.org && o.id !== s.id) : [];
    const otherRow = (o) => `
      <button type="button" class="item" data-id="${esc(o.id)}">
        ${pinSvg('pin-glyph pin--' + o.cycle)}
        <span class="item-text">
          <span class="item-title">${o.annee} · ${CYCLES[o.cycle].short}</span>
          <span class="item-sub">${esc(o.sujet || placeOf(o))}</span>
        </span>
      </button>`;
    return `
      <div class="detail">
        <div class="detail-head">
          <div class="detail-titles">
            <span class="detail-cycle" style="--cycle: var(--c-${s.cycle})"><span class="dot"></span>${CYCLES[s.cycle].label}${s.parcours ? ' · ' + esc(s.parcours) : ''}</span>
            <h2>${esc(org)}</h2>
            <div class="detail-place">${svg('', ICONS.place)}${esc([s.ville, s.pays].filter(Boolean).join(', ') || 'Lieu non renseigné')}</div>
          </div>
          ${withClose ? `<button type="button" class="close" data-action="close-detail" aria-label="Fermer">${svg('', ICONS.close)}</button>` : ''}
        </div>
        <div class="detail-actions">
          <button type="button" class="action tinted" data-action="share">${svg('', ICONS.share)}<span>Partager</span></button>
          <button type="button" class="action" data-action="locate">${svg('', ICONS.locate)}<span>Centrer</span></button>
        </div>
        <dl>
          <div><dt>Année</dt><dd>${s.annee}</dd></div>
          <div><dt>Structure</dt><dd>${STRUCTURES[s.structure].long}</dd></div>
          ${s.type ? `<div class="wide"><dt>Type de stage</dt><dd>${TYPES[s.type] || esc(s.type)}</dd></div>` : ''}
        </dl>
        ${s.sujet ? `<section class="detail-section"><h3>Sujet</h3><p class="detail-subject">${esc(s.sujet)}</p></section>` : ''}
        ${s.tags.length ? `<section class="detail-section"><h3>Tags</h3><div class="tag-chips" role="group" aria-label="Tags du stage">${s.tags.map((t) => `
          <button type="button" class="tag-chip" data-tag="${t}" aria-pressed="${state.tags.has(t)}">${state.tags.has(t) ? CHECK : ''}${tagLabel(t)}</button>`).join('')}
        </div></section>` : ''}
        ${others.length ? `<section class="detail-section"><h3>Dans la même structure · ${fmt(others.length)}</h3>
          <div class="card list">${others.slice(0, 5).map(otherRow).join('')}${others.length > 5 ? `
            <button type="button" class="plain more" data-action="same-org">Voir les ${fmt(others.length + 1)} stages</button>` : ''}</div>
        </section>` : ''}
      </div>`;
  }
  function renderDetail() {
    const s = byId.get(state.sel);
    if (!s) return;
    const focused = focusKey(document.activeElement);
    $('[data-detail-card]').innerHTML = detailHtml(s, true);
    $('[data-detail]').innerHTML = detailHtml(s, false);
    restoreFocus(focused);
  }

  function reveal(m, zoom) {
    clusters.zoomToShowLayer(m, () => {
      const target = Math.max(map.getZoom(), zoom || 0);
      if (target !== map.getZoom()) centerOn(m.getLatLng(), target);
      else panIntoView(m.getLatLng());
    });
  }

  function setSelection(id, options) {
    const opts = options || {};
    const prev = state.sel;
    if (prev !== null && markers.has(prev)) {
      const m = markers.get(prev);
      m.setIcon(pinIcon(m.options.cycle, false));
      m.setZIndexOffset(0);
    }
    state.sel = id;
    const s = id !== null ? byId.get(id) : null;
    const card = $('[data-detail-card]');
    const detailView = $('[data-view="detail"]');
    const wasDetail = !detailView.hidden;

    if (!s) {
      card.hidden = true;
      showView('list');
      if (wasDetail || document.body.dataset.sheet === 'detail') setSheet(sheetBeforeDetail);
    } else {
      const m = markers.get(id);
      m.setIcon(pinIcon(s.cycle, true));
      m.setZIndexOffset(1000);
      renderDetail();
      card.hidden = false;
      card.scrollTop = 0;
      $('[data-detail]').scrollTop = 0;
      if (!DESKTOP.matches) {
        if (!wasDetail) sheetBeforeDetail = document.body.dataset.sheet === 'full' ? 'full' : 'peek';
        showView('detail');
        if (!wasDetail || document.body.dataset.sheet !== 'full') setSheet('detail');
      }
      if (opts.reveal) reveal(m, opts.zoom);
      else if (!DESKTOP.matches) setTimeout(() => panIntoView(m.getLatLng()), 450);
    }
    $$('[data-list] .item').forEach((el) => el.setAttribute('aria-current', String(el.dataset.id === id)));
    // La liste ouverte suit la carte : la ligne du stage choisi vient dans la vue.
    if (s && resultsOpen) {
      const row = $(`[data-results] .item[data-id="${CSS.escape(id)}"]`);
      if (row) row.scrollIntoView({ block: 'nearest' });
    }
    if (!opts.silent) writeHash();
  }

  // Centre un point dans la partie de la carte que les panneaux ne couvrent pas.
  function visibleCenterOffset() {
    const pad = mapPadding();
    const size = map.getSize();
    const tl = L.point(pad.paddingTopLeft);
    const br = size.subtract(L.point(pad.paddingBottomRight));
    return tl.add(br).divideBy(2).subtract(size.divideBy(2));
  }
  function centerOn(latlng, zoom) {
    const point = map.project(latlng, zoom).subtract(visibleCenterOffset());
    map.setView(map.unproject(point, zoom), zoom);
  }

  function panIntoView(latlng) {
    const pad = mapPadding();
    const size = map.getSize();
    const p = map.latLngToContainerPoint(latlng);
    const tl = L.point(pad.paddingTopLeft);
    const br = size.subtract(L.point(pad.paddingBottomRight));
    if (p.x < tl.x || p.y < tl.y || p.x > br.x || p.y > br.y) {
      const center = tl.add(br).divideBy(2);
      map.panBy(p.subtract(center), { animate: true });
    }
  }

  function fitVisible() {
    if (!visible.length) return;
    const bounds = L.latLngBounds(visible.map((s) => [s.lat, s.lon]));
    map.fitBounds(bounds, Object.assign({ maxZoom: 12 }, mapPadding()));
  }

  /* ---------- Partage ---------- */
  let toastTimer;
  function toast(text, done) {
    const el = $('[data-toast]');
    el.innerHTML = (done ? CHECK : '') + esc(text);
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
  }
  // L'adresse de la page porte le stage et les filtres : sur mobile, la feuille de partage du système ; ailleurs, le presse-papiers.
  async function shareStage() {
    const s = byId.get(state.sel);
    if (!s) return;
    writeHash();
    const url = location.href;
    if (navigator.share && !DESKTOP.matches) {
      try { await navigator.share({ title: `${s.org} · Carte des stages`, url }); } catch (e) { /* partage annulé */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('Lien copié', true);
    } catch (e) {
      toast('Copiez l’adresse de la page pour partager ce stage');
    }
  }

  /* ---------- Feuille mobile ---------- */
  // Mêmes hauteurs que style.css, marges de sécurité (encoche, barre d'accueil) comprises,
  // pour que la feuille se cale sans sauter à la fin d'un glissement.
  let safeProbe = null;
  function sheetHeights() {
    if (!safeProbe) {
      safeProbe = document.createElement('div');
      safeProbe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;'
        + 'padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
      document.body.appendChild(safeProbe);
    }
    const cs = getComputedStyle(safeProbe);
    const h = window.innerHeight;
    const peek = parseFloat(cssVar('--sheet-peek')) || 156;
    const full = h - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0) - 84;
    return { peek, detail: Math.min(540, h - 200), full };
  }
  function setSheet(mode) {
    document.body.dataset.sheet = mode;
    const g = $('.grabber');
    g.setAttribute('aria-label', mode === 'full' ? 'Réduire la feuille' : 'Agrandir la feuille');
    g.setAttribute('aria-expanded', String(mode === 'full'));
  }
  function toggleSheet() {
    const mode = document.body.dataset.sheet;
    if (state.sel !== null) return setSheet(mode === 'full' ? 'detail' : 'full');
    return setSheet(mode === 'full' ? 'peek' : 'full');
  }
  function openFilters(open) {
    $('[data-filters-sheet]').hidden = !open;
    $('[data-filters-scrim]').hidden = !open;
    document.body.classList.toggle('filters-open', open);
    if (open) {
      $('[data-filters-sheet] .close').focus();
      edgeUpdaters.forEach((f) => f());
    } else if (document.activeElement === document.body || $('[data-filters-sheet]').contains(document.activeElement)) {
      $('[data-action="open-filters"]').focus({ preventScroll: true });
    }
  }

  // Glisser la feuille par sa poignée ou son en-tête : elle suit le doigt, puis se cale
  // sur la hauteur la plus proche, ou la suivante dans le sens d'un geste rapide.
  let swallowClick = false;
  function draggable(el, onMove, onEnd) {
    let d = null;
    let frame = 0;
    el.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || !e.target.closest('[data-sheet-handle], [data-filters-handle]')) return;
      if (e.target.closest('button:not(.grabber)')) return;
      d = { id: e.pointerId, y: e.clientY, lastY: e.clientY, lastT: e.timeStamp, v: 0, moved: false, h: el.getBoundingClientRect().height };
    });
    el.addEventListener('pointermove', (e) => {
      if (!d || e.pointerId !== d.id) return;
      const dy = e.clientY - d.y;
      if (!d.moved) {
        if (Math.abs(dy) < 8) return;
        d.moved = true;
        // Le glissement part d'ici : la feuille suit le doigt sans rattraper d'un coup les 8 px de seuil.
        d.y = e.clientY;
        d.h = el.getBoundingClientRect().height;
        el.setPointerCapture(e.pointerId);
        el.classList.add('dragging');
      }
      // Vitesse lissée sur les derniers mouvements, pour ne pas dépendre d'un seul événement.
      if (e.timeStamp > d.lastT) {
        const v = (e.clientY - d.lastY) / (e.timeStamp - d.lastT);
        d.v = d.v * 0.4 + v * 0.6;
      }
      d.lastY = e.clientY;
      d.lastT = e.timeStamp;
      // Une mise à jour par image, pas une par événement tactile.
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (d && d.moved) onMove(d.lastY - d.y, d);
        });
      }
    });
    const end = (e) => {
      if (!d || e.pointerId !== d.id) return;
      const done = d;
      d = null;
      if (!done.moved) return;
      cancelAnimationFrame(frame);
      frame = 0;
      // Doigt immobile avant d'être levé : pas d'élan, la feuille se cale sur la hauteur la plus proche.
      if (e.timeStamp - done.lastT > 100) done.v = 0;
      onMove(e.clientY - done.y, done);
      swallowClick = true;
      setTimeout(() => { swallowClick = false; }, 0);
      // Transitions rétablies avant de caler la feuille : elle part de là où le doigt l'a laissée.
      el.classList.remove('dragging');
      onEnd(e.clientY - done.y, done);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  const panel = $('.panel');
  draggable(panel, (dy, d) => {
    if (DESKTOP.matches) return;
    panel.style.height = `${Math.max(96, Math.min(sheetHeights().full, d.h - dy))}px`;
  }, (dy, d) => {
    if (DESKTOP.matches) return;
    const h = panel.getBoundingClientRect().height;
    const H = sheetHeights();
    const stops = state.sel !== null
      ? [['close', H.peek], ['detail', H.detail], ['full', H.full]]
      : [['peek', H.peek], ['full', H.full]];
    let target;
    if (d.v < -0.4) target = stops.find((st) => st[1] > h + 1) || stops[stops.length - 1];
    else if (d.v > 0.4) target = stops.slice().reverse().find((st) => st[1] < h - 1) || stops[0];
    else target = stops.reduce((a, b) => (Math.abs(b[1] - h) < Math.abs(a[1] - h) ? b : a));
    if (target[0] === 'close') setSelection(null);
    else setSheet(target[0]);
    // En dernier : lire un style entre-temps figerait la feuille sur son ancienne hauteur, sans transition.
    panel.style.height = '';
  });

  const filtersSheet = $('[data-filters-sheet]');
  draggable(filtersSheet, (dy) => {
    filtersSheet.style.transform = `translateY(${Math.max(0, dy)}px)`;
  }, (dy, d) => {
    filtersSheet.style.transform = '';
    if (dy > 120 || d.v > 0.5) openFilters(false);
  });

  /* ---------- Adresse partageable ---------- */
  function writeHash() {
    const p = new URLSearchParams();
    if (state.annee !== 'all') p.set('annee', state.annee);
    if (state.cycles.size !== DEFAULTS.cycles.length) p.set('cycle', [...state.cycles].join(','));
    if (state.structures.size !== DEFAULTS.structures.length) p.set('structure', [...state.structures].join(','));
    if (state.lieu !== 'all') p.set('lieu', state.lieu);
    if (state.parcours.size !== PARCOURS.length) p.set('parcours', [...state.parcours].join(','));
    if (state.tags.size) p.set('tags', [...state.tags].join(','));
    if (state.q) p.set('q', state.q);
    if (state.sel !== null) p.set('stage', state.sel);
    const hash = p.toString();
    const url = location.pathname + location.search + (hash ? '#' + hash : '');
    if (url !== location.pathname + location.search + location.hash) history.replaceState(null, '', url);
  }
  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    const list = (key, all) => {
      if (!p.has(key)) return new Set(all);
      return new Set(p.get(key).split(',').filter((k) => all.includes(k)));
    };
    state.annee = YEARS.includes(p.get('annee')) ? p.get('annee') : 'all';
    state.cycles = list('cycle', DEFAULTS.cycles);
    state.structures = list('structure', DEFAULTS.structures);
    // Anciens liens : lieu=fr|abroad (segments), lieu=France ou abroad (anciens choix du menu) ; version intermédiaire : pays=Espagne.
    const lieu = p.get('lieu') || p.get('pays');
    if (lieu === 'fr' || lieu === 'France') state.lieu = 'hexagone';
    else if (lieu === 'abroad') state.lieu = 'hors-hexagone';
    else if (lieuChoice(lieu) || COUNTRIES.includes(lieu)) state.lieu = lieu;
    else state.lieu = 'all';
    state.parcours = p.has('parcours')
      ? new Set(p.get('parcours').split(',').filter((k) => PARCOURS.includes(k)))
      : new Set(PARCOURS);
    state.tags = new Set((p.get('tags') || '').split(',').filter((t) => TAG_KEYS.includes(t)));
    state.q = p.get('q') || '';
    const id = p.get('stage');
    return byId.has(id) ? id : null;
  }

  /* ---------- Export ---------- */
  function exportCsv() {
    const cols = [
      ['Année', (s) => s.annee], ['Cycle', (s) => CYCLES[s.cycle].label], ['Parcours', (s) => s.parcours || ''],
      ['Type de structure', (s) => STRUCTURES[s.structure].label], ['Structure', (s) => s.org], ['Ville', (s) => s.ville],
      ['Pays', (s) => s.pays], ['Sujet', (s) => s.sujet], ['Latitude', (s) => s.lat], ['Longitude', (s) => s.lon],
      ['Tags', (s) => s.tags.join(' | ')]
    ];
    const cell = (v) => `"${String(v === null || v === undefined ? '' : v).replace(/"/g, '""')}"`;
    const lines = [cols.map((c) => cell(c[0])).join(';')].concat(visible.map((s) => cols.map((c) => cell(c[1](s))).join(';')));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'stages' + (state.annee !== 'all' ? '-' + state.annee : '') + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  /* ---------- Fond de carte ---------- */
  function renderLayersMenu() {
    const item = (checked, attrs, label) => `
      <button type="button" role="menuitemradio" ${attrs} aria-checked="${checked}">
        ${CHECK}${label}
      </button>`;
    $('[data-layers-menu]').innerHTML =
      '<div class="menu-heading">Fond de carte</div>' +
      BASES.map((b) => item(base === b, `data-base="${b.id}"`, b.label)).join('') +
      '<div class="menu-sep" role="separator"></div><div class="menu-heading">Apparence</div>' +
      APPEARANCES.map((a) => item(appearance === a.id, `data-appearance="${a.id}"`, a.label)).join('');
  }
  function toggleLayersMenu(open) {
    const menu = $('[data-layers-menu]');
    const btn = $('[data-action="layers"]');
    const show = open === undefined ? menu.hidden : open;
    if (show) renderLayersMenu();
    menu.hidden = !show;
    btn.setAttribute('aria-expanded', String(show));
    if (show) $('button', menu).focus();
  }

  /* ---------- Menus d’options (année, parcours) ---------- */
  let menuTrigger = null;
  let menuAnchor = 0;
  function closeMenu(refocus) {
    if (!menuTrigger) return;
    const t = menuTrigger;
    $('[data-options-menu]').hidden = true;
    t.setAttribute('aria-expanded', 'false');
    menuTrigger = null;
    if (refocus) t.focus();
  }
  function openMenu(trigger) {
    closeMenu();
    const menu = $('[data-options-menu]');
    renderMenu(trigger.dataset.menu);
    menu.hidden = false;
    menuTrigger = trigger;
    trigger.setAttribute('aria-expanded', 'true');
    // Une capsule à moitié hors de la rangée des filtres rapides y défile d'abord en entier.
    if (trigger.closest('[data-quick-filters]')) trigger.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    // Sous le déclencheur, au-dessus s’il manque de place ; aligné à droite
    // dans une ligne large, à gauche sous une capsule.
    const r = trigger.getBoundingClientRect();
    menuAnchor = r.top;
    const gap = 8;
    const margin = 16;
    menu.style.cssText = `min-width: ${Math.max(220, Math.min(r.width, 280))}px; max-width: ${window.innerWidth - margin * 2}px;`;
    const width = menu.offsetWidth;
    const below = window.innerHeight - r.bottom - gap - margin;
    const above = r.top - gap - margin;
    const down = below >= Math.min(menu.scrollHeight, 320) || below >= above;
    const right = width < r.width;
    menu.dataset.placement = down ? 'bottom' : 'top';
    menu.dataset.align = right ? 'right' : 'left';
    menu.style.maxHeight = `${Math.max(down ? below : above, 132)}px`;
    if (down) menu.style.top = `${r.bottom + gap}px`;
    else menu.style.bottom = `${window.innerHeight - r.top + gap}px`;
    if (right) menu.style.right = `${window.innerWidth - r.right}px`;
    else menu.style.left = `${Math.max(margin, Math.min(r.left, window.innerWidth - width - margin))}px`;

    const current = $('[aria-selected="true"]', menu) || $('.menu-item', menu);
    current.focus({ preventScroll: true });
    menu.scrollTop = Math.max(0, current.offsetTop + current.offsetHeight - menu.clientHeight + 6);
  }
  // Choix multiple : le menu reste ouvert, redessiné sur place ; la capsule redessinée par update() redevient son déclencheur.
  function pickInMenu(key, v) {
    const box = menuTrigger.parentNode;
    MENUS[key].pick(v);
    update();
    menuTrigger = $(`[data-menu="${key}"]`, box) || menuTrigger;
    menuTrigger.setAttribute('aria-expanded', 'true');
    const menu = $('[data-options-menu]');
    const scroll = menu.scrollTop;
    const width = menu.offsetWidth;
    renderMenu(key);
    // Le choix en gras change la largeur : le menu ne rétrécit pas, et reste dans l'écran s'il s'élargit.
    menu.style.minWidth = `${Math.max(width, menu.offsetWidth)}px`;
    if (menu.dataset.align === 'left') menu.style.left = `${Math.max(16, Math.min(parseFloat(menu.style.left), window.innerWidth - menu.offsetWidth - 16))}px`;
    menu.scrollTop = scroll;
    $(`[data-option="${CSS.escape(v)}"]`, menu).focus({ preventScroll: true });
  }
  $('[data-options-menu]').addEventListener('keydown', (e) => {
    const items = $$('.menu-item', e.currentTarget);
    const i = items.indexOf(document.activeElement);
    let next = null;
    if (e.key === 'ArrowDown') next = items[Math.min(i + 1, items.length - 1)];
    else if (e.key === 'ArrowUp') next = items[Math.max(i - 1, 0)];
    else if (e.key === 'Home') next = items[0];
    else if (e.key === 'End') next = items[items.length - 1];
    else if (e.key === 'Tab') { e.preventDefault(); closeMenu(true); return; }
    if (next) { e.preventDefault(); next.focus(); }
  });
  window.addEventListener('resize', () => closeMenu());
  // Le menu suit son déclencheur : il se ferme si celui-ci défile.
  document.addEventListener('scroll', () => {
    if (menuTrigger && Math.abs(menuTrigger.getBoundingClientRect().top - menuAnchor) > 1) closeMenu();
  }, true);

  /* ---------- Événements ---------- */
  document.addEventListener('click', (e) => {
    if (swallowClick) return; // fin d'un glissement de feuille, pas un clic
    const t = e.target.closest('button');
    if (!t) {
      if (!e.target.closest('[data-layers-menu]')) toggleLayersMenu(false);
      if (!e.target.closest('[data-options-menu]')) closeMenu();
      // Mobile : toucher l'en-tête de la feuille l'agrandit ou la réduit, comme la poignée.
      if (!DESKTOP.matches && e.target.closest('.sheet-top')) toggleSheet();
      return;
    }
    if (!t.closest('[data-layers-menu]') && t.dataset.action !== 'layers') toggleLayersMenu(false);
    if (t.dataset.option !== undefined) {
      const key = menuTrigger.dataset.menu;
      if (MENUS[key].multi) return pickInMenu(key, t.dataset.option);
      state[key] = t.dataset.option;
      closeMenu(true);
      return update();
    }
    if (t.dataset.menu) return menuTrigger === t ? closeMenu() : openMenu(t);
    closeMenu();

    if (t.dataset.cycle) {
      const k = t.dataset.cycle;
      if (state.cycles.has(k)) state.cycles.delete(k); else state.cycles.add(k);
      return update();
    }
    if (t.dataset.parcours !== undefined) {
      const k = t.dataset.parcours;
      if (state.parcours.has(k)) state.parcours.delete(k);
      else { state.parcours.add(k); state.cycles.add('ing3'); } // sinon le parcours coché resterait masqué
      return update();
    }
    if (t.dataset.tag !== undefined) {
      const k = t.dataset.tag;
      if (state.tags.has(k)) state.tags.delete(k); else state.tags.add(k);
      return update();
    }
    if (t.dataset.toggleParcours !== undefined) {
      parcoursOpen = !parcoursOpen;
      return renderControls();
    }
    if (t.dataset.structure) {
      const k = t.dataset.structure;
      if (state.structures.has(k)) state.structures.delete(k); else state.structures.add(k);
      return update();
    }
    if (t.dataset.id) {
      return setSelection(t.dataset.id, { reveal: true, zoom: 9 });
    }
    if (t.dataset.base) {
      const next = BASES.find((b) => b.id === t.dataset.base);
      if (next !== base) setBase(next);
      return toggleLayersMenu(false);
    }
    if (t.dataset.appearance) {
      setAppearance(t.dataset.appearance);
      return toggleLayersMenu(false);
    }

    switch (t.dataset.action) {
      case 'reset':
        state.annee = 'all';
        state.cycles = new Set(DEFAULTS.cycles);
        state.structures = new Set(DEFAULTS.structures);
        state.lieu = 'all';
        state.parcours = new Set(PARCOURS);
        state.tags = new Set();
        state.q = '';
        return update();
      case 'more': listLimit += 200; return renderList();
      case 'export': return exportCsv();
      case 'zoom-in': return map.zoomIn();
      case 'zoom-out': return map.zoomOut();
      case 'fit': return fitVisible();
      case 'layers': return toggleLayersMenu();
      case 'about': return $('[data-about]').showModal();
      case 'close-detail': return setSelection(null);
      case 'share': return shareStage();
      case 'locate':
        if (state.sel === null) return;
        if (!DESKTOP.matches && document.body.dataset.sheet === 'full') setSheet('detail');
        return reveal(markers.get(state.sel), 12);
      case 'same-org': {
        // Tous les stages de la structure : recherche par son nom, liste ouverte.
        const s = byId.get(state.sel);
        if (!s) return;
        state.q = s.org;
        update();
        if (DESKTOP.matches) return setResults(true);
        setSelection(null);
        return setSheet('full');
      }
      case 'toggle-sheet': return toggleSheet();
      case 'open-filters': return openFilters(true);
      case 'close-filters': return openFilters(false);
      case 'toggle-results': return setResults(!resultsOpen);
      case 'close-results': return setResults(false);
      default:
    }
  });

  $('[data-filters-scrim]').addEventListener('click', () => openFilters(false));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (menuTrigger) return closeMenu(true);
    if (!$('[data-layers-menu]').hidden) return toggleLayersMenu(false);
    if (!$('[data-filters-sheet]').hidden) return openFilters(false);
    if (state.sel !== null) return setSelection(null);
    if (!$('[data-results]').hidden) return setResults(false);
  });

  let searchTimer;
  $$('[data-search]').forEach((input) => {
    input.addEventListener('input', () => {
      state.q = input.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(update, 120);
    });
    input.addEventListener('keydown', (e) => {
      // Entrée dans la recherche : montre la liste des résultats.
      if (e.key !== 'Enter') return;
      if (DESKTOP.matches) return setResults(true);
      input.blur();
      if (state.sel !== null) setSelection(null);
      setSheet('full');
    });
  });
  // Toucher la carte hors d'un point ferme la fiche, puis replie la feuille.
  map.on('click', () => {
    toggleLayersMenu(false);
    closeMenu();
    if (state.sel !== null) return setSelection(null);
    if (!DESKTOP.matches && document.body.dataset.sheet === 'full') setSheet('peek');
  });
  window.addEventListener('hashchange', () => {
    const id = readHash();
    if (state.parcours.size !== PARCOURS.length) parcoursOpen = true;
    update();
    if (id !== state.sel) setSelection(id, { reveal: id !== null, zoom: 9 });
  });
  DESKTOP.addEventListener('change', () => {
    if (DESKTOP.matches) {
      showView('list');
      openFilters(false);
      setSheet('peek');
    } else {
      setResults(false);
      if (state.sel !== null) setSelection(state.sel);
    }
    map.invalidateSize();
  });

  /* ---------- Démarrage ---------- */
  setSheet('peek');
  map.fitBounds(EUROPE, mapPadding());

  // Revalidé auprès du serveur à chaque visite : les stages ajoutés s'affichent sans attendre l'expiration du cache.
  fetch('data/stages.json', { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((data) => {
      STAGES = data.stages;
      STAGES.forEach((s) => {
        s._text = norm([s.org, s.ville, s.pays, s.sujet, s.parcours, CYCLES[s.cycle].label, STRUCTURES[s.structure].label].join(' '));
        byId.set(s.id, s);
        const m = L.marker([s.lat, s.lon], { icon: pinIcon(s.cycle, false), cycle: s.cycle, keyboard: true, title: `${s.org} (${s.annee})`, alt: `${s.org}, ${s.ville}` });
        m.on('click', () => setSelection(s.id));
        markers.set(s.id, m);
      });
      YEARS = [...new Set(STAGES.map((s) => s.annee))].filter(Boolean).sort().reverse();
      // Parcours encore proposés l'année la plus récente en tête (ordre alpha) ; les parcours disparus (ex. DeSIGeo) en fin de liste.
      // L'année de référence est la plus récente qui a des parcours : une année en cours peut n'avoir encore que des stages de 2e année.
      const parcoursYear = YEARS.find((y) => STAGES.some((s) => s.annee === y && s.parcours));
      const activeParcours = new Set(STAGES.filter((s) => s.annee === parcoursYear).map((s) => s.parcours).filter(Boolean));
      PARCOURS = [...new Set(STAGES.map((s) => s.parcours).filter(Boolean))].sort((a, b) => {
        const diff = activeParcours.has(b) - activeParcours.has(a);
        return diff || a.localeCompare(b, 'fr');
      });
      // La France est dans les choix du haut du menu (France hexagonale) ; les autres pays suivent par ordre alphabétique.
      COUNTRIES = [...new Set(STAGES.map((s) => s.pays))].filter((pays) => pays && pays !== 'France').sort((a, b) => a.localeCompare(b, 'fr'));
      if (YEARS.length) $('[data-subtitle]').textContent = `Géodata Paris · ${YEARS[YEARS.length - 1]} à ${YEARS[0]}`;
      if (data.generated) $('[data-generated]').textContent = `, mises à jour le ${new Date(data.generated).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      const id = readHash();
      parcoursOpen = state.parcours.size !== PARCOURS.length; // déplie si un filtre parcours est actif
      update();
      if (id !== null) setSelection(id, { reveal: true, zoom: 9 });
    })
    .catch(() => {
      $$('[data-list]').forEach((list) => { list.innerHTML = '<div class="empty"><strong>Stages indisponibles</strong><span>Le fichier des stages n’a pas pu être chargé. Rechargez la page.</span></div>'; });
    });
})();
