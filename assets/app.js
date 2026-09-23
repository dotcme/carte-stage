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
  const PLACES = { all: 'Partout', fr: 'France', abroad: 'Étranger' };
  const TYPES = { Pluri: 'Stage pluridisciplinaire', TFE: 'Travail de fin d’études' };
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
  const byId = new Map();
  const markers = new Map();

  const DEFAULTS = { annee: 'all', cycles: Object.keys(CYCLES), structures: Object.keys(STRUCTURES), lieu: 'all', parcours: 'all', q: '' };
  const state = { annee: 'all', cycles: new Set(DEFAULTS.cycles), structures: new Set(DEFAULTS.structures), lieu: 'all', parcours: 'all', q: '', sel: null };

  /* ---------- Carte ---------- */
  const map = L.map('map', { zoomControl: false, minZoom: 2, worldCopyJump: true });
  const geopf = (layer, format, maxZoom) => L.tileLayer(
    `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=normal&TILEMATRIXSET=PM&FORMAT=${format}&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`,
    { maxZoom, attribution: '&copy; <a href="https://www.ign.fr/" target="_blank" rel="noopener">IGN</a> · Géoplateforme' }
  );
  const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
  // Le Plan IGN n'a pas de tuiles détaillées partout hors de France : une tuile manquante est remplacée par OpenStreetMap.
  function withFallback(layer) {
    layer.getAttribution = () => layer.options.attribution + ', ' + OSM_ATTRIBUTION;
    layer.on('tileerror', (e) => {
      if (e.tile.dataset.fallback) return;
      e.tile.dataset.fallback = '1';
      e.tile.src = L.Util.template(OSM_URL, e.coords);
      e.tile.style.opacity = '';
    });
    return layer;
  }
  const BASES = [
    { id: 'plan', label: 'Plan IGN', layer: withFallback(geopf('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', 'image/png', 19)) },
    { id: 'ortho', label: 'Photographies aériennes', layer: withFallback(geopf('ORTHOIMAGERY.ORTHOPHOTOS', 'image/jpeg', 19)) },
    { id: 'osm', label: 'OpenStreetMap', layer: L.tileLayer(OSM_URL, { maxZoom: 19, attribution: OSM_ATTRIBUTION }) }
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
    if (DESKTOP.matches) return { paddingTopLeft: [16 * 2 + 392 + 24, 96], paddingBottomRight: [80, 32] };
    // Hauteur visée par la feuille (la transition CSS peut être en cours) : voir style.css.
    const h = window.innerHeight;
    const sheet = { peek: 196, detail: Math.min(520, h - 200), full: h - 150 }[document.body.dataset.sheet] || 196;
    return { paddingTopLeft: [24, 140], paddingBottomRight: [72, sheet + 32] };
  }

  /* ---------- Filtres ---------- */
  function isFrance(s) { return FRANCE.includes(s.pays); }
  function matches(s, skip) {
    if (state.annee !== 'all' && s.annee !== state.annee) return false;
    if (skip !== 'cycle' && !state.cycles.has(s.cycle)) return false;
    if (skip !== 'structure' && !state.structures.has(s.structure)) return false;
    if (state.lieu === 'fr' && !isFrance(s)) return false;
    if (state.lieu === 'abroad' && isFrance(s)) return false;
    if (state.parcours !== 'all' && s.parcours !== state.parcours) return false;
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
    if (state.parcours !== 'all') n++;
    return n;
  }
  function isDefault() { return !changedCount() && state.annee === 'all' && !state.q; }

  /* ---------- Rendu des contrôles ---------- */
  function renderYears() {
    const html = ['<option value="all">Toutes les années</option>']
      .concat(YEARS.map((y) => `<option value="${y}">${y}</option>`)).join('');
    $$('[data-year]').forEach((sel) => { sel.innerHTML = html; sel.value = state.annee; });
  }
  function renderParcours() {
    const html = ['<option value="all">Tous</option>']
      .concat(PARCOURS.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`)).join('');
    $$('[data-parcours]').forEach((sel) => { sel.innerHTML = html; sel.value = state.parcours; });
  }

  function renderControls() {
    const cycleCounts = {};
    const structCounts = {};
    STAGES.forEach((s) => {
      if (matches(s, 'cycle')) cycleCounts[s.cycle] = (cycleCounts[s.cycle] || 0) + 1;
      if (matches(s, 'structure')) structCounts[s.structure] = (structCounts[s.structure] || 0) + 1;
    });

    const cycleRows = Object.keys(CYCLES).map((k) => `
      <button type="button" class="row" data-cycle="${k}" aria-pressed="${state.cycles.has(k)}">
        ${pinSvg('pin-glyph pin--' + k)}
        <span class="row-label">${CYCLES[k].label}</span>
        <span class="row-count">${fmt(cycleCounts[k] || 0)}</span>
        ${CHECK}
      </button>`).join('');
    $$('[data-cycles]').forEach((el) => { el.innerHTML = cycleRows; });

    $$('[data-cycle-chips]').forEach((el) => {
      el.innerHTML = Object.keys(CYCLES).map((k) => `
        <button type="button" class="cycle-chip" data-cycle="${k}" aria-pressed="${state.cycles.has(k)}">
          <span class="dot" style="background: var(--c-${k})"></span>${CYCLES[k].short}
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
        </button>`).join('');
    });

    $$('[data-structures]').forEach((el) => {
      el.innerHTML = Object.keys(STRUCTURES).map((k) => `
        <button type="button" class="chip" data-structure="${k}" aria-pressed="${state.structures.has(k)}">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>${STRUCTURES[k].label}
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

    $$('[data-places]').forEach((el) => {
      el.innerHTML = Object.keys(PLACES).map((k) => `
        <button type="button" class="segment" role="radio" data-place="${k}" aria-checked="${state.lieu === k}">${PLACES[k]}</button>`).join('');
    });

    $$('[data-year]').forEach((sel) => { sel.value = state.annee; });
    $$('[data-parcours]').forEach((sel) => { sel.value = state.parcours; });
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

    $('[data-count]').textContent = plural(visible.length, 'stage', 'stages');
    $('[data-summary]').textContent = `${state.annee === 'all' ? 'Toutes les années' : state.annee} · ${plural(countries, 'pays', 'pays')} · ${fmt(abroad)} à l’étranger`;
    $('[data-apply]').textContent = `Afficher ${plural(visible.length, 'stage', 'stages')}`;

    if (state.sel !== null && !visible.some((s) => s.id === state.sel)) setSelection(null, { silent: true });

    clusters.clearLayers();
    clusters.addLayers(visible.map((s) => markers.get(s.id)));

    if (!opts.keepLimit) listLimit = 200;
    renderList();
    renderControls();
    writeHash();
  }

  function renderList() {
    const list = $('[data-list]');
    if (!visible.length) {
      list.innerHTML = '<div class="empty"><strong>Aucun stage</strong><span>Élargissez l’année, le cycle ou le lieu pour voir plus de stages.</span></div>';
      return;
    }
    const rows = visible.slice(0, listLimit).map((s) => `
      <button type="button" class="item" data-id="${esc(s.id)}" aria-current="${s.id === state.sel}">
        <span class="dot" style="background: var(--c-${s.cycle})"></span>
        <span class="item-text">
          <span class="item-title">${esc(s.org || 'Structure non renseignée')}</span>
          <span class="item-sub">${esc(placeOf(s))} · ${CYCLES[s.cycle].short} · ${s.annee}</span>
        </span>
      </button>`);
    if (visible.length > listLimit) {
      rows.push(`<button type="button" class="plain more" data-action="more">Afficher ${plural(Math.min(200, visible.length - listLimit), 'stage de plus', 'stages de plus')}</button>`);
    }
    list.innerHTML = rows.join('');
  }

  function placeOf(s) {
    return [s.ville, s.pays === 'France' ? '' : s.pays].filter(Boolean).join(', ') || s.pays || 'Lieu non renseigné';
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
        <div class="detail-actions">
          <button type="button" class="tinted" data-action="zoom-here">Zoomer</button>
          <button type="button" class="tinted" data-action="copy-link">Copier le lien</button>
        </div>
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
    const listView = $('[data-view="list"]');
    const detailView = $('[data-view="detail"]');

    if (!s) {
      card.hidden = true;
      detailView.hidden = true;
      listView.hidden = false;
      if (document.body.dataset.sheet === 'detail') setSheet('peek');
    } else {
      const m = markers.get(id);
      m.setIcon(pinIcon(s.cycle, true));
      m.setZIndexOffset(1000);
      card.innerHTML = detailHtml(s, true);
      card.hidden = false;
      $('[data-detail]').innerHTML = detailHtml(s, false);
      if (!DESKTOP.matches) {
        listView.hidden = true;
        detailView.hidden = false;
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
    if (state.parcours !== 'all') p.set('parcours', state.parcours);
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
    state.lieu = PLACES[p.get('lieu')] ? p.get('lieu') : 'all';
    state.parcours = PARCOURS.includes(p.get('parcours')) ? p.get('parcours') : 'all';
    state.q = p.get('q') || '';
    const id = p.get('stage');
    return byId.has(id) ? id : null;
  }

  /* ---------- Export ---------- */
  function exportCsv() {
    const cols = [
      ['Année', (s) => s.annee], ['Cycle', (s) => CYCLES[s.cycle].label], ['Parcours', (s) => s.parcours || ''],
      ['Type de structure', (s) => STRUCTURES[s.structure].label], ['Structure', (s) => s.org], ['Ville', (s) => s.ville],
      ['Pays', (s) => s.pays], ['Sujet', (s) => s.sujet], ['Latitude', (s) => s.lat], ['Longitude', (s) => s.lon]
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

  let toastTimer;
  function toast(text) {
    const el = $('[data-toast]');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
  }

  /* ---------- Fond de carte ---------- */
  function renderLayersMenu() {
    $('[data-layers-menu]').innerHTML = BASES.map((b) => `
      <button type="button" role="menuitemradio" data-base="${b.id}" aria-checked="${b === base}">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>${b.label}
      </button>`).join('');
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

  /* ---------- Événements ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) {
      if (!e.target.closest('[data-layers-menu]')) toggleLayersMenu(false);
      return;
    }
    if (!t.closest('[data-layers-menu]') && t.dataset.action !== 'layers') toggleLayersMenu(false);

    if (t.dataset.cycle) {
      const k = t.dataset.cycle;
      if (state.cycles.has(k)) state.cycles.delete(k); else state.cycles.add(k);
      return update();
    }
    if (t.dataset.structure) {
      const k = t.dataset.structure;
      if (state.structures.has(k)) state.structures.delete(k); else state.structures.add(k);
      return update();
    }
    if (t.dataset.place) { state.lieu = t.dataset.place; return update(); }
    if (t.dataset.id) return setSelection(t.dataset.id, { reveal: true, zoom: 9 });
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
        state.parcours = 'all';
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
      case 'zoom-here': {
        const m = markers.get(state.sel);
        if (m) clusters.zoomToShowLayer(m, () => centerOn(m.getLatLng(), Math.max(map.getZoom(), 14)));
        return;
      }
      case 'copy-link': {
        const url = location.href;
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('Lien copié'), () => toast(url));
        else toast(url);
        return;
      }
      case 'toggle-sheet':
        if (document.body.dataset.sheet === 'detail') return setSelection(null);
        return setSheet(document.body.dataset.sheet === 'full' ? 'peek' : 'full');
      case 'open-filters': return openFilters(true);
      case 'close-filters': return openFilters(false);
      default:
    }
  });

  $('[data-filters-scrim]').addEventListener('click', () => openFilters(false));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('[data-layers-menu]').hidden) return toggleLayersMenu(false);
    if (!$('[data-filters-sheet]').hidden) return openFilters(false);
    if (state.sel !== null) setSelection(null);
  });

  let searchTimer;
  $$('[data-search]').forEach((input) => {
    input.addEventListener('input', () => {
      state.q = input.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(update, 120);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !DESKTOP.matches) { input.blur(); setSheet('full'); }
    });
  });
  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-year]')) { state.annee = e.target.value; update(); }
    if (e.target.matches('[data-parcours]')) { state.parcours = e.target.value; update(); }
  });
  map.on('click', () => {
    toggleLayersMenu(false);
    if (!DESKTOP.matches && document.body.dataset.sheet === 'full') setSheet('peek');
  });
  window.addEventListener('hashchange', () => {
    const id = readHash();
    update();
    if (id !== state.sel) setSelection(id, { reveal: id !== null, zoom: 9 });
  });
  DESKTOP.addEventListener('change', () => {
    if (DESKTOP.matches) {
      $('[data-view="list"]').hidden = false;
      $('[data-view="detail"]').hidden = true;
      openFilters(false);
      setSheet('peek');
    } else if (state.sel !== null) {
      setSelection(state.sel);
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
      if (data.generated) $('[data-generated]').textContent = `, mises à jour le ${new Date(data.generated).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      renderYears();
      renderParcours();
      const id = readHash();
      update();
      if (id !== null) setSelection(id, { reveal: true, zoom: 9 });
    })
    .catch(() => {
      $('[data-list]').innerHTML = '<div class="empty"><strong>Stages indisponibles</strong><span>Le fichier des stages n’a pas pu être chargé. Rechargez la page.</span></div>';
    });
})();
