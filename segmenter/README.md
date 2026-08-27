# segmenter — Segmentation IA OncoVision

Service de segmentation d'images médicales basé sur [InstanSeg](https://github.com/instanseg/instanseg). Identifie automatiquement les noyaux et les cellules dans des images de pathologie numérique.

## Stack

- **Python 3.11** + **FastAPI**
- **InstanSeg** (segmentation par deep learning)
- **PyTorch** (CPU / CUDA / MPS)
- **Pillow** + **NumPy** (traitement d'images)

## Endpoints

### `GET /health`

État du service et modèles chargés.

```json
{ "status": "ok", "device": "cpu", "loaded_models": [] }
```

### `POST /segment`

Segmente une image et retourne les instances détectées (format JSON).

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `file` | UploadFile | — | Image à segmenter (PNG, JPEG, TIFF…) |
| `model` | `"brightfield_nuclei"` \| `"fluorescence_nuclei_and_cells"` | `brightfield_nuclei` | Modèle InstanSeg |
| `target` | `"nuclei"` \| `"cells"` \| `"all_outputs"` | `nuclei` | Cible de segmentation |
| `pixel_size` | float | `null` | Taille du pixel (optionnel) |

**Réponse** (`SegmentResult`) :
```json
{
  "model": "brightfield_nuclei",
  "target": "nuclei",
  "processing_time_s": 1.234,
  "image_shape": [512, 512, 3],
  "instance_count": 42,
  "instances": [
    { "id": 1, "area_px": 150, "centroid_x": 100.5, "centroid_y": 200.3, "bbox": [180, 50, 220, 150] }
  ],
  "labeled_array": [[0, 0, 1, ...], ...]
}
```

### `POST /segment/mask`

Retourne un **PNG** du masque de segmentation (colorisé ou en labels 16-bit).

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `colorize` | bool | `true` | `true` → masque colorisé, `false` → labels 16-bit |

Header `X-Instance-Count` : nombre d'instances détectées.

### `POST /segment/points`

Retourne les contours/pixels des instances sous forme de listes de points.

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `mode` | `"pixel"` \| `"polygon"` | `polygon` | `pixel` → tous les pixels, `polygon` → contours simplifiés |

**Réponse** :
```json
[
  { "color": "#a3b1c4", "points": [{ "x": 10, "y": 20 }, ...] }
]
```

## Modèles disponibles

| Identifiant | Description |
|-------------|-------------|
| `brightfield_nuclei` | Noyaux en champ clair (H&E) |
| `fluorescence_nuclei_and_cells` | Noyaux et cellules en fluorescence |

## Développement

```bash
cd segmenter
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn api:app --host 0.0.0.0 --port 7000 --reload
```

> **Note** : PyTorch est installé avec le lien CPU (`--index-url https://download.pytorch.org/whl/cpu`). Pour CUDA, modifier `requirements.txt`.

## Docker

```bash
docker build -t sae-segmenter ./segmenter
docker run -p 7000:7000 sae-segmenter
```