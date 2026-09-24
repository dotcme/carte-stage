# Attribution des tags avec Mistral

`tag_with_mistral.py` est la seule source des tags des stages. Il soumet le sujet et la structure de chaque stage à un modèle Mistral, qui choisit ses tags dans un vocabulaire fermé de 31 tags : 14 techniques (méthodes et outils employés) et 17 domaines (secteur d'application).

Le script n'a besoin que de Python 3.9 ou plus récent, sans dépendance à installer.

## Deux moteurs gratuits

### L'API Mistral (par défaut)

L'offre gratuite « Experiment » de Mistral donne accès à l'API avec un débit limité : il suffit de créer un compte sur [console.mistral.ai](https://console.mistral.ai), de choisir cette offre et de créer une clé. Placez-la dans un fichier `.env` à la racine du dépôt (il est ignoré par git), ou dans la variable d'environnement du même nom :

```sh
echo 'MISTRAL_API_KEY=votre_clé' > .env
python3 scripts/tag_with_mistral.py
```

Le modèle par défaut est `ministral-14b-latest` : avec l'offre gratuite, il accepte 30 requêtes par minute, alors que `mistral-small` et `mistral-medium` y sont fermés (0 requête par minute ; le script le signale au lieu d'insister). Le script envoie les stages par lots de 10, attend 2,5 s entre deux requêtes et, s'il reçoit une limite de débit (erreur 429) ou une erreur du serveur, réessaie en attendant de plus en plus longtemps. Les 1 127 stages demandent 113 requêtes.

### Un modèle local avec Ollama

Sans compte ni clé, et sans que les sujets quittent la machine. Il faut installer [Ollama](https://ollama.com), puis :

```sh
ollama pull mistral-nemo          # 12 milliards de paramètres, environ 7 Go
python3 scripts/tag_with_mistral.py --moteur ollama
```

Sur une machine modeste, `--modele mistral` (7 milliards de paramètres, environ 4 Go) va plus vite, mais classe moins bien. Avec un petit modèle, des lots plus petits (`--lot 5`) donnent des réponses plus fiables.

## Ce que fait le script

1. Il lit `data/stages.json` et `data/tags.json`, le fichier des réponses déjà obtenues.
2. Il retient les stages à tagger : ceux qui sont absents de `data/tags.json`, et ceux dont le sujet ou la structure a changé depuis. Chaque réponse est gardée avec une empreinte de ce texte.
3. Il envoie ces stages par lots. Les consignes contiennent le vocabulaire, une description de chaque tag, les règles d'attribution et quelques exemples. Le modèle répond en JSON (`{"resultats": [{"n": 1, "tags": [...]}]}`), avec une température à 0 pour que les réponses soient reproductibles.
4. Il contrôle chaque réponse. Seules les clés exactes du vocabulaire sont retenues : les majuscules, les accents et les guillemets sont tolérés, et les autres tags sont écartés et signalés. Un stage qui manque dans la réponse, ou un lot en erreur, est laissé de côté et repris au lancement suivant ; le script se termine alors avec le code 1.
5. Il enregistre `data/tags.json` après chaque lot : un arrêt ne perd rien. À la fin, il écrit les tags dans `data/stages.json` et affiche combien de stages porte chaque tag.

`node scripts/build-data.mjs` reprend les tags de `data/tags.json`. Il laisse sans tag les stages nouveaux ou modifiés et indique combien il en reste à traiter.

## Options

| Option | Rôle |
|---|---|
| `--moteur mistral\|ollama` | API Mistral (par défaut) ou modèle local servi par Ollama |
| `--modele NOM` | défaut : `ministral-14b-latest` (API) ou `mistral-nemo` (Ollama) |
| `--cle CLÉ` | clé de l'API, à la place de `MISTRAL_API_KEY` (environnement ou `.env`) |
| `--url URL` | adresse du service, par exemple une instance Ollama sur une autre machine |
| `--lot N` | stages par requête (défaut : 10) |
| `--pause S` | secondes entre deux requêtes (défaut : 2,5 pour l'API, 0 pour Ollama) |
| `--tout` | retagger tous les stages, même ceux qui sont à jour |
| `--ids A,B` | retagger ces stages seulement |
| `--limite N` | traiter au plus N stages |
| `--essai` | afficher les tags proposés sans rien écrire |

Pour évaluer un modèle ou des consignes avant de tout relancer, commencez par un essai : `python3 scripts/tag_with_mistral.py --essai --tout --limite 30`.

## Modifier le vocabulaire

Le vocabulaire est défini dans `TECHNIQUES` et `DOMAINES`, en tête du script. Les clés doivent rester celles de `TAGS` dans `assets/app.js`, qui porte les libellés affichés sur le site : un nouveau tag s'ajoute aux deux endroits, puis on lance `node scripts/version.mjs`. Les descriptions guident le modèle : pour corriger une confusion fréquente, précisez la description concernée plutôt que d'ajouter une règle.

Le texte des consignes a une empreinte, gardée dans `data/tags.json`. Toute modification du vocabulaire, des descriptions, des règles ou des exemples change cette empreinte, et le lancement suivant retagge alors tous les stages.
