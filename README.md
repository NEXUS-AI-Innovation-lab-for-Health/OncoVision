# OncoVision

Guide de setup du projet en **mode développement** et **mode production**.

## Stack
- Frontend: React + Vite (`/app`)
- API: FastAPI (`/rest`)
- Segmentation: FastAPI + InstanSeg (`/segmenter`)
- Services: MongoDB + MinIO (Docker)

## Prérequis
- Node.js 22+
- npm
- Python 3.11+
- Docker + Docker Compose

---

## Mode développement
Exécuter les commandes suivantes depuis la racine du projet.

### 1) Lancer les services de données + segmenter
```bash
cd docker
docker compose up -d
```

### 2) Configurer et lancer l'API REST
```bash
cd rest
cp example.env .env
pip install -r requirements.txt
fastapi run main.py --reload --port 8000
```

### 3) Configurer et lancer le frontend
```bash
cd app
cp .env.example .env
npm install
npm run dev
```

Frontend: http://localhost:5173  
API: http://localhost:8000  
Swagger (dev): http://localhost:8000/docs

---

## Mode production

Le déploiement de production s'appuie sur le `compose.yml` racine.
Exécuter les commandes suivantes depuis la racine du projet.

### 1) Préparer les images
Le fichier racine utilise les images suivantes:
- `localhost:5000/sae-rest:latest`
- `localhost:5000/sae-app:latest`

Construire et publier ces images vers votre registry avant le déploiement.

### 2) Préparer les variables d'environnement
Créer un fichier `.env` à la racine du projet avec les variables utilisées par `compose.yml`:
```dotenv
# MinIO
MINIO_ROOT_USER=root
MINIO_ROOT_PASSWORD=change-me

# Mongo init
MONGO_INITDB_ROOT_USERNAME=root
MONGO_INITDB_ROOT_PASSWORD=change-me
MONGO_INITDB_DATABASE=onco_vision

# API REST (conteneur rest)
PORT=8000
MONGO_HOST=mongodb
MONGO_PORT=27017
MONGO_USER=root
MONGO_PASSWORD=change-me
MONGO_DATABASE=onco_vision
S3_HOST=http://minio
S3_PORT=9000
S3_USER=root
S3_PASSWORD=change-me

# Frontend (conteneur web)
# Remplacer par l'URL réelle de votre API en production
API_URL=https://votre-api.exemple.com
```

### 3) Préparer le réseau Docker externe
Le `compose.yml` production référence un réseau externe nommé `center` (nom attendu tel quel par la configuration actuelle).
```bash
docker network create center
```

### 4) Lancer la stack
```bash
docker compose -f compose.yml up -d
```

### 5) Arrêter la stack
```bash
docker compose -f compose.yml down
```
