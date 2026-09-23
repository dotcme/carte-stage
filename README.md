# Carte des stages

Carte interactive des stages réalisés par les étudiantes et étudiants de Géodata Paris, de 2016-2017 à 2025-2026. Elle reprend la [carte publiée sur macarte](https://macarte.ign.fr/carte/R3wixb/Carte-des-stages-edition-2025) et ajoute :

- des filtres regroupés dans le panneau : année, cycle — qui sert aussi de légende avec le nombre de stages —, parcours de 3e année (sous-catégories à cocher sous « Ingénieur 3e année »), type de structure (laboratoire, entreprise, service public), lieu (une liste déroulante : partout ; étranger et outre-mer, puis France hexagonale, Corse comprise ; puis les autres pays par ordre alphabétique — un stage noté « France » mais situé outre-mer ne compte pas dans la France hexagonale) et tags (10 techniques comme SIG ou télédétection, 9 domaines comme eau ou urbanisme) ;
- une recherche par ville, structure ou sujet ;
- les chiffres clés des stages affichés : nombre, pays, stages à l’étranger ;
- la liste des stages affichés, classée par année et synchronisée avec la carte — sur ordinateur, elle s'ouvre par un bouton ou en appuyant sur Entrée dans la recherche, dans un panneau à côté des filtres ; sur mobile, dans la feuille du bas, qu'on agrandit en la touchant ou en la faisant glisser ;
- sur mobile, des filtres rapides dans la feuille (année, cycles, parcours de 3e année, lieu) ; les autres sont dans la feuille des filtres, ouverte depuis la recherche. La capsule « Parcours », à côté de « 3e année », ouvre un menu à choix multiple : depuis « Tous les parcours », toucher un parcours ne garde que lui, les touchers suivants en ajoutent ou en retirent ;
- une fiche par stage : ses tags (un toucher filtre la carte), les autres stages de la même structure, et deux boutons, « Partager » (la feuille de partage du téléphone, ou le lien copié sur ordinateur) et « Centrer » ;
- le regroupement des points proches, avec la part de chaque cycle ;
- l’export CSV des stages affichés ;
- le choix du fond : plan clair aux couleurs du site, Plan IGN ou photographies aériennes ;
- le choix de l’apparence, dans le même menu : automatique (celle du système, par défaut), claire ou sombre ; le choix est gardé dans le navigateur.

Les filtres sont enregistrés dans l’adresse de la page (`#annee=2024-2025&tags=sig,eau`, par exemple) : un lien copié ouvre la carte dans le même état.

## Lancer le site

Le site est statique. Il doit être servi en HTTP pour pouvoir charger `data/stages.json` :

```sh
python3 -m http.server 8000
```

puis ouvrir <http://localhost:8000>. Il peut aussi être publié tel quel avec GitHub Pages.

## Mettre à jour les données

```sh
node scripts/build-data.mjs
```

Le script (Node 18 ou plus récent) télécharge la carte depuis l’API publique de macarte et réécrit `data/stages.json`. On peut aussi lui donner un fichier déjà téléchargé : `node scripts/build-data.mjs carte.json`.

Au passage, il :

- écarte les points masqués sur la carte d’origine (cycles hors légende) ;
- n’exporte pas les noms des étudiantes et étudiants ;
- harmonise les noms de pays et corrige les accents et apostrophes abîmés ;
- déduit le type de structure du nom de l'organisme, qui n'est pas renseigné dans la source ;
- attribue à chaque stage des tags, d'après son sujet : 10 techniques (géodésie, cartographie, télédétection, SIG, photogrammétrie, lasergrammétrie, topométrie, dev, modélisation 3D, IA) et 9 domaines (eau, environnement, urbanisme, agriculture, littoral, mobilité, patrimoine, risques, énergie).

Les stages absents de macarte (ceux de 2025-2026, par exemple) sont saisis à la main dans `data/stages-ajouts.json`, au même format que `data/stages.json`, sans les tags. Le script les ajoute à chaque reconstruction.

Les stages absents de macarte (ceux de 2025-2026, par exemple) sont saisis à la main dans `data/stages-ajouts.json`, au même format que `data/stages.json`, sans les tags. Le script les ajoute à chaque reconstruction.

Ce classement automatique peut se tromper. Pour corriger une structure, ajoutez son nom exact dans `data/structures-corrections.json` avec `labo`, `entreprise` ou `public`, puis relancez le script.

Le vocabulaire des tags vit dans `scripts/tags.mjs`. Après l'avoir modifié, `node scripts/retag.mjs` recalcule les tags de `data/stages.json` sans retélécharger la source.

## Publier une modification du site

Avant chaque commit qui modifie `assets/style.css`, `assets/basemap.js` ou `assets/app.js`, lancer :

```sh
node scripts/version.mjs
```

Le script ajoute à ces fichiers, dans `index.html`, une empreinte de leur contenu (`assets/app.js?v=ec151dcf`, par exemple). Quand un fichier change, son adresse change aussi, et les navigateurs chargent la nouvelle version au lieu de garder l'ancienne en cache. Les données, elles, sont revérifiées auprès du serveur à chaque visite : il n'y a rien à faire après une mise à jour de `data/stages.json`.

## Fichiers

- `index.html`, `assets/style.css`, `assets/app.js` : le site (Leaflet, Leaflet.markercluster et MapLibre, chargés depuis jsDelivr).
- `assets/basemap.js` : le style du plan clair (tuiles vectorielles OpenFreeMap, données OpenStreetMap).
- `favicon.ico`, `assets/favicon.svg`, `assets/apple-touch-icon.png` : l’icône du site, une carte pliée aux couleurs du logo.
- `assets/banner.png` : la bannière de partage (1200 × 630).
- `data/stages.json` : les stages, produits par le script.
- `data/stages-ajouts.json` : les stages ajoutés à la main, repris par le script.
- `data/stages-ajouts.json` : les stages ajoutés à la main, repris par le script.
- `scripts/build-data.mjs` : récupération et nettoyage des données.
- `scripts/tags.mjs` : le vocabulaire des tags des stages (motifs cherchés dans le sujet).
- `scripts/retag.mjs` : recalcule les tags sans retélécharger la source.
- `scripts/version.mjs` : met à jour l'empreinte des fichiers du site dans `index.html`.
