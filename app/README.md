# app — Frontend OncoVision

Interface utilisateur React pour la plateforme OncoVision. Sert à la fois d'**application monopage (SPA)** et de **bibliothèque de composants** réutilisable pour le visionnement d'images médicales.

## Stack

- **React 19** + **TypeScript**
- **Vite** (bundler, HMR)
- **Ant Design** (UI)
- **TanStack React Query** (état serveur)
- **React Router** (routage)
- **react-dropzone** (upload)
- **react-icons** (icônes)
- **react-cookie** (gestion des cookies)

## Structure

```
src/
├── App.tsx                    # Point d'entrée SPA
├── main.tsx                   # Bootstrap React
├── lib.tsx                    # Point d'entrée de la bibliothèque
├── components/
│   ├── viewers/               # Visualiseur d'images
│   │   ├── image.tsx          # Visionneuse avec tuilage DeepZoom
│   │   ├── canva.tsx          # Canvas de dessin/annotation
│   │   ├── preview.tsx        # Aperçu d'image
│   │   ├── capture.tsx        # Capture d'écran
│   │   ├── detail.tsx         # Panneau de détails des formes
│   │   ├── socket/            # Canvas synchronisé par WebSocket
│   │   │   └── canva.tsx
│   │   └── tool/              # Barre d'outils
│   │       ├── bar.tsx
│   │       ├── item.tsx
│   │       └── setting.tsx
│   ├── room/                  # Sessions collaboratives
│   │   ├── room-viewer.tsx    # Visualiseur de room
│   │   └── types.ts           # Types RoomInfo / AuthorInfo
│   ├── file/                  # Gestion de fichiers
│   └── test/                  # Pages de test
├── hooks/
│   ├── rest.tsx               # Client REST (contexte + provider)
│   ├── websocket.tsx          # Hook WebSocket
│   ├── query.tsx              # Fine wrapper autour de React Query
│   └── history.tsx            # Undo/Redo pour le dessin
├── types/
│   └── viewer/                # Types pour les formes et actions
├── utils/
│   ├── env.ts                 # Lecture de config (runtime + env)
│   └── websocket.ts           # Bus WebSocket côté client
└── env.d.ts                   # Déclarations d'environnement
```

## Scripts

```bash
npm run dev          # Serveur de développement (Vite, HMR)
npm run build:lib    # Build bibliothèque (lib.tsx → dist/)
npm run start        # Preview du build (port 5173)
```

## Configuration

Les variables d'environnement sont préfixées par `API_` et accessibles via `getEnv()` :

| Variable | Description |
|----------|-------------|
| `API_URL` | URL de l'API REST (ex: `http://localhost:8000`) |
| `SEGMENTATION_API_URL` | URL du service de segmentation |

En production (Docker), ces valeurs sont injectées via `entrypoint.sh` dans `runtime-config.js`.

## Utilisation comme bibliothèque

```bash
npm run build:lib
# Les fichiers de sortie sont dans dist/
# Package publié sous le nom "oncovision"
```

```ts
import { ImageViewer, Canva, Toolbar } from "oncovision";
```

## Docker

```bash
docker build -t onco-app .
docker run -p 5173:5173 -e API_URL=http://localhost:8000 onco-app
```
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
