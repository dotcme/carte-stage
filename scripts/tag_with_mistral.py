#!/usr/bin/env python3
"""Attribue les tags des stages avec un modèle Mistral : c'est la seule source des tags.

Chaque stage (sujet + structure) est soumis au modèle, qui choisit ses tags dans le
vocabulaire ci-dessous. Les réponses sont gardées dans data/tags.json, avec une empreinte
du sujet et de la structure : seuls les stages nouveaux ou modifiés sont soumis au
lancement suivant, et scripts/build-data.mjs reprend les tags de ce fichier.

Deux moteurs gratuits :
  - l'API Mistral, avec l'offre gratuite « Experiment » (clé dans MISTRAL_API_KEY) ;
  - un modèle local servi par Ollama (https://ollama.com), sans compte ni clé.

Utilisation :
  python3 scripts/tag_with_mistral.py                     # API Mistral, stages à mettre à jour
  python3 scripts/tag_with_mistral.py --moteur ollama     # modèle local (ollama pull mistral-nemo)
  python3 scripts/tag_with_mistral.py --essai --limite 20 # affiche sans rien écrire
  python3 scripts/tag_with_mistral.py --tout              # retagge tous les stages
  python3 scripts/tag_with_mistral.py --ids 2024-1234,2025-ajout-01

Aucune dépendance : la bibliothèque standard de Python 3.9+ suffit.
"""

import argparse
import hashlib
import json
import os
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STAGES_FILE = ROOT / "data" / "stages.json"
CACHE_FILE = ROOT / "data" / "tags.json"

# Vocabulaire des tags. Les clés doivent rester celles de TAGS dans assets/app.js, qui
# porte leurs libellés. Les descriptions guident le modèle : les modifier, ou ajouter un
# tag, fait retagger tous les stages au lancement suivant.
TECHNIQUES = {
    "sig": "Systèmes d'information géographique : QGIS, ArcGIS, PostGIS, WebSIG, bases de données géographiques, analyse spatiale, géocodage",
    "geodesie": "Géodésie et topométrie : GNSS/GPS, référentiels de coordonnées, nivellement, gravimétrie, levés topographiques, station totale, auscultation de déformations, cadastre et travaux de géomètre-expert",
    "teledetection": "Télédétection : images satellites (Sentinel, Landsat, Pléiades, SPOT), radar/SAR/InSAR, images aériennes ou de drone analysées pour observer la Terre, indices spectraux",
    "photogrammetrie": "Photogrammétrie : restitution 3D ou orthophotos à partir de photos (aériennes, drone, terrestres), aérotriangulation, stéréoscopie, corrélation d'images",
    "ia": "Intelligence artificielle : apprentissage automatique ou profond, réseaux de neurones, segmentation ou classification par apprentissage, modèles de langage",
    "lidar": "LiDAR et lasergrammétrie : scanner laser terrestre, aérien ou mobile, nuages de points",
    "modelisation3d": "Modélisation 3D : maquettes numériques, BIM, jumeaux numériques, CityGML, maillages, modèles numériques de terrain ou de surface",
    "imagerie": "Traitement et analyse d'images hors télédétection classique : vision par ordinateur, imagerie multi ou hyperspectrale, restauration d'images",
    "geostatistique": "Géostatistique et statistique spatiale : interpolation, krigeage, modèles spatio-temporels",
    "hydrographie": "Hydrographie : bathymétrie, sondeurs, sonar, levés en mer ou en rivière",
    "dev": "Développement logiciel : programmation, scripts, plugins, applications web ou mobiles, API, automatisation de traitements, DevOps. Pas pour « développement d'une méthode » sans logiciel",
    "bigdata": "Données massives et ingénierie des données : bases de données volumineuses, entrepôts, chaînes de traitement de données, science des données",
    "iot": "Objets connectés et réseaux de capteurs",
    "cloud": "Informatique en nuage : AWS, Azure, Google Cloud, calcul distribué hébergé",
}
DOMAINES = {
    "cartographie": "Cartographie : production ou conception de cartes, atlas, sémiologie, généralisation, OpenStreetMap, géoréférencement de cartes",
    "environnement": "Environnement : écologie, biodiversité, forêts, végétation, sols, pollution, qualité de l'air, déchets, espaces naturels",
    "urbanisme": "Urbanisme et aménagement : villes, bâtiments, logement, foncier, occupation du sol, planification territoriale",
    "agriculture": "Agriculture : cultures, parcelles agricoles, viticulture, élevage, irrigation, agroforesterie",
    "eau": "Eau : hydrologie, rivières, lacs, nappes, bassins versants, eau potable, assainissement, neige et glaciers",
    "littoral": "Littoral et milieu marin : côtes, océans, ports, estuaires, fonds marins, banquise",
    "mobilite": "Mobilité et transports : routes, voirie, trafic, vélo, transports en commun, ferroviaire, logistique, calcul d'itinéraires",
    "energie": "Énergie : réseaux électriques ou de gaz, énergies renouvelables, solaire, éolien, géothermie, nucléaire, hydrocarbures",
    "sante": "Santé : santé publique, épidémiologie, maladies, hôpitaux, imagerie médicale",
    "patrimoine": "Patrimoine : archéologie, monuments, histoire, musées, archives anciennes",
    "risques": "Risques : catastrophes naturelles ou industrielles, inondations, séismes, volcans, glissements de terrain, incendies, sécurité civile, secours",
    "geologie": "Géologie et géophysique : roches, tectonique, croûte terrestre, sous-sol",
    "climat": "Climat : changement climatique, météorologie, gaz à effet de serre, adaptation",
    "defense": "Défense : armées, renseignement géospatial militaire, sécurité nationale",
    "tourisme": "Tourisme et loisirs : randonnée, activités de plein air, sport, fréquentation touristique",
    "industrie": "Industrie : usines, production industrielle, ouvrages et chantiers industriels",
    "mines": "Mines et carrières : extraction minière, carrières, stockage souterrain",
}
TAGS = {**TECHNIQUES, **DOMAINES}

