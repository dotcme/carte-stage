#!/usr/bin/env python3
"""
Script pour attribuer des tags aux stages en utilisant un modèle Mistral.

Utilisation :
  python scripts/tag_with_mistral.py [--api-key YOUR_API_KEY] [--model MODEL] [--output FILE] [--start N] [--end N] [--dry-run]

Options :
  --api-key     Clé API Mistral (requise pour l'API cloud)
  --model       Modèle à utiliser (par défaut: mistral-tiny)
  --output      Fichier de sortie JSON (par défaut: data/stages_mistral_tags.json)
  --start       Index de départ (par défaut: 0)
  --end         Index de fin (par défaut: tous)
  --dry-run     Mode test : ne traite que 5 stages sans sauvegarder
  --local       Utiliser un modèle local avec transformers (nécessite installation)
  --batch-size  Taille du batch pour l'API (par défaut: 1)

Exemples :
  python scripts/tag_with_mistral.py --api-key $MISTRAL_API_KEY
  python scripts/tag_with_mistral.py --api-key $MISTRAL_API_KEY --start 0 --end 100
  python scripts/tag_with_mistral.py --local --model mistralai/Mistral-7B-v0.1
"""

import argparse
import json
import sys
import time
from pathlib import Path
from typing import List, Dict, Any

# Liste des 32 tags possibles
ALL_TAGS = [
    # Techniques (15)
    "sig", "geodesie", "teledetection", "photogrammetrie", "ia",
    "lidar", "modelisation3d", "imagerie", "geomatique", "geostatistique",
    "hydrographie", "dev", "bigdata", "iot", "cloud",
    # Domaines (17)
    "cartographie", "environnement", "urbanisme", "agriculture", "eau",
    "littoral", "mobilite", "energie", "sante", "patrimoine", "risques",
    "geologie", "climat", "defense", "tourisme", "industrie", "mines"
]

TAG_DESCRIPTIONS = {
    # Techniques
    "sig": "Systèmes d'Information Géographique (QGIS, ArcGIS, PostGIS, etc.)",
    "geodesie": "Géodésie, topographie, GNSS, GPS, nivellement, MNT",
    "teledetection": "Télédétection, imagerie satellite, observation de la Terre",
    "photogrammetrie": "Photogrammétrie, acquisition par drone/UAV",
    "ia": "Intelligence Artificielle, Machine Learning, Deep Learning",
    "lidar": "LiDAR, scanning laser, nuage de points",
    "modelisation3d": "Modélisation 3D, BIM, jumeaux numériques",
    "imagerie": "Traitement d'image, analyse d'image, imagerie multispectrale",
    "geomatique": "Géomatique",
    "geostatistique": "Géostatistique, analyse spatiale, interpolation, kriging",
    "hydrographie": "Hydrographie, bathymétrie, sonar",
    "dev": "Développement logiciel, programmation, applications web/mobile",
    "bigdata": "Big Data, science des données, bases de données",
    "iot": "Internet des Objets, capteurs connectés",
    "cloud": "Cloud computing, AWS, Azure, GCP",
    # Domaines
    "cartographie": "Cartographie, production cartographique, atlas",
    "environnement": "Environnement, écologie, biodiversité, forêts, climat",
    "urbanisme": "Urbanisme, aménagement du territoire, villes",
    "agriculture": "Agriculture, agronomie, cultures",
    "eau": "Eau, hydrologie, gestion de l'eau, inondations",
    "littoral": "Littoral, zones côtières, mer, océan",
    "mobilite": "Mobilité, transport, déplacements, itinéraires",
    "energie": "Énergie, énergies renouvelables, solaire, éolien",
    "sante": "Santé publique, épidémiologie, maladies",
    "patrimoine": "Patrimoine culturel, historique, monuments, musées",
    "risques": "Gestion des risques, catastrophes naturelles",
    "geologie": "Géologie, roches, croûte terrestre",
    "climat": "Climat, changement climatique",
    "defense": "Défense, militaire, sécurité",
    "tourisme": "Tourisme, voyages, itinéraires touristiques",
    "industrie": "Industrie, manufacturing, production industrielle",
    "mines": "Mines, extraction minière, carrières"
}


def load_stages(filepath: str = "data/stages.json") -> List[Dict[str, Any]]:
    """Charge les stages depuis un fichier JSON."""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["stages"]


def format_stage(stage: Dict[str, Any]) -> str:
    """Formate un stage pour le prompt."""
    sujet = stage.get("sujet", "")
    org = stage.get("org", "")
    return f"{sujet} - {org}".strip()


