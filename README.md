# OncoVision / SAE

Plateforme de visualisation et d'annotation collaborative d'images médicales (pathologie numérique).

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│   app (React) │────▶  rest (FastAPI) │────▶  segmenter     │
│  Frontend SPA │     │  API REST + WS │     │  (InstanSeg)   │
└─────────────┘     └───────┬───────┘     └────────────────┘
                            │
                    ┌───────┴───────┐
                    │   MongoDB     │
                    │  (métadonnées)│
                    └───────────────┘
                            │
                    ┌───────┴───────┐
                    │    MinIO      │
                    │ (images S3)   │
                    └───────────────┘
```

Le projet est composé de **trois services** principaux :

| Service | Rôle | Technologie |
|---------|------|-------------|
| [`app/`](./app) | Interface utilisateur | React 19, TypeScript, Vite |
| [`rest/`](./rest) | API REST + WebSockets | Python, FastAPI |
| [`segmenter/`](./segmenter) | Segmentation IA | Python, InstanSeg, PyTorch |

## Démarrage rapide

### Prérequis

- Docker & Docker Compose
- Git

### Environnement de développement

```bash
# Cloner le dépôt
git clone <url-du-depot>
cd SAE

# Copier et éditer les variables d'environnement
cp example.env .env

# Lancer tous les services
docker compose -f compose-local.yml up --build
```

L'application est accessible sur :
- **Frontend** : http://localhost:5173
- **API REST** : http://localhost:8000
- **Documentation API** : http://localhost:8000/docs
- **MinIO Console** : http://localhost:9001
- **Segmenter** : http://localhost:7000

### Production

```bash
docker compose -f compose-prod.yml up -d
```

## Structure du projet

```
SAE/
├── app/                  # Frontend React (SPA + lib)
│   ├── src/
│   │   ├── components/   # Composants React
│   │   │   ├── viewers/  # Visualiseur d'images, canva, outils
│   │   │   └── room/     # Sessions collaboratives
│   │   ├── hooks/        # Hooks personnalisés
│   │   ├── types/        # Types TypeScript
│   │   └── utils/        # Utilitaires
│   └── public/           # Fichiers statiques
├── rest/                 # API Python
│   ├── api/              # Routeurs de base
│   ├── controllers/      # Contrôleurs (image, draw, room)
│   ├── database/         # Connexions MongoDB & S3
│   ├── models/           # Modèles de données (formes)
│   ├── registry/         # Registre d'images
│   └── utils/            # Utilitaires (conversion d'images)
├── segmenter/            # Service de segmentation IA
├── docker/               # Configuration Docker locale
│   └── compose.yml       # Services d'infrastructure
├── compose-local.yml     # Stack complète (dev)
└── compose-prod.yml      # Stack complète (prod)
```

## Fonctionnalités principales

- **Visualisation d'images médicales** : DICOM, SVS (Aperio), TIFF, DeepZoom avec tuilage dynamique
- **Annotation collaborative** : salles de dessin en temps réel via WebSocket
- **Segmentation IA** : noyaux et cellules via InstanSeg
- **Stockage d'images** : MinIO (compatible S3)
- **Métadonnées** : MongoDB