EXEMPLES = [
    ("Développement d'un plugin QGIS pour le suivi des haies", "Parc naturel régional du Vexin", ["sig", "dev", "environnement"]),
    ("Levés topographiques et implantation", "Cabinet de géomètre-expert", ["geodesie"]),
    ("Détection des bâtiments par deep learning sur images Pléiades", "IGN", ["ia", "teledetection", "urbanisme"]),
    ("Stage de fin d'études", "Keolis", ["mobilite"]),
    ("Consultant données", "Cabinet de conseil", []),
]


def vocabulaire_texte():
    lignes = ["Techniques (les méthodes et outils employés) :"]
    lignes += [f"- {k} : {v}" for k, v in TECHNIQUES.items()]
    lignes += ["", "Domaines (le secteur d'application du stage) :"]
    lignes += [f"- {k} : {v}" for k, v in DOMAINES.items()]
    return "\n".join(lignes)


def exemples_texte():
    lignes = []
    for i, (sujet, org, tags) in enumerate(EXEMPLES, 1):
        lignes.append(f"{i}. Sujet : {sujet} | Structure : {org} -> {json.dumps(tags)}")
    return "\n".join(lignes)


SYSTEME = f"""Tu classes des stages d'étudiants d'une école de géomatique (sciences géographiques, topographie, SIG, télédétection).
Pour chaque stage, tu choisis ses tags dans ce vocabulaire fermé :

{vocabulaire_texte()}

Règles :
- N'emploie que les clés ci-dessus, écrites exactement ainsi (minuscules, sans accent).
- Un tag technique n'est donné que si le sujet dit ou implique clairement la méthode ; un domaine que si le sujet ou la structure indique clairement le secteur. Pas de déduction lointaine.
- La structure (organisme d'accueil) peut indiquer le domaine, surtout quand le sujet est vague, mais pas la technique.
- En général 1 à 4 tags ; au plus 6. Si rien n'est clair, la liste est vide.

Exemples :
{exemples_texte()}

Réponds uniquement par un objet JSON de la forme {{"resultats": [{{"n": 1, "tags": ["sig", "eau"]}}, ...]}}, avec une entrée par stage, dans l'ordre, sans commentaire."""

# Empreinte du vocabulaire et des consignes : si elle change, tous les stages sont retaggés.
VERSION = hashlib.sha1(SYSTEME.encode("utf-8")).hexdigest()[:12]


def empreinte(stage):
    """Même calcul que dans scripts/build-data.mjs."""
    texte = f"{stage.get('sujet') or ''}\n{stage.get('org') or ''}"
    return hashlib.sha1(texte.encode("utf-8")).hexdigest()[:12]


def message_lot(lot):
    lignes = [f"Classe ces {len(lot)} stages :"]
    for i, s in enumerate(lot, 1):
        sujet = " ".join((s.get("sujet") or "").split()) or "(sans sujet)"
        org = " ".join((s.get("org") or "").split()) or "(inconnue)"
        lignes.append(f"{i}. Sujet : {sujet} | Structure : {org}")
    return "\n".join(lignes)


# ---------- Appels au modèle ----------

class ErreurModele(Exception):
    pass


def post_json(url, payload, headers, timeout):
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers}, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))