def build_prompt(stage_text: str) -> str:
    """Construit le prompt pour Mistral."""
    tags_list = ", ".join(f"`{tag}`" for tag in ALL_TAGS)
    return f"""Tu es un expert en géomatique. Analyse le stage suivant et attribue-lui les tags les plus pertinents.

Stage : {stage_text}

Tags disponibles : {tags_list}

Instructions :
- Sélectionne UNIQUEMENT les tags qui correspondent au stage
- Réponds avec une liste de tags séparés par des virgules, sans espace
- Ne réponds que par la liste des tags, sans explication ni commentaire
- Si aucun tag ne correspond, réponds par "aucun"

Exemple :
Stage : Développement d'une application SIG avec QGIS - INRAE
Réponse : sig,dev,environnement

Stage : """


def call_mistral_api(api_key: str, prompt: str, model: str = "mistral-tiny") -> str:
    """Appelle l'API Mistral pour obtenir une réponse."""
    import httpx
    
    url = "https://api.mistral.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 100
    }
    
    try:
        response = httpx.post(url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        result = response.json()
        return result["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"Erreur API Mistral: {e}")
        return ""


def call_local_model(prompt: str, model_name: str = "mistralai/Mistral-7B-v0.1") -> str:
    """Utilise un modèle local avec transformers."""
    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer
        import torch
        
        # Charger le modèle et le tokenizer (une seule fois)
        if not hasattr(call_local_model, "model"):
            print("Chargement du modèle local... (cela peut prendre du temps)")
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            model = AutoModelForCausalLM.from_pretrained(model_name, torch_dtype=torch.float16, device_map="auto")
            call_local_model.model = model
            call_local_model.tokenizer = tokenizer
        
        tokenizer = call_local_model.tokenizer
        model = call_local_model.model
        
        inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512).to(model.device)
        outputs = model.generate(**inputs, max_new_tokens=100, do_sample=False, temperature=0.1)
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Extraire la réponse après le prompt
        return response[len(prompt):].strip()
    except Exception as e:
        print(f"Erreur modèle local: {e}")
        return ""


def mock_tagging(stage_text: str) -> str:
    """Mock simple pour le mode test sans API."""
    # Recherche de mots-clés simples pour le mode test
    stage_lower = stage_text.lower()
    tags = []
    
    if any(word in stage_lower for word in ['sig', 'qgis', 'arcgis', 'postgis']):
        tags.append('sig')
    if any(word in stage_lower for word in ['gps', 'gnss', 'nivellement', 'topo']):
        tags.append('geodesie')
    if any(word in stage_lower for word in ['satellite', 'imagerie', 'sentinel', 'télédétection']):
        tags.append('teledetection')
    if any(word in stage_lower for word in ['drone', 'photogrammetrie', 'stéréo']):
        tags.append('photogrammetrie')
    if any(word in stage_lower for word in ['ia', 'machine learning', 'deep learning']):
        tags.append('ia')
    if any(word in stage_lower for word in ['lidar', 'nuage de points']):
        tags.append('lidar')
    if any(word in stage_lower for word in ['3d', 'bim', 'modélisation']):
        tags.append('modelisation3d')
    if any(word in stage_lower for word in ['développement', 'python', 'javascript', 'application']):
        tags.append('dev')
    if any(word in stage_lower for word in ['cartographie', 'carte', 'atlas']):
        tags.append('cartographie')
    if any(word in stage_lower for word in ['environnement', 'écologie', 'biodiversité']):
        tags.append('environnement')
    if any(word in stage_lower for word in ['eau', 'hydrologie', 'inondation']):
        tags.append('eau')
    
    return ", ".join(tags) if tags else "aucun"


def parse_tags(response: str) -> List[str]:
    """Parse la réponse pour extraire les tags."""
    response = response.strip().lower()
    
    if response == "aucun" or not response:
        return []
    
    # Séparer par virgules, espaces, ou sauts de ligne
    tags = []
    for part in response.replace("\n", ",").split(","):
        tag = part.strip()
        if tag:
            tags.append(tag)
    
    # Valider que les tags sont dans ALL_TAGS
    valid_tags = []
    for tag in tags:
        if tag in ALL_TAGS:
            valid_tags.append(tag)
        else:
            # Essayer de trouver un tag similaire
            for valid_tag in ALL_TAGS:
                if tag in valid_tag or valid_tag in tag:
                    valid_tags.append(valid_tag)
                    break
    
    return list(set(valid_tags))  # Supprimer les doublons


def process_stages(
    stages: List[Dict[str, Any]],
    api_key: str = None,
    model: str = "mistral-tiny",
    use_local: bool = False,
    start_idx: int = 0,
    end_idx: int = None,
    dry_run: bool = False
) -> List[Dict[str, Any]]:
    """Traite les stages pour attribuer des tags."""
    results = []
    
    if end_idx is None:
        end_idx = len(stages)
    
    if dry_run:
        end_idx = min(start_idx + 5, end_idx)
        print(f"Mode test : traitement des stages {start_idx} à {end_idx}")
    
    for i, stage in enumerate(stages[start_idx:end_idx], start=start_idx):
        stage_text = format_stage(stage)
        prompt = build_prompt(stage_text)
        
        # Appeler le modèle
        if use_local:
            response = call_local_model(prompt, model)
        elif dry_run and not api_key:
            # En mode test sans clé API, utiliser un mock simple
            response = mock_tagging(stage_text)
        elif not api_key:
            print(f"Erreur : clé API requise pour le stage {i}")
            continue
        else:
            response = call_mistral_api(api_key, prompt, model)
        
        # Parser la réponse
        tags = parse_tags(response)
        
        results.append({
            "id": stage["id"],
            "sujet": stage["sujet"],
            "org": stage["org"],
            "existing_tags": stage.get("tags", []),
            "mistral_tags": tags,
            "response": response
        })
        
        print(f"Stage {i} ({stage['id']}): {len(tags)} tags - {tags}")
        
        # Petite pause pour éviter de dépasser les limites de rate
        if not dry_run:
            time.sleep(0.5)
    
    return results


def save_results(results: List[Dict[str, Any]], output_file: str) -> None:
    """Sauvegarde les résultats dans un fichier JSON."""
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"Résultats sauvegardés dans {output_file}")


