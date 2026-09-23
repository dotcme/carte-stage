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

  const CHECK = '<svg class="icon check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const PIN_PATH = 'M13 1C6.4 1 1 6.2 1 12.7c0 8.6 10.3 18.9 11.2 19.8a1.1 1.1 0 0 0 1.6 0C14.7 31.6 25 21.3 25 12.7 25 6.2 19.6 1 13 1z';
  const pinSvg = (cls) => `<svg class="${cls}" viewBox="0 0 26 34" aria-hidden="true"><path d="${PIN_PATH}"/><circle cx="13" cy="12.5" r="4.2" fill="#fff"/></svg>`;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const fmt = (n) => n.toLocaleString('fr-FR');
  const plural = (n, one, many) => fmt(n) + '\u00a0' + (n > 1 ? many : one);
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  let STAGES = [];
  let YEARS = [];
  let PARCOURS = [];
  let COUNTRIES = [];
  let countryCounts = {}; // comptes par pays, pour le menu du filtre Lieu
  let parcoursOpen = false; // parcours de 3e année dépliés sous la ligne ing3 (état d'affichage seul)
  let resultsOpen = false; // panneau de la liste des stages, ouvert (bureau)
  const byId = new Map();
  const markers = new Map();

  const DEFAULTS = { annee: 'all', cycles: Object.keys(CYCLES), structures: Object.keys(STRUCTURES), lieu: 'all', q: '' };
  // Parcours : tous cochés (en décocher un l'exclut) ; tags : aucun coché (en cocher un inclut, OU entre eux).
  // Le filtre Lieu : « all » (partout), « abroad » (tous les pays sauf la France) ou un pays.
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

  // Plan clair : fond vectoriel aux couleurs de Lucent (assets/basemap.js), clair ou sombre selon le système.
  const DARK = window.matchMedia('(prefers-color-scheme: dark)');
  const theme = () => (DARK.matches ? 'dark' : 'light');
  const vector = L.maplibreGL({
    style: window.lucentBasemapStyle(theme()),
    attribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> ' + OSM_ATTRIBUTION
  });
  DARK.addEventListener('change', () => {
    const gl = vector.getMaplibreMap && vector.getMaplibreMap();
    if (gl) gl.setStyle(window.lucentBasemapStyle(theme()));
  });

  const BASES = [
    { id: 'clair', label: 'Plan clair', layer: vector },
    { id: 'plan', label: 'Plan IGN', layer: withFallback(geopf('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', 'image/png', 19)) },
    { id: 'ortho', label: 'Photographies aériennes', layer: withFallback(geopf('ORTHOIMAGERY.ORTHOPHOTOS', 'image/jpeg', 19)) }
  ];
  let base = BASES[0];
  base.layer.addTo(map);
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
    if (DESKTOP.matches) return { paddingTopLeft: [gauche, 32], paddingBottomRight: [80, 32] };
    // Hauteur visée par la feuille (la transition CSS peut être en cours) : voir style.css.
    const h = window.innerHeight;
    const sheet = { peek: 196, detail: Math.min(520, h - 200), full: h - 150 }[document.body.dataset.sheet] || 196;
    return { paddingTopLeft: [24, 140], paddingBottomRight: [72, sheet + 32] };
  }

  /* ---------- Filtres ---------- */
  function inFrance(pays) { return FRANCE.includes(pays); }
  function isFrance(s) { return inFrance(s.pays); }
  function matches(s, skip) {
    const sk = skip || '';
    if (state.annee !== 'all' && s.annee !== state.annee) return false;
    if (!sk.includes('cycle') && !state.cycles.has(s.cycle)) return false;
    if (!sk.includes('structure') && !state.structures.has(s.structure)) return false;
    if (!sk.includes('lieu') && state.lieu !== 'all') {
      if (state.lieu === 'abroad') { if (isFrance(s)) return false; }
      else if (s.pays !== state.lieu) return false;
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

  /* ---------- Rendu des contrôles ---------- */
  const MENUS = {
    annee: { name: 'Année', options: () => YEARS, label: (v) => (v === 'all' ? 'Toutes les années' : v) },
    lieu: {
      // « null » trace un séparateur dans le menu : l'option « sauf la France » à part, puis les pays.
      name: 'Lieu', options: () => ['abroad', null, ...COUNTRIES],
      label: (v) => (v === 'all' ? 'Partout' : v === 'abroad' ? 'Tous les pays sauf la France' : v),
      count: (v) => countryCounts[v] || 0
    }
  };
  function renderMenu(key) {
    const m = MENUS[key];
    const item = (v) => `
      <button type="button" class="menu-item" role="option" data-option="${esc(v)}" aria-selected="${state[key] === v}" tabindex="-1">
        ${CHECK}${esc(m.label(v))}${m.count && v !== 'all' ? `<span class="menu-count">${fmt(m.count(v))}</span>` : ''}
      </button>`;
    const menu = $('[data-options-menu]');
    const sep = '<div class="menu-sep" role="separator"></div>';
    menu.setAttribute('aria-label', m.name);
    menu.innerHTML = item('all') + sep + m.options().map((v) => (v === null ? sep : item(v))).join('');
  }

  function renderControls() {
    const cycleCounts = {};
    const structCounts = {};
    const parcoursCounts = {};
    const tagCounts = {};
    countryCounts = {};
    STAGES.forEach((s) => {
      if (matches(s, 'cycle')) cycleCounts[s.cycle] = (cycleCounts[s.cycle] || 0) + 1;
      if (matches(s, 'structure')) structCounts[s.structure] = (structCounts[s.structure] || 0) + 1;
      if (s.parcours && matches(s, 'cycle+parcours')) parcoursCounts[s.parcours] = (parcoursCounts[s.parcours] || 0) + 1;
      // Les comptes du menu Lieu ignorent le filtre de lieu : c'est ce qu'on obtiendra en le choisissant.
      if (matches(s, 'lieu')) {
        countryCounts[s.pays] = (countryCounts[s.pays] || 0) + 1;
        if (!isFrance(s)) countryCounts.abroad = (countryCounts.abroad || 0) + 1;
      }
      if (matches(s, 'tags')) s.tags.forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    });

    // Ingénieur 3e année : la ligne devient un groupe avec, à droite, le bouton qui déplie
    // les parcours ; cochés, ils s'affichent indentés sous la ligne.
    const cycleRow = (k) => k !== 'ing3' ? `
      <button type="button" class="row" data-cycle="${k}" aria-pressed="${state.cycles.has(k)}">
        ${pinSvg('pin-glyph pin--' + k)}
        <span class="row-label">${CYCLES[k].label}</span>
        <span class="row-count">${fmt(cycleCounts[k] || 0)}</span>
        ${CHECK}
      </button>` : `
      <div class="row row-disclose">
        <button type="button" class="row-main" data-cycle="ing3" aria-pressed="${state.cycles.has('ing3')}">
          ${pinSvg('pin-glyph pin--' + k)}
          <span class="row-label">${CYCLES[k].label}</span>
          <span class="row-count">${fmt(cycleCounts[k] || 0)}</span>
          ${CHECK}
        </button>
        <button type="button" class="disclose" data-toggle-parcours aria-expanded="${parcoursOpen}" aria-label="Parcours de 3e année">
          <svg class="icon chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6.5l6 5.5-6 5.5"/></svg>
        </button>
      </div>
      ${parcoursOpen ? `<div class="subrows" role="group" aria-label="Parcours">${PARCOURS.map((p) => `
        <button type="button" class="row row-sub" data-parcours="${esc(p)}" aria-pressed="${state.parcours.has(p)}">
          <span class="row-label">${esc(p)}</span>
          <span class="row-count">${fmt(parcoursCounts[p] || 0)}</span>
          ${CHECK}
        </button>`).join('')}</div>` : ''}`;
    const cycleRows = Object.keys(CYCLES).map(cycleRow).join('');
    $$('[data-cycles]').forEach((el) => { el.innerHTML = cycleRows; });

    $$('[data-cycle-chips]').forEach((el) => {
      el.innerHTML = Object.keys(CYCLES).map((k) => `
        <button type="button" class="cycle-chip" data-cycle="${k}" aria-pressed="${state.cycles.has(k)}">
          <span class="dot" style="background: var(--c-${k})"></span>${CYCLES[k].short}
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
        </button>`).join('');
    });

    $$('[data-structure-rows]').forEach((el) => {
      el.innerHTML = Object.keys(STRUCTURES).map((k) => `
        <button type="button" class="row" data-structure="${k}" aria-pressed="${state.structures.has(k)}">
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

    $$('[data-menu-value]').forEach((el) => { const k = el.dataset.menuValue; el.textContent = MENUS[k].label(state[k]); });
    $$('[data-search]').forEach((input) => { if (input.value !== state.q) input.value = state.q; });

    const changed = changedCount();
    const badge = $('[data-filter-badge]');
    badge.hidden = !changed;
    badge.textContent = changed;
    $$('[data-action="reset"]').forEach((b) => { b.hidden = isDefault() && !!b.closest('.results-actions'); });
  }

  /* ---------- Liste et carte ---------- */
  let visible = [];
  let listLimit = 200;

  function update(options) {
    const opts = options || {};
    visible = STAGES.filter((s) => matches(s));
    const abroad = visible.filter((s) => !isFrance(s)).length;
    const countries = new Set(visible.map((s) => s.pays)).size;

    $$('[data-count]').forEach((el) => { el.textContent = plural(visible.length, 'stage', 'stages'); });
    $('[data-summary]').textContent = `${state.annee === 'all' ? 'Toutes les années' : state.annee} · ${plural(countries, 'pays', 'pays')} · ${fmt(abroad)} à l’étranger`;
    $('[data-apply]').textContent = `Afficher ${plural(visible.length, 'stage', 'stages')}`;

    if (state.sel !== null && !visible.some((s) => s.id === state.sel)) setSelection(null, { silent: true });

    clusters.clearLayers();
    clusters.addLayers(visible.map((s) => markers.get(s.id)));

    if (!opts.keepLimit) listLimit = 200;
    renderList();
    renderControls();
    renderResultsButton();
    writeHash();
  }

  function listRow(s) {
    return `
      <button type="button" class="item" data-id="${esc(s.id)}" aria-current="${s.id === state.sel}">
        <span class="dot" style="background: var(--c-${s.cycle})"></span>
        <span class="item-text">
          <span class="item-title">${esc(s.org || 'Structure non renseignée')}</span>
          <span class="item-sub">${esc(placeOf(s))} · ${CYCLES[s.cycle].short} · ${s.annee}</span>
        </span>
      </button>`;
  }

  function renderList() {
    let html;
    if (!visible.length) {
      html = '<div class="empty"><strong>Aucun stage</strong><span>Élargissez l’année, le cycle ou le lieu pour voir plus de stages.</span></div>';
    } else {
      const rows = visible.slice(0, listLimit).map(listRow);
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
    $('[data-results-label]').textContent = resultsOpen ? 'Fermer la liste' : `Afficher ${plural(visible.length, 'stage', 'stages')}`;
  }
  function setResults(open) {
    resultsOpen = open;
    $('[data-results]').hidden = !open;
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
  function detailHtml(s, withClose) {
    return `
      <div class="detail">
        <div class="detail-head">
          <div class="detail-titles">
            <div class="detail-cycle" style="color: var(--c-${s.cycle})"><span class="dot" style="background: var(--c-${s.cycle})"></span>${CYCLES[s.cycle].label}${s.parcours ? ' · ' + esc(s.parcours) : ''}</div>
            <h2>${esc(s.org || 'Structure non renseignée')}</h2>
            <div class="detail-place">${esc([s.ville, s.pays].filter(Boolean).join(', '))}</div>
          </div>
          ${withClose ? '<button type="button" class="close" data-action="close-detail" aria-label="Fermer"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' : ''}
        </div>
        <dl>
          <div><dt>Année</dt><dd>${s.annee}</dd></div>
          <div><dt>Structure</dt><dd>${STRUCTURES[s.structure].long}</dd></div>
          ${s.type ? `<div class="wide"><dt>Type de stage</dt><dd>${TYPES[s.type] || esc(s.type)}</dd></div>` : ''}
          ${s.sujet ? `<div class="wide"><dt>Sujet</dt><dd>${esc(s.sujet)}</dd></div>` : ''}
        </dl>
      </div>`;
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

    if (!s) {
      card.hidden = true;
      detailView.hidden = true;
      showView('list');
      if (document.body.dataset.sheet === 'detail') setSheet('peek');
    } else {
      const m = markers.get(id);
      m.setIcon(pinIcon(s.cycle, true));
      m.setZIndexOffset(1000);
      card.innerHTML = detailHtml(s, true);
      card.hidden = false;
      $('[data-detail]').innerHTML = detailHtml(s, false);
      if (!DESKTOP.matches) {
        showView('detail');
        setSheet('detail');
      }
      if (opts.reveal) {
        clusters.zoomToShowLayer(m, () => {
          const target = Math.max(map.getZoom(), opts.zoom || 0);
          if (target !== map.getZoom()) centerOn(m.getLatLng(), target);
          else panIntoView(m.getLatLng());
        });
      } else if (!DESKTOP.matches) {
        setTimeout(() => panIntoView(m.getLatLng()), 450);
      }
    }
    $$('[data-list] .item').forEach((el) => el.setAttribute('aria-current', String(el.dataset.id === id)));
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

  /* ---------- Feuille mobile ---------- */
  function setSheet(mode) {
    document.body.dataset.sheet = mode;
    const g = $('.grabber');
    g.setAttribute('aria-label', mode === 'full' ? 'Réduire la liste' : 'Agrandir la liste');
    g.setAttribute('aria-expanded', String(mode === 'full'));
  }
  function openFilters(open) {
    $('[data-filters-sheet]').hidden = !open;
    $('[data-filters-scrim]').hidden = !open;
    if (open) $('[data-filters-sheet] .close').focus();
  }

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
    // Anciens liens : lieu=fr|abroad (segments) ; version intermédiaire : pays=Espagne.
    const lieu = p.get('lieu');
    if (lieu === 'fr') state.lieu = 'France';
    else if (lieu === 'abroad' || COUNTRIES.includes(lieu)) state.lieu = lieu;
    else if (COUNTRIES.includes(p.get('pays'))) state.lieu = p.get('pays');
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
      BASES.map((b) => item(base === b, `data-base="${b.id}"`, b.label)).join('');
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

    const current = $('[aria-selected="true"]', menu);
    current.focus({ preventScroll: true });
    menu.scrollTop = Math.max(0, current.offsetTop + current.offsetHeight - menu.clientHeight + 6);
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
    const t = e.target.closest('button');
    if (!t) {
      if (!e.target.closest('[data-layers-menu]')) toggleLayersMenu(false);
      if (!e.target.closest('[data-options-menu]')) closeMenu();
      return;
    }
    if (!t.closest('[data-layers-menu]') && t.dataset.action !== 'layers') toggleLayersMenu(false);
    if (t.dataset.option !== undefined) {
      state[menuTrigger.dataset.menu] = t.dataset.option;
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
      if (next !== base) { map.removeLayer(base.layer); base = next; base.layer.addTo(map); }
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
      case 'toggle-sheet':
        if (document.body.dataset.sheet === 'detail' && state.sel !== null) return setSelection(null);
        return setSheet(document.body.dataset.sheet === 'full' ? 'peek' : 'full');
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
      if (DESKTOP.matches) setResults(true);
      else { input.blur(); setSheet('full'); }
    });
  });
  map.on('click', () => {
    toggleLayersMenu(false);
    closeMenu();
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

  fetch('data/stages.json')
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
      PARCOURS = [...new Set(STAGES.map((s) => s.parcours).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
      COUNTRIES = [...new Set(STAGES.map((s) => s.pays))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'fr'));
      if (data.generated) $('[data-generated]').textContent = `, mises à jour le ${new Date(data.generated).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      const id = readHash();
      parcoursOpen = state.parcours.size !== PARCOURS.length; // déplie si un filtre parcours est actif
      update();
      if (id !== null) setSelection(id, { reveal: true, zoom: 9 });
    })
    .catch(() => {
      $('[data-list]').innerHTML = '<div class="empty"><strong>Stages indisponibles</strong><span>Le fichier des stages n’a pas pu être chargé. Rechargez la page.</span></div>';
    });
})();
