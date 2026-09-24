// Vocabulaire des tags attribués à chaque stage : 15 tags techniques/méthodes et 17 domaines d'application.
// Les motifs sont cherchés dans le sujet du stage, en minuscules et sans accents : ils
// s'écrivent donc en ASCII (télédétection → teledetection, géodésie → geodesie), et un
// point remplace l'apostrophe (« cours d'eau » → cours d.eau).
// Un stage reçoit tous les tags dont au moins un motif correspond ; la liste peut être vide.
// Après modification ici : node scripts/build-data.mjs, ou node scripts/retag.mjs pour
// retagger data/stages.json sans retélécharger la source.

// ── Tags techniques (méthodologies + informatique) ──
const TECHNIQUES = [
  // Méthodologies
  ['sig', /\bsig\b|\bgis\b|webgis|arcgis|qgis|postgis|geodatabase|geo.?spatial|donnees spatiales|donnees spatialise|spatial data|information geographique|informatique geographique|geographic information|geographic data|donnees geographiques|analyse spatiale|spatial analysis|geoint|geo.?intelligen|geocodage|geocoding|geolocalisation|\besri\b/],
  ['geodesie', /geodes|\bgnss\b|\bgps\b|\begnos\b|\bgalileo\b|nivellement|referentiel|\bdatum\b|ellipso|\bgeoide\b|triangulation|gravimet|deformation|topometri|topograph|\bleves?\b|\breleves?\b|geometre|tacheometre|station totale|total station|\btopo\b|\bcabinet\b|cadastre|cadastral|polygonale/],
  ['teledetection', /teledetection|remote sensing|satellit|imagerie|imagery|sentinel|landsat|\bspot\b|insar|\bsar\b|\bradar\b|hyperspectral|multispectral|\bndvi\b|\bmodis\b|microwave|aerien|aerial|drone|\buav\b|\brpas\b|pleiades|earth engine|earth observation|observation de la terre|photointerpret/],
  ['photogrammetrie', /photogrammet|correlation d.images|stereoscop|\bstereo\b|orthophot|orthoimage|\bortho\b|aerotriang/],
  ['ia', /machine learning|deep learning|intelligence artificielle|artificial intelligence|\bia\b|neural|neurone|random forest|clustering|k-means|\bsvm\b|convolution|data scien|big data\b|apprentissage (automatique|profond)|predicti|classification automatique|automatic classification|latent diffusion|diffusion model/],
  ['lidar', /lasergrammet|lidar|\btls\b|nuages? de points|point clouds?|acquisition laser|laser scanning|scanner laser|laser scanner/],
  ['modelisation3d', /\b3d\b|city3d|jumeau numerique|digital twin|citygml|cityjson|\bmnt\b|\bmne\b|\bdem\b|\bdsm\b|\bdtm\b|maquette numerique|\bifc\b|\bbim\b|\bmesh(es)?\b|maillage|voxel|modeles? numeriques?/],
  ['imagerie', /traitement d.images?|analyse d.images?|imagerie multispectrale|imagerie hyperspectrale|processing images?|image analysis/],
  ['geostatistique', /geostatistique|analyse spatiale|interpolation|kriging|krigage/],
  ['hydrographie', /hydrograph|bathymetr|sonar|echo sounder|depth measurement/],
  // Informatique
  ['dev', /develop(?!pement (durable|region|territor|economiqu|urbain|local|rural|sociale))|automatis|automation|automated|automating|\bscript|python|javascript|typescript|\bapi\b|\bapis\b|plugin|devops|integration continue|continuous integration|pipeline|algorithm|webapp|web app|application web|logiciel|software|programmation|programming|\bcode\b|coding|open source|open data|opendata|\bdocker\b|kubernetes|microservice|\bsql\b|postgres|mysql|sqlite|mongodb|\bnosql\b|\betl\b|leaflet|mapbox|openlayers/],
  ['bigdata', /big data|science des donnees|bases? de donnees|database|data warehouse|data lake|hadoop|spark|\bdata\b.*analy/],
  ['iot', /internet des objets|\biot\b|capteurs? connectes?|connected sensors|smart sensors|embedded systems/],
  ['cloud', /cloud comput|\bcloud\b|aws|azure|gcp|google cloud|amazon web services|heroku|serverless/]
];