def generate_statistics(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Génère des statistiques sur les résultats."""
    stats = {
        "total_stages": len(results),
        "tags_distribution": {},
        "existing_tags_distribution": {},
        "matches": 0,
        "mismatches": 0
    }
    
    for r in results:
        # Compter les nouveaux tags
        for tag in r["mistral_tags"]:
            stats["tags_distribution"][tag] = stats["tags_distribution"].get(tag, 0) + 1
        
        # Compter les tags existants
        for tag in r["existing_tags"]:
            stats["existing_tags_distribution"][tag] = stats["existing_tags_distribution"].get(tag, 0) + 1
        
        # Comparer
        if set(r["existing_tags"]) == set(r["mistral_tags"]):
            stats["matches"] += 1
        else:
            stats["mismatches"] += 1
    
    return stats


def main():
    parser = argparse.ArgumentParser(
        description="Attribuer des tags aux stages en utilisant un modèle Mistral"
    )
    parser.add_argument("--api-key", type=str, help="Clé API Mistral")
    parser.add_argument("--model", type=str, default="mistral-tiny", 
                        help="Modèle à utiliser (par défaut: mistral-tiny)")
    parser.add_argument("--output", type=str, default="data/stages_mistral_tags.json",
                        help="Fichier de sortie JSON")
    parser.add_argument("--start", type=int, default=0, help="Index de départ")
    parser.add_argument("--end", type=int, default=None, help="Index de fin")
    parser.add_argument("--dry-run", action="store_true", 
                        help="Mode test : ne traite que 5 stages")
    parser.add_argument("--local", action="store_true",
                        help="Utiliser un modèle local avec transformers")
    parser.add_argument("--batch-size", type=int, default=1,
                        help="Taille du batch pour l'API")
    
    args = parser.parse_args()
    
    # Charger les stages
    stages = load_stages()
    print(f"Chargé {len(stages)} stages")
    
    # Traiter les stages
    results = process_stages(
        stages=stages,
        api_key=args.api_key,
        model=args.model,
        use_local=args.local,
        start_idx=args.start,
        end_idx=args.end,
        dry_run=args.dry_run
    )
    
    # Afficher les statistiques
    stats = generate_statistics(results)
    print(f"\n--- Statistiques ---")
    print(f"Stages traités: {stats['total_stages']}")
    print(f"Correspondances exactes: {stats['matches']}")
    print(f"Différences: {stats['mismatches']}")
    print(f"\nTop 10 tags attribués par Mistral:")
    for tag, count in sorted(stats["tags_distribution"].items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {tag}: {count}")
    
    # Sauvegarder les résultats (sauf en mode dry-run)
    if not args.dry_run:
        save_results(results, args.output)
        print(f"\nRésultats complets sauvegardés dans {args.output}")
    else:
        print("\nMode test : résultats non sauvegardés")
        print("Exemples:")
        for r in results:
            print(f"  {r['id']}: {r['existing_tags']} -> {r['mistral_tags']}")


if __name__ == "__main__":
    main()
