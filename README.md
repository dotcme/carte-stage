# Carte des stages

Carte interactive des stages réalisés par les étudiantes et étudiants de Géodata Paris, de 2016-2017 à 2025-2026. Elle reprend la [carte publiée sur macarte](https://macarte.ign.fr/carte/R3wixb/Carte-des-stages-edition-2025) et ajoute :

- des filtres regroupés dans le panneau : année, cycle — qui sert aussi de légende avec le nombre de stages —, parcours de 3e année (sous-catégories à cocher sous « Ingénieur 3e année »), type de structure (laboratoire, entreprise, service public), lieu (une liste déroulante : partout ; étranger et outre-mer, puis France hexagonale, Corse comprise ; puis les autres pays par ordre alphabétique — un stage noté « France » mais situé outre-mer ne compte pas dans la France hexagonale) et tags (15 techniques comme SIG ou télédétection, 17 domaines comme eau ou urbanisme) ;
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

puis ouvrir <http://localhost:8000>.

## Mise en ligne

Le site est publié par GitHub Pages depuis la racine de la branche `main`, à l'adresse <https://stage.geodataparis.xyz>. Chaque push sur `main` le met à jour en une minute environ.

- `CNAME` donne le domaine à GitHub Pages ; l'adresse `dotcme.github.io/carte-stage` y redirige.
- `.nojekyll` fait publier les fichiers tels quels, sans passer par Jekyll.
- Chez l'hébergeur du domaine, `stage` est un enregistrement CNAME vers `dotcme.github.io`.
- `vercel.json` redirige l'ancienne adresse `carte-stage-wedq.vercel.app` vers le nouveau domaine, tant que le projet Vercel existe.

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
- reprend les tags des stages qu'il retrouve à l'identique (même année, cycle, structure et sujet) ;
- numérote chaque stage « année-cycle-numéro », séquentiel par année et cycle dans l'ordre du fichier.

Les ids changent donc dès qu'un stage est ajouté ou retiré : un lien partagé qui pointe vers un stage peut se briser à la mise à jour suivante.

Les stages absents de macarte (ceux de 2025-2026, par exemple) sont saisis à la main dans `data/stages.json`, au format des autres, sans id ni `tags`. La reconstruction les reconnaît à leur contenu, leur attribue un id et les conserve ; le taggeur leur attribue leurs tags. Un stage disparu de macarte y reste aussi : supprimez-le à la main si son retrait est voulu.

Ce classement automatique peut se tromper. Pour corriger une structure, ajoutez son nom exact à `CORRECTIONS`, en tête de `scripts/build-data.mjs` (comme `COUNTRY_FIX` pour les pays), avec `labo`, `entreprise` ou `public`, puis relancez le script.

## Attribuer les tags

Les tags sont choisis par un modèle de langage Mistral, qui lit le sujet et la structure de chaque stage :

```sh
echo 'MISTRAL_API_KEY=…' > .env   # clé gratuite de l'offre « Experiment » de Mistral ; .env est ignoré par git
python3 scripts/tag_with_mistral.py
```

Le script (Python 3.9 ou plus récent, sans dépendance) ne soumet que les stages sans tags : les nouveaux et ceux dont le sujet ou la structure a changé, à qui la reconstruction a retiré les leurs. Il écrit les tags de chaque stage dans `data/stages.json` et y note la version de son vocabulaire (`tags_version`) : si le vocabulaire ou les consignes changent, tous les stages sont retaggés au lancement suivant. Il faut donc le lancer après chaque `node scripts/build-data.mjs` qui annonce des stages sans tags à jour. On peut aussi utiliser un modèle local, sans compte, avec [Ollama](https://ollama.com) : `ollama pull mistral-nemo`, puis `python3 scripts/tag_with_mistral.py --moteur ollama`. Voir `scripts/README_tagging.md`.

Le vocabulaire (32 tags, chacun avec une description qui guide le modèle) est dans le script ; les libellés affichés sont dans `assets/app.js`. Modifier le vocabulaire ou les consignes fait retagger tous les stages au lancement suivant.

## Publier une modification du site

Avant chaque commit qui modifie `assets/style.css`, `assets/basemap.js` ou `assets/app.js`, lancer :

```sh
node scripts/version.mjs
```

Le script ajoute à ces fichiers, dans `index.html`, une empreinte de leur contenu (`assets/app.js?v=ec151dcf`, par exemple). Quand un fichier change, son adresse change aussi, et les navigateurs chargent la nouvelle version au lieu de garder l'ancienne en cache. Les données, elles, sont revérifiées auprès du serveur à chaque visite : il n'y a rien à faire après une mise à jour de `data/stages.json`. GitHub Pages laisse les navigateurs garder la page elle-même dix minutes : une modification peut mettre ce temps à apparaître pour qui a déjà ouvert la carte.

## Fichiers

- `index.html`, `assets/style.css`, `assets/app.js` : le site (Leaflet, Leaflet.markercluster et MapLibre, chargés depuis jsDelivr).
- `assets/basemap.js` : le style du plan clair (tuiles vectorielles OpenFreeMap, données OpenStreetMap).
- `favicon.ico`, `assets/favicon.svg`, `assets/apple-touch-icon.png` : l’icône du site, une carte pliée aux couleurs du logo.
- `assets/banner.png` : la bannière de partage (1200 × 630).
- `data/stages.json` : toutes les données — les stages, avec leurs ids séquentiels « année-cycle-numéro » et leurs tags, et la version du vocabulaire des tags. Produit par `scripts/build-data.mjs`, complété par `scripts/tag_with_mistral.py`.
- `scripts/build-data.mjs` : récupération et nettoyage des données.
- `scripts/tag_with_mistral.py` : attribue les tags avec un modèle Mistral (documenté dans `scripts/README_tagging.md`).
- `scripts/version.mjs` : met à jour l'empreinte des fichiers du site dans `index.html`.
- `CNAME`, `.nojekyll`, `vercel.json` : la mise en ligne (voir plus haut).
