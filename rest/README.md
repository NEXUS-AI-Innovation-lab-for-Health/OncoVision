# rest — API OncoVision

API REST et WebSocket pour la plateforme OncoVision. Gère le stockage, la récupération et l'annotation d'images médicales.

## Stack

- **Python 3.13** + **FastAPI**
- **MongoDB** (métadonnées des images, formes d'annotation)
- **MinIO / S3** (stockage des images sources et tuiles)
- **WebSockets** (annotations collaboratives en temps réel)
- **OpenSlide** (lecture SVS/NDPI)
- **pydicom** (lecture DICOM)
- **tifffile** (lecture TIFF)
- **Pillow** (encodage WebP)
- **pyvips** (traitement d'images)

## Structure

```
rest/
├── main.py                    # Point d'entrée FastAPI
├── api/
│   ├── controller.py          # Classe de base Controller (APIRouter)
│   ├── model.py               # Modèles de base (CamelModel)
│   └── websocket.py           # Bus WebSocket, handler, décorateurs
├── controllers/
│   ├── image.py               # Upload, listage, tuilage DeepZoom
│   ├── draw.py                # Dessin collaboratif (WebSocket)
│   └── room.py                # Gestion des salles (CRUD REST)
├── database/
│   ├── mongo/connection.py    # Connexion MongoDB
│   └── s3/connection.py       # Connexion MinIO/S3
├── models/
│   └── form.py                # Formes : Line, Circle, Rectangle, Polygon…
├── registry/
│   └── registry.py            # Registre d'images (upload, tuilage, métadonnées)
└── utils/
    └── image.py               # Utilitaires : conversion, DeepZoom, WebP
```

## Endpoints

### Images (`/viewer`)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/viewer/images` | Liste toutes les images |
| `POST` | `/viewer/images/upload` | Upload d'une image (DICOM, SVS, TIFF, DZI) |
| `GET` | `/viewer/images/{id}/info` | Métadonnées d'une image |
| `GET` | `/viewer/images/{id}.dzi` | Descripteur DeepZoom |
| `GET` | `/viewer/images/{id}/level/{level}.webp` | Niveau complet |
| `GET` | `/viewer/images/{id}/tile/{level}/{tx}_{ty}.webp` | Tuile individuelle |
| `GET` | `/viewer/images/{id}/preview` | Aperçu |

### Salles (`/room`)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/room/rooms` | Liste des salles |
| `POST` | `/room/rooms` | Créer une salle |
| `GET` | `/room/rooms/{id}` | Détail d'une salle |

### WebSocket (`/draw`)

| Chemin | Description |
|--------|-------------|
| `/draw/join_draw` | Connexion WebSocket pour le dessin collaboratif |

## Formats d'image supportés

| Format | Détection | Tuilage |
|--------|-----------|---------|
| DICOM (`.dcm`) | Extension | Dynamique (pyvips → WebP) |
| SVS Aperio (`.svs`) | Extension | OpenSlide → WebP |
| TIFF (`.tif`, `.tiff`) | Extension | tifffile → WebP |
| DeepZoom (`.dzi` + `_files/`) | Extension | Tuiles pré-générées |

## Configuration

Copier `example.env` vers `.env` et éditer :

```env
ENVIRONMENT=dev
PORT=8000
HOST=127.0.0.1
SECRET=supersecret

MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_USER=admin
MONGO_PASSWORD=verysecurepassword
MONGO_DATABASE=my_database

S3_HOST=http://localhost
S3_PORT=9000
S3_USER=root
S3_PASSWORD=supersecretpassword
S3_REGION=eu-west-1
```

## Développement

```bash
cd rest
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install "fastapi[standard]"
fastapi dev main.py --port 8000
```

## Docker

```bash
docker build -t sae-rest ./rest
docker run -p 8000:8000 --env-file rest/.env sae-rest
```