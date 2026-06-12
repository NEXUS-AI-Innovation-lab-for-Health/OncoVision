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
- `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`
- `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD`, `MONGO_INITDB_DATABASE`
- `PORT`, `MONGO_HOST`, `MONGO_PORT`, `MONGO_USER`, `MONGO_PASSWORD`, `MONGO_DATABASE`
- `S3_HOST`, `S3_PORT`, `S3_USER`, `S3_PASSWORD`
- `API_URL`

### 3) Préparer le réseau Docker externe
Le `compose.yml` production référence un réseau externe nommé `center`.
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