// ── Domaines d'application : le secteur concerné par le stage ──
const DOMAINES = [
  ['cartographie', /cartograph|\bcarto\b|\bcartes?\b|\batlas\b|\bmapping\b|openstreetmap|\bosm\b|georeferenc|\bgeneralis/],
  ['eau', /\beaux?\b|hydrolog|hydrogeolog|hydraulique|rivieres?\b|\blacs?\b|lagune|\bnappes?\b|bassin|\bcrues?\b|glacier|potable|assainissement|epuration|sanitation|wastewater|eaux usees|secheresse|drought|\bdebits?\b|\bwaters?\b|watershed|\bneige\b|\bsnow\b|enneigement|ressources? en eau|water resources|\betang\b|cours d.eau|\bsage\b/],
  ['environnement', /environnement|environment|ecologi|biodiversite|biodiversity|\bforets?\b|forests?|forestier|sylvicult|(?<!langage )naturel|climat|carbon|\bco2\b|durable|soutenab|\bdechets?\b|waste|recyclage|pollution|polluant|contamination|qualite de l.air|emission|conservation|\bespeces?\b|species|faune|flore|vegetation|effet de serre|\bsols?\b|soils?|rechauffement|preservation|zones? humide|wetland|green it|\brse\b|meteo/],
  ['urbanisme', /urban|urbain|\bville\b|\bvilles\b|\bcity\b|\bcities\b|mobilier urbain|\bbati\b|batiment|buildings?\b|habitat|logement|housing|amenagement|\bplanning\b|foncier|occupation du sol|land ?cover|land ?use|\bocs\b|\bmos\b|lotissement|subdivision|quartier|neighborhood|neighbourhood|zonage|zoning|renovation|rehabilitation|rural|residentiel|residential|densification/],
  ['mobilite', /mobilite|mobility|transport|\broute\b|\broutes\b|routier|routiere|\brouting\b|\broad\b|\broads\b|autoroute|highway|voirie|\bstreet\b|\bstreets\b|trafic|traffic|congestion|pieton|pedestrian|\bvelo\b|cyclab|\bbike\b|bicycle|\bbus\b|autobus|\btransit\b|logistique|logistics|supply chain|\bfret\b|freight|\btrains?\b|ferroviaire|\brail\b|railway|\bmetro\b|tramway|\btram\b|aeroport|airport|flotte|fleet|covoiturage|carpooling|parking|stationnement|\brues?\b|voiture|vehicule|vehicle|deplacement|\btrips?\b|\btravel\b/],
  ['patrimoine', /patrimoine|heritage|monument|archeolog|archaeolog|historique|historical|\bhistoire\b|history|restauration|musee|museum|memorial|chateau|castle|eglise|cathedrale|fouilles?\b|excavation|guerre\b|\bwar\b|fortification|\bmemoire\b/],
  ['risques', /risque|\brisk\b|risks\b|hazard|mouvement de terrain|landslide|glissement|eboulement|rockfall|effondrement|subsidence|erosion|seisme|seismic|earthquake|sismiqu|inondation|flood|avalanche|submersion|feu(x|) de foret|wildfire|incendie|\bfires?\b|volcan|erupti|\balea\b|catastrophe|disaster|secours|securite civile|rescue|emergency|resilience|tempete|\bstorm\b|cyclone|hurricane|falaise|cliff|canicule|heat wave|heatwave/],
  ['energie', /energie|energy|energetique|solaire|solar|eolien|wind turbine|wind farm|wind power|wind energy|photovoltaique|photovoltaic|geotherm|renouvelable|renewable|electri|nucleaire|nuclear|biomasse|biomass|methani|biogaz|petrole|petrolier|\boils?\b|\bgaz\b|chaleur\b|heating|chauffage|hydroelect|power grid|\bgrid\b|electricite|electricity|reseau de chaleur|district heating|hydrogene|hydrogen/],
  ['littoral', /littoral|coastal|\bcoast\b|coastline|\bcotes?\b|plage|beach|\bports?\b|harbor|harbour|maree|tide|tidal|ocean|\bmarine\b|maritime|bathymetri|hydrographi|oceanographi|\bmer\b|en mer|estuaire|mangrove|recif|corail|coral|\bdunes?\b|lagoon|sea ice|banquise|\bpeche\b|\bfishing\b/],
  ['agriculture', /agri|agronom|cultiv|\bcultures?\b|parcelles?|vitico|\bvigne\b|vineyard|viticulture|irrigation|prairie|pasture|meadow|recolte|harvest|\byield\b|elevage|livestock|betail|\bferme\b|farming|\bfarms?\b/],
  ['sante', /sante|santé|epidemiolog|epidemiology|maladies?|disease|\bmedical\b|\bhealth\b|public health|sante publique|\bhospital\b|hopital/],
  ['climat', /climat|climate|changement climatique|climate change|rechauffement climatique|global warming|\bgaz a effet de serre\b|greenhouse/],
  ['geologie', /geolog|roches?|croute terrestre|croûte terrestre|mineraux|minerals|\bstone\b|\brock\b|geological|stratigraph|tectonique|tectonic/],
  ['defense', /defense|defence|militaire|\barmee\b|army|\bnavy\b|\bair force\b|securite nationale|national security|\bmbda\b/],
  ['tourisme', /tourisme|tourism|voyage|travel|itineraire|itinerary|guide touristique|tourist guide/],
  ['industrie', /industrie|industry|manufacturing|production industrielle|industrial production|\busine\b|factory|\bplant\b/],
  ['mines', /mines?|extraction miniere|mining|carrieres?|quarry|\bore\b|minerals? extraction/]
];

export const TAGS = [...TECHNIQUES, ...DOMAINES];

function normaliser(texte) {
  return String(texte || '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Tous les tags dont au moins un motif apparaît dans le sujet, dans l'ordre du vocabulaire.
export function tagsFor(sujet) {
  const texte = normaliser(sujet);
  return TAGS.filter(([, motifs]) => motifs.test(texte)).map(([tag]) => tag);
}
