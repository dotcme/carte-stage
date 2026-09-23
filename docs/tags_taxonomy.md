# Taxonomie des Tags - Stages de Carte-Stage

## Introduction

Ce document décrit la taxonomie des tags utilisée pour classer les stages du fichier `data/stages.json`. 

La refonte complète des tags a été réalisée en analysant chaque stage individuellement à partir de :
- **Son intitulé (sujet)**
- **Son organisation (org)**

## Statistiques Générales

- **Nombre total de stages** : 1127
- **Stages avec tags** : 1112 (98,7%)
- **Stages sans tags** : 15 (1,3%) - stages hors domaine ou trop génériques
- **Total tags attribués** : 2194
- **Moyenne de tags par stage** : 1,95

## Catégories de Tags

Les tags sont organisés en 3 grandes catégories :

### 1. Technologies & Méthodologies (11 tags)

Ces tags décrivent les **compétences techniques** et méthodologies utilisées dans les stages.

| Tag | Description | Occurrences |
|-----|-------------|-------------|
| `sig` | Systèmes d'Information Géographique (QGIS, ArcGIS, PostGIS, etc.) | 255 |
| `geodesie` | Géodésie, topographie, GNSS, GPS, nivellement, MNT | 188 |
| `teledetection` | Télédétection, imagerie satellite, observation de la Terre | 131 |
| `photogrammetrie` | Photogrammétrie, acquisition par drone/UAV | 84 |
| `ia` | Intelligence Artificielle, Machine Learning, Deep Learning, algorithmes | 57 |
| `lidar` | LiDAR, scanning laser, nuage de points | 48 |
| `modelisation3d` | Modélisation 3D, BIM, jumeaux numériques, reconstruction 3D | 44 |
| `imagerie` | Traitement d'image, analyse d'image, imagerie multispectrale | 42 |
| `geomatique` | Géomatique | 31 |
| `geostatistique` | Géostatistique, analyse spatiale, interpolation, kriging | 12 |
| `hydrographie` | Hydrographie, bathymétrie, sonar | 12 |

### 2. Informatique (4 tags)

Ces tags décrivent les **compétences informatiques** générales.

| Tag | Description | Occurrences |
|-----|-------------|-------------|
| `dev` | Développement logiciel, programmation, applications web/mobile | 331 |
| `bigdata` | Big Data, science des données, bases de données | 82 |
| `iot` | Internet des Objets, capteurs connectés | 12 |
| `cloud` | Cloud computing, AWS, Azure, GCP | 9 |

### 3. Domaines d'Application (17 tags)

Ces tags décrivent les **secteurs d'application** ou domaines métiers.

| Tag | Description | Occurrences |
|-----|-------------|-------------|
| `cartographie` | Cartographie, production cartographique, atlas | 199 |
| `environnement` | Environnement, écologie, biodiversité, forêts, climat | 148 |
| `urbanisme` | Urbanisme, aménagement du territoire, villes | 91 |
| `eau` | Eau, hydrologie, gestion de l'eau, inondations | 72 |
| `mobilite` | Mobilité, transport, déplacements, itinéraires | 48 |
| `energie` | Énergie, énergies renouvelables, solaire, éolien | 45 |
| `patrimoine` | Patrimoine culturel, historique, monuments, musées | 49 |
| `littoral` | Littoral, zones côtières, mer, océan | 40 |
| `risques` | Gestion des risques, catastrophes naturelles | 35 |
| `geologie` | Géologie, roches, croûte terrestre | 31 |
| `agriculture` | Agriculture, agronomie, cultures | 30 |
| `climat` | Climat, changement climatique | 24 |
| `sante` | Santé publique, épidémiologie, maladies | 14 |
| `defense` | Défense, militaire, sécurité | 12 |
| `mines` | Mines, extraction minière, carrières | 12 |
| `tourisme` | Tourisme, voyages, itinéraires touristiques | 3 |
| `industrie` | Industrie, manufacturing, production industrielle | 2 |

## Méthodologie d'Attribution

### 1. Analyse par Mots-Clés (Patterns)

Chaque tag a une liste de **patterns** (expressions régulières) qui permettent de l'identifier dans le sujet du stage. Par exemple :
- Le tag `sig` est identifié par des mots comme "sig", "gis", "système d'information géographique", "qgis", "arcgis", etc.
- Le tag `teledetection` est identifié par "télédétection", "remote sensing", "satellite", "sentinel", etc.

### 2. Analyse par Organisation

Certaines organisations permettent de déduire des tags spécifiques :
- **IGN** → `sig`, `cartographie`, `geodesie`
- **INSEE** → `bigdata`
- **SNCF** → `mobilite`
- **CNES** → `teledetection`, `sig`
- **IPGP** → `geodesie`, `geologie`
- **BRGM** → `geologie`, `risques`, `eau`
- **SUEZ** → `environnement`, `eau`
- **Esri** → `sig`
- **Prospega** → `sig`, `teledetection`
- **Isogeo** → `sig`
- **TotalEnergies** → `energie`
- **MBDA** → `defense`

