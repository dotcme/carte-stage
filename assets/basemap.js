// Fond de carte vectoriel aux couleurs de Lucent (tuiles OpenFreeMap, schéma OpenMapTiles).
// Terres très claires, mer bleu pâle, frontières et routes discrètes : le fond s'efface derrière les points.
(function () {
  'use strict';

  const PALETTES = {
    light: {
      land: '#f7f7f9',
      water: '#d6e6f2',
      waterLabel: '#5f84a3',
      park: '#eaf1e6',
      wood: '#eef3ea',
      ice: '#ffffff',
      residential: '#efeff3',
      building: '#e6e6eb',
      road: '#ffffff',
      roadCasing: '#dcdce2',
      roadMajor: '#ffffff',
      roadMajorCasing: '#cfcfd6',
      rail: '#d1d1d8',
      border: 'rgba(60, 60, 67, 0.38)',
      borderState: 'rgba(60, 60, 67, 0.2)',
      label: '#6e6e73',
      labelStrong: '#424247',
      halo: 'rgba(255, 255, 255, 0.9)'
    },
    dark: {
      land: '#1c1c1e',
      water: '#0f1d2a',
      waterLabel: '#6f93b3',
      park: '#1e2620',
      wood: '#1f2421',
      ice: '#2c2c2e',
      residential: '#232326',
      building: '#2a2a2e',
      road: '#3a3a3e',
      roadCasing: '#2a2a2e',
      roadMajor: '#48484e',
      roadMajorCasing: '#2a2a2e',
      rail: '#3a3a3e',
      border: 'rgba(235, 235, 245, 0.34)',
      borderState: 'rgba(235, 235, 245, 0.16)',
      label: '#939398',
      labelStrong: '#d1d1d9',
      halo: 'rgba(0, 0, 0, 0.75)'
    }
  };

  const NAME = ['coalesce', ['get', 'name:fr'], ['get', 'name:latin'], ['get', 'name']];
  const FONT = ['Noto Sans Regular'];
  const FONT_BOLD = ['Noto Sans Bold'];
  const FONT_ITALIC = ['Noto Sans Italic'];
  const zoom = (stops) => ['interpolate', ['linear'], ['zoom']].concat(stops);

  function style(theme) {
    const c = PALETTES[theme] || PALETTES.light;
    const road = (id, classes, minzoom, color, widths) => ({
      id, type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom,
      filter: ['all', ['match', ['get', 'class'], classes, true, false], ['!=', ['get', 'brunnel'], 'tunnel']],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': color, 'line-width': zoom(widths) }
    });
    const place = (id, classes, minzoom, maxzoom, size, font, color) => ({
      id, type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom, maxzoom,
      filter: ['match', ['get', 'class'], classes, true, false],
      layout: {
        'text-field': NAME, 'text-font': font, 'text-size': zoom(size),
        'text-max-width': 8, 'text-padding': 4
      },
      paint: { 'text-color': color, 'text-halo-color': c.halo, 'text-halo-width': 1.4, 'text-halo-blur': 0.5 }
    });

    return {
      version: 8,
      glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
      sources: { omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } },
      layers: [
        { id: 'land', type: 'background', paint: { 'background-color': c.land } },
        { id: 'residential', type: 'fill', source: 'omt', 'source-layer': 'landuse', minzoom: 9,
          filter: ['match', ['get', 'class'], ['residential', 'suburb', 'neighbourhood'], true, false],
          paint: { 'fill-color': c.residential, 'fill-opacity': zoom([9, 0, 11, 1]) } },
        { id: 'wood', type: 'fill', source: 'omt', 'source-layer': 'landcover', minzoom: 7,
          filter: ['match', ['get', 'class'], ['wood', 'forest'], true, false],
          paint: { 'fill-color': c.wood, 'fill-opacity': zoom([7, 0, 9, 1]) } },
        { id: 'ice', type: 'fill', source: 'omt', 'source-layer': 'landcover',
          filter: ['==', ['get', 'class'], 'ice'], paint: { 'fill-color': c.ice } },
        { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', minzoom: 8,
          paint: { 'fill-color': c.park, 'fill-opacity': zoom([8, 0, 10, 1]) } },
        { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water',
          filter: ['!=', ['get', 'brunnel'], 'tunnel'], paint: { 'fill-color': c.water } },
        { id: 'waterway', type: 'line', source: 'omt', 'source-layer': 'waterway', minzoom: 8,
          filter: ['match', ['get', 'class'], ['river', 'canal'], true, false],
          paint: { 'line-color': c.water, 'line-width': zoom([8, 0.6, 14, 3]) } },
        { id: 'building', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 14,
          paint: { 'fill-color': c.building, 'fill-opacity': zoom([14, 0, 15, 1]) } },
        { id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 11,
          filter: ['==', ['get', 'class'], 'rail'], paint: { 'line-color': c.rail, 'line-width': zoom([11, 0.6, 16, 1.5]) } },
        road('road-minor-casing', ['minor', 'service', 'tertiary'], 12, c.roadCasing, [12, 1, 16, 9]),
        road('road-minor', ['minor', 'service', 'tertiary'], 12, c.road, [12, 0.5, 16, 7]),
        road('road-major-casing', ['primary', 'secondary', 'trunk', 'motorway'], 6, c.roadMajorCasing, [6, 0.6, 10, 2.5, 16, 14]),
        road('road-major', ['primary', 'secondary', 'trunk', 'motorway'], 7, c.roadMajor, [7, 0.4, 10, 1.6, 16, 11]),
        { id: 'border-state', type: 'line', source: 'omt', 'source-layer': 'boundary', minzoom: 5,
          filter: ['all', ['==', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]],
          layout: { 'line-join': 'round' },
          paint: { 'line-color': c.borderState, 'line-width': zoom([5, 0.6, 10, 1.2]), 'line-dasharray': [3, 2] } },
        { id: 'border-country', type: 'line', source: 'omt', 'source-layer': 'boundary',
          filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1], ['!=', ['get', 'disputed'], 1]],
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': c.border, 'line-width': zoom([2, 0.6, 6, 1, 10, 1.6]) } },
        { id: 'water-label', type: 'symbol', source: 'omt', 'source-layer': 'water_name',
          filter: ['==', ['geometry-type'], 'Point'],
          layout: { 'text-field': NAME, 'text-font': FONT_ITALIC, 'text-size': zoom([2, 11, 6, 14]), 'text-max-width': 7, 'text-letter-spacing': 0.05 },
          paint: { 'text-color': c.waterLabel, 'text-halo-color': c.halo, 'text-halo-width': 1 } },
        place('label-village', ['village', 'hamlet', 'suburb'], 11, 24, [11, 11, 16, 14], FONT, c.label),
        place('label-town', ['town'], 8, 24, [8, 11, 14, 15], FONT, c.label),
        place('label-city', ['city'], 4, 24, [4, 11, 8, 14, 14, 19], FONT, c.labelStrong),
        place('label-state', ['state'], 5, 8, [5, 11, 8, 13], FONT, c.label),
        place('label-country', ['country'], 2, 7, [2, 11, 6, 15], FONT_BOLD, c.labelStrong)
      ]
    };
  }

  window.lucentBasemapStyle = style;
})();
