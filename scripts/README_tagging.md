# Tagging des stages avec Mistral

Ce dossier contient des scripts pour attribuer automatiquement des tags aux stages en utilisant des modèles de langage Mistral.

## Script principal : `tag_with_mistral.py`

Ce script permet d'attribuer des tags aux stages en utilisant soit :
- **L'API Mistral** (recommandé pour une utilisation rapide)
- **Un modèle local** (pour une utilisation hors ligne, nécessite du GPU)

### Prérequis

#### Pour l'API Mistral (cloud) :
```bash
pip install httpx
```

Vous aurez besoin d'une **clé API Mistral** (gratuit pour les premiers tests) :
- Inscrivez-vous sur [Mistral AI](https://mistral.ai/)
- Récupérez votre clé API dans les paramètres de votre compte

#### Pour les modèles locaux :
```bash
pip install torch transformers accelerate
```

Modèles recommandés (nécessitent ~15-30 Go de VRAM) :
- `mistralai/Mistral-7B-v0.1` (7B paramètres)
- `mistralai/Mistral-7B-Instruct-v0.1` (meilleur pour le suivi d'instructions)

### Tags disponibles

Le script utilise **32 tags** organisés en 2 catégories :

**Techniques (15)** :
- `sig`, `geodesie`, `teledetection`, `photogrammetrie`, `ia`
- `lidar`, `modelisation3d`, `imagerie`, `geomatique`, `geostatistique`
- `hydrographie`, `dev`, `bigdata`, `iot`, `cloud`

**Domaines (17)** :
- `cartographie`, `environnement`, `urbanisme`, `agriculture`, `eau`
- `littoral`, `mobilite`, `energie`, `sante`, `patrimoine`
- `risques`, `geologie`, `climat`, `defense`, `tourisme`, `industrie`, `mines`

### Utilisation

#### Mode test (sans API, avec mock) :
```bash
python scripts/tag_with_mistral.py --dry-run
```

Traite 5 stages avec un système de mock basé sur des mots-clés.

#### Avec l'API Mistral :
```bash
# Traiter tous les stages
export MISTRAL_API_KEY="votre_clé_api"
python scripts/tag_with_mistral.py --api-key $MISTRAL_API_KEY

# Traiter un sous-ensemble (stages 0 à 100)
python scripts/tag_with_mistral.py --api-key $MISTRAL_API_KEY --start 0 --end 100

# Avec un modèle spécifique
python scripts/tag_with_mistral.py --api-key $MISTRAL_API_KEY --model mistral-small
```

#### Avec un modèle local :
```bash
# Premier lancement : télécharge le modèle (peut prendre du temps)
python scripts/tag_with_mistral.py --local --model mistralai/Mistral-7B-Instruct-v0.1 --start 0 --end 10

# Lancement suivant : le modèle est déjà en cache
python scripts/tag_with_mistral.py --local --start 10 --end 20
```

### Sortie

Les résultats sont sauvegardés dans `data/stages_mistral_tags.json` (par défaut) avec la structure :

```json
[
  {
    "id": "2025-ajout-01",
    "sujet": "Sujet du stage",
    "org": "Organisation",
    "existing_tags": ["tag1", "tag2"],
    "mistral_tags": ["tag1", "tag3"],
    "response": "Réponse brute du modèle"
  },
  ...
]
```

### Statistiques

Le script affiche des statistiques après traitement :
- Nombre de stages traités
- Nombre de correspondances exactes avec les tags existants
- Top 10 des tags attribués par Mistral

### Conseils

1. **Rate limiting** : L'API Mistral a des limites de rate. Utilisez `--batch-size 1` et le script fait déjà une pause de 0.5s entre chaque requête.

2. **Coût** : L'API Mistral est gratuite pour les premiers tests, puis payante. Vérifiez les tarifs sur [mistral.ai](https://mistral.ai/).

3. **Modèles locaux** : Pour traiter tous les 1127 stages avec un modèle local, prévoyez plusieurs heures (selon votre GPU).

4. **Validation** : Les résultats doivent être validés manuellement, surtout pour les stages ambigus.

### Personnalisation

Vous pouvez modifier les tags et leurs descriptions dans le script :
- `ALL_TAGS` : Liste complète des 32 tags
- `TAG_DESCRIPTIONS` : Descriptions détaillées de chaque tag
- `build_prompt()` : Modifiez le prompt pour adapter le comportement du modèle

### Exemple de prompt

Le script utilise ce format de prompt :

```
Tu es un expert en géomatique. Analyse le stage suivant et attribue-lui les tags les plus pertinents.

Stage : [SUJET] - [ORGANISATION]

Tags disponibles : `sig`, `geodesie`, `teledetection`, ...

Instructions :
- Sélectionne UNIQUEMENT les tags qui correspondent au stage
- Réponds avec une liste de tags séparés par des virgules, sans espace
- Ne réponds que par la liste des tags, sans explication ni commentaire
- Si aucun tag ne correspond, réponds par "aucun"
```

### Dépendances

Voir `requirements_tagging.txt` pour les dépendances Python.