### 3. Corrections Manuelles

Certains stages nécessitaient une analyse contextuelle plus fine. Des corrections manuelles ont été appliquées pour :
- Les stages avec des sujets ambigus
- Les stages où l'organisation donne un indice fort
- Les stages multithématiques

## Stages Sans Tags (15)

Les 15 stages suivants n'ont pas de tags car ils sont **hors du domaine principal** (géomatique, environnement, aménagement) :

| ID | Organisation | Sujet |
|----|-------------|-------|
| 2024-104867 | CERN | Physique des particules (LHC) |
| 2022-1449 | Astrup Fearnley Code | Galerie d'art (hors domaine) |
| 2022-1443 | Groupe Carrefour | Commerce/retail (hors domaine) |
| 2021-1302 | COGF groupe | Optimisation CRM (hors domaine) |
| 2021-1157 | ENSTA Bretagne | Stage générique |
| 2021-1220 | PCM ingénierie | Sujet non précisé |
| 2021-1109 | SAD-Marketing | Marketing (hors domaine) |
| 2020-1054 | Haatch Conseil | Consultant junior (générique) |
| 2019-840 | Spatial Dynamics Lab | Operandum (projet non précisé) |
| 2018-597 | Axione | Amélioration qualité (générique) |
| 2018-593 | Deloitte France | Audit SI (générique) |
| 2018-678 | Eon Reality Norway | Advisory (générique) |
| 2016-290 | Aéroports de Paris | Gestion indemnisation (hors domaine) |
| 2016-380 | Ayuda Media Systems | Système documentation (hors domaine) |
| 2016-367 | Diadeis | Technique impression (hors domaine) |

## Exemples d'Attribution

### Exemple 1: Stage avec plusieurs tags
**ID**: 2025-ajout-12  
**Sujet**: "Développement d'une application mobile sous Android ou iPhone, d'acquisition photogrammétrique couplé à un GPS RTK et transfert des données vers notre application Web Cloud SIG TESSERACT"  
**Organisation**: Cap Atlas  
**Tags**: `dev`, `photogrammetrie`, `geodesie`, `sig`, `cloud`  

**Explication**:
- `dev`: "Développement d'une application mobile"
- `photogrammetrie`: "acquisition photogrammétrique"
- `geodesie`: "GPS RTK"
- `sig`: "application Web Cloud SIG"
- `cloud`: "Cloud"

### Exemple 2: Tags déduits de l'organisation
**ID**: 2024-104907  
**Sujet**: "Projet de recherche MAP2050 - lot 6"  
**Organisation**: LVMT Laboratoire Ville Mobilité Transport  
**Tags**: `cartographie`  

**Explication**:
- L'organisation "LVMT Laboratoire Ville Mobilité Transport" indique un domaine lié à l'urbanisme et la mobilité
- "MAP2050" suggère un projet de cartographie

### Exemple 3: Tags par mots-clés
**ID**: 2023-104443  
**Sujet**: "Temporal behaviour of glacial flow of the Totten and Denman Glaciers, Antarctica"  
**Organisation**: The Australian National University  
**Tags**: `climat`, `teledetection`  

**Explication**:
- `climat`: "glacial flow", "Glaciers"
- `teledetection`: Analyse de données satellites (implicite pour l'étude des glaciers)

## Évolution par Rapport aux Tags Originaux

Les tags originaux (19 tags uniques) ont été complètement refondus pour créer une taxonomie plus riche et plus précise (32 tags uniques).

**Ancienne taxonomie** (19 tags) :
agriculture, cartographie, dev, eau, energie, environnement, geodesie, ia, lasergrammetrie, littoral, mobilite, modelisation3d, patrimoine, photogrammetrie, risques, sig, teledetection, topometrie, urbanisme

**Nouvelle taxonomie** (32 tags) :
- **11 Technologies**: ia, teledetection, photogrammetrie, lidar, sig, geodesie, modelisation3d, imagerie, geostatistique, hydrographie, geomatique
- **4 Informatique**: dev, bigdata, cloud, iot
- **17 Domaines**: cartographie, environnement, agriculture, eau, littoral, risques, urbanisme, mobilite, energie, sante, patrimoine, tourisme, industrie, mines, geologie, defense, climat

## Conclusion

Cette refonte permet une **classification plus fine et plus précise** des stages, facilitant :
- La recherche par compétences techniques
- La recherche par domaines d'application
- L'analyse des tendances (quels domaines sont les plus représentés)
- Le filtrage des stages pertinents pour un profil donné

La couverture de 98,7% des stages avec des tags pertinents montre que la taxonomie est adaptée au contenu des stages proposés.
