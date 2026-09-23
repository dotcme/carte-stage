# Carte des stages

Carte interactive des stages réalisés par les étudiantes et étudiants de Géodata Paris, de 2016-2017 à 2024-2025. Elle reprend la [carte publiée sur macarte](https://macarte.ign.fr/carte/R3wixb/Carte-des-stages-edition-2025) et ajoute :

- un filtre par année ;
- un filtre par cycle (ingénieur 2e et 3e année, géomètre-géomaticien, licence professionnelle), qui sert aussi de légende avec le nombre de stages ;
- un filtre par type de structure : laboratoire, entreprise ou service public ;
- un filtre France ou étranger, et un filtre par parcours de 3e année ;
- une recherche par ville, structure ou sujet ;
- la liste des stages affichés, synchronisée avec la carte ;
- une fiche par stage, avec un lien à partager ;
- le regroupement des points proches, avec la part de chaque cycle ;
- l’export CSV des stages affichés ;
- le choix du fond : Plan IGN, photographies aériennes ou OpenStreetMap.

Les filtres sont enregistrés dans l’adresse de la page (`#annee=2024-2025&structure=labo`, par exemple) : un lien copié ouvre la carte dans le même état.

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
- déduit le type de structure du nom de l’organisme, qui n’est pas renseigné dans la source.

Ce classement automatique peut se tromper. Pour corriger une structure, ajoutez son nom exact dans `data/structures-corrections.json` avec `labo`, `entreprise` ou `public`, puis relancez le script.

## Fichiers

- `index.html`, `assets/style.css`, `assets/app.js` : le site (Leaflet et Leaflet.markercluster, chargés depuis jsDelivr).
- `data/stages.json` : les stages, produits par le script.
- `scripts/build-data.mjs` : récupération et nettoyage des données.