def avec_reprises(appel, essais=6):
    """Relance en cas de limite de débit (429), d'erreur serveur ou de coupure réseau."""
    for n in range(essais):
        try:
            return appel()
        except urllib.error.HTTPError as e:
            corps = e.read().decode("utf-8", "replace")[:300]
            if e.code not in (408, 429, 500, 502, 503, 504) or n == essais - 1:
                raise ErreurModele(f"HTTP {e.code} : {corps}") from e
            attente = float(e.headers.get("Retry-After") or 0) or 2 ** (n + 1)
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            if n == essais - 1:
                raise ErreurModele(f"réseau : {e}") from e
            attente = 2 ** (n + 1)
        print(f"  nouvel essai dans {attente:.0f} s…", file=sys.stderr)
        time.sleep(attente)


def appel_mistral(args, messages):
    payload = {
        "model": args.modele,
        "messages": messages,
        "temperature": 0,
        "response_format": {"type": "json_object"},
    }
    headers = {"Authorization": f"Bearer {args.cle}"}
    rep = avec_reprises(lambda: post_json(args.url, payload, headers, args.delai))
    return rep["choices"][0]["message"]["content"]


def appel_ollama(args, messages):
    payload = {
        "model": args.modele,
        "messages": messages,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0},
    }
    rep = avec_reprises(lambda: post_json(args.url, payload, {}, args.delai))
    return rep["message"]["content"]


def normaliser_tag(t):
    t = unicodedata.normalize("NFD", str(t).strip().strip("`'\"").lower())
    return "".join(c for c in t if not unicodedata.combining(c)).replace(" ", "").replace("-", "")


def lire_reponse(texte, taille):
    """Renvoie une liste de `taille` listes de tags (None pour un stage absent de la réponse)."""
    try:
        data = json.loads(texte[texte.index("{"): texte.rindex("}") + 1])
    except ValueError as e:
        raise ErreurModele(f"réponse illisible : {texte[:200]}") from e
    entrees = data.get("resultats") if isinstance(data, dict) else None
    if not isinstance(entrees, list):
        raise ErreurModele(f"réponse sans « resultats » : {texte[:200]}")

    resultats, inconnus = [None] * taille, set()
    for i, e in enumerate(entrees):
        if not isinstance(e, dict):
            continue
        n = e.get("n", i + 1)
        if not isinstance(n, int) or not 1 <= n <= taille or not isinstance(e.get("tags"), list):
            continue
        tags = []
        for t in e["tags"]:
            k = normaliser_tag(t)
            if k in TAGS:
                if k not in tags:
                    tags.append(k)
            else:
                inconnus.add(str(t))
        ordre = list(TAGS)  # ordre du vocabulaire, comme dans le filtre du site
        resultats[n - 1] = sorted(tags, key=ordre.index)
    if inconnus:
        print(f"  tags hors vocabulaire ignorés : {', '.join(sorted(inconnus))}", file=sys.stderr)
    return resultats


# ---------- Fichiers ----------

def lire_json(chemin, defaut):
    try:
        return json.loads(chemin.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return defaut


def ecrire_json(chemin, data, compact):
    tmp = chemin.with_suffix(".tmp")
    if compact:
        texte = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    else:
        texte = json.dumps(data, ensure_ascii=False, indent=1, sort_keys=True) + "\n"
    tmp.write_text(texte, encoding="utf-8")
    tmp.replace(chemin)


def a_jour(cache, stage):
    e = cache["stages"].get(stage["id"])
    return bool(e) and e.get("empreinte") == empreinte(stage) and cache.get("version") == VERSION


def appliquer(stages, cache):
    """Recopie dans les stages les tags du cache ; un stage sans tags à jour n'en a aucun."""
    for s in stages:
        s["tags"] = cache["stages"][s["id"]]["tags"] if a_jour(cache, s) else []


def statistiques(stages, cache):
    compte = {}
    for s in stages:
        for t in s["tags"]:
            compte[t] = compte.get(t, 0) + 1
    restants = sum(not a_jour(cache, s) for s in stages)
    vides = sum(not s["tags"] and a_jour(cache, s) for s in stages)
    print(f"\n{len(stages)} stages : {len(stages) - restants} taggés par le modèle "
          f"(dont {vides} sans tag), {restants} à traiter")
    for t in TAGS:
        print(f"{compte.get(t, 0):5}  {t}")


# ---------- Programme ----------

def main():
    p = argparse.ArgumentParser(description="Attribue les tags des stages avec un modèle Mistral.")
    p.add_argument("--moteur", choices=["mistral", "ollama"], default="mistral",
                   help="API Mistral (offre gratuite, par défaut) ou modèle local servi par Ollama")
    p.add_argument("--modele", help="défaut : mistral-small-latest (API) ou mistral-nemo (Ollama)")
    p.add_argument("--cle", default=os.environ.get("MISTRAL_API_KEY"),
                   help="clé de l'API Mistral (défaut : variable MISTRAL_API_KEY)")
    p.add_argument("--url", help="adresse du service (défaut : API Mistral, ou Ollama sur localhost:11434)")
    p.add_argument("--lot", type=int, default=10, help="stages envoyés par requête (défaut : 10)")
    p.add_argument("--pause", type=float, help="secondes entre deux requêtes (défaut : 1.5 pour l'API, 0 pour Ollama)")
    p.add_argument("--delai", type=float, default=180, help="délai d'attente d'une réponse, en secondes")
    p.add_argument("--tout", action="store_true", help="retagger tous les stages, même à jour")
    p.add_argument("--ids", help="retagger ces stages seulement (identifiants séparés par des virgules)")
    p.add_argument("--limite", type=int, help="traiter au plus ce nombre de stages")
    p.add_argument("--essai", action="store_true", help="afficher les tags proposés sans rien écrire")
    args = p.parse_args()

    if args.moteur == "mistral":
        args.modele = args.modele or "mistral-small-latest"
        args.url = args.url or "https://api.mistral.ai/v1/chat/completions"
        args.pause = 1.5 if args.pause is None else args.pause
        appel = appel_mistral
    else:
        args.modele = args.modele or "mistral-nemo"
        args.url = args.url or "http://localhost:11434/api/chat"
        args.pause = 0 if args.pause is None else args.pause
        appel = appel_ollama

    data = lire_json(STAGES_FILE, None)
    if data is None:
        sys.exit(f"{STAGES_FILE} introuvable : lancer d'abord node scripts/build-data.mjs")
    stages = data["stages"]
    cache = lire_json(CACHE_FILE, {"version": VERSION, "stages": {}})
    if cache.get("version") != VERSION and cache["stages"]:
        print("Le vocabulaire ou les consignes ont changé : tous les stages seront retaggés.")

    if args.ids:
        voulus = set(args.ids.split(","))
        a_faire = [s for s in stages if s["id"] in voulus]
        absents = voulus - {s["id"] for s in a_faire}
        if absents:
            sys.exit(f"Stages introuvables : {', '.join(sorted(absents))}")
    else:
        a_faire = [s for s in stages if args.tout or not a_jour(cache, s)]
    if args.limite is not None:
        a_faire = a_faire[:args.limite]

    if not a_faire:
        print("Tous les stages sont à jour.")
    elif args.moteur == "mistral" and not args.cle:
        sys.exit("Clé de l'API Mistral manquante : export MISTRAL_API_KEY=… ou --cle "
                 "(ou --moteur ollama pour un modèle local).")
    else:
        print(f"{len(a_faire)} stages à tagger avec {args.modele} ({args.moteur}), par lots de {args.lot}")

    # Les stages déjà à jour gardent leurs tags si seule la version change en cours de route.
    if cache.get("version") != VERSION:
        cache = {"version": VERSION, "stages": {}}
    echecs = 0
    for debut in range(0, len(a_faire), args.lot):
        lot = a_faire[debut:debut + args.lot]
        messages = [{"role": "system", "content": SYSTEME}, {"role": "user", "content": message_lot(lot)}]
        try:
            resultats = lire_reponse(appel(args, messages), len(lot))
        except ErreurModele as e:
            print(f"Lot {debut + 1}-{debut + len(lot)} : {e}", file=sys.stderr)
            echecs += len(lot)
            continue
        for s, tags in zip(lot, resultats):
            if tags is None:
                echecs += 1
                print(f"  {s['id']} : absent de la réponse, à refaire", file=sys.stderr)
                continue
            print(f"  {s['id']:<16} {', '.join(tags) or '—':<45} {s['sujet'][:70]}")
            cache["stages"][s["id"]] = {"empreinte": empreinte(s), "tags": tags}
        if not args.essai:  # enregistré après chaque lot : un arrêt ne perd rien
            ecrire_json(CACHE_FILE, cache, compact=False)
        if args.pause and debut + args.lot < len(a_faire):
            time.sleep(args.pause)

    # Oublie les stages qui ont disparu des données.
    ids = {s["id"] for s in stages}
    cache["stages"] = {k: v for k, v in cache["stages"].items() if k in ids}
    appliquer(stages, cache)
    if args.essai:
        print("\nEssai : rien n'a été écrit.")
    else:
        ecrire_json(CACHE_FILE, cache, compact=False)
        ecrire_json(STAGES_FILE, data, compact=True)
    statistiques(stages, cache)
    if echecs:
        print(f"\n{echecs} stages n'ont pas pu être taggés : relancer le script pour les reprendre.")
        sys.exit(1)


if __name__ == "__main__":
    main()
