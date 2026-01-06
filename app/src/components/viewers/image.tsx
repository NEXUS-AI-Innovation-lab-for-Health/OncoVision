import { useEffect, useRef, useState, useCallback } from "react";
import { useRest } from "../../hooks/rest";

interface ImageViewerProps {
    imageId: string;
}

interface ViewState {
    x: number; // Center of the view in image coordinates
    y: number;
    zoom: number; // Scale factor (screen pixels per image pixel)
}

// Cache global pour les images de tuiles afin de ne pas re-télécharger pendant la session/navigation
// Dans une implémentation plus Robuste, on gérerait la taille du cache et le nettoyage (LRU).
const tileCache = new Map<string, HTMLImageElement>();
const activeFetches = new Set<string>();

export default function ImageViewer({ imageId }: ImageViewerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { useQuery, get } = useRest();

    const [viewState, setViewState] = useState<ViewState>({ x: 0, y: 0, zoom: 0.1 });
    // Utiliser des refs pour l'état interne de draw pour éviter les dépendances changeantes
    const viewStateRef = useRef<ViewState>(viewState);
    const infoRef = useRef<any>(null);

    const [isDragging, setIsDragging] = useState(false);
    const lastMousePos = useRef<{ x: number, y: number } | null>(null);

    // 1. Récupération des infos de l'image
    const { data: info, refetch } = useQuery<any>({
        queryKey: ["viewer", "images", imageId, "info"],
        queryFn: async () => {
            console.log("Fetching info for", imageId);
            return await get({ endpoint: `viewer/images/${imageId}/info` });
        },
        enabled: !!imageId,
    });

    useEffect(() => {
        infoRef.current = info;
    }, [info]);

    useEffect(() => {
        viewStateRef.current = viewState;
    }, [viewState]);

    // Initialiser la vue au centre quand les infos arrivent
    useEffect(() => {
        console.log("Image info loaded:", info);
        if (info && containerRef.current) {
            const containerW = containerRef.current.clientWidth;
            const containerH = containerRef.current.clientHeight;
            
            // Zoom initial pour voir toute l'image (contain) sans marge excessive
            const scaleX = containerW / info.width;
            const scaleY = containerH / info.height;
            const initialZoom = Math.min(scaleX, scaleY);

            const newState = {
                x: info.width / 2,
                y: info.height / 2,
                zoom: initialZoom
            };
            setViewState(newState);
            viewStateRef.current = newState;
        }
    }, [info]);

    // Fonction de dessin principale stable
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        const info = infoRef.current;
        const currentState = viewStateRef.current;

        if (!canvas || !ctx || !info) return;

        const { width: cvsW, height: cvsH } = canvas;
        
        // Effacer le canvas
        ctx.clearRect(0, 0, cvsW, cvsH);
        ctx.imageSmoothingEnabled = true;

        // Calcul du niveau DZI approprié
        const maxLevel = info.levels - 1; 
        
        // On choisit le niveau le plus proche pour avoir une bonne résolution
        let targetLevel = Math.floor(maxLevel + Math.log2(currentState.zoom));
        if (targetLevel > maxLevel) targetLevel = maxLevel;
        if (targetLevel < 0) targetLevel = 0;

        // Facteur d'échelle entre le niveau DZI choisi et l'image originale
        const levelScaleFactor = Math.pow(0.5, maxLevel - targetLevel);
        
        // Dimensions logiques de l'image à ce niveau
        const levelWidth = Math.ceil(info.width * levelScaleFactor);
        const levelHeight = Math.ceil(info.height * levelScaleFactor);
        
        const tileSize = info.tileSize;

        // Calculer la zone visible en coordonnées IMAGE (full resolution)
        const visibleW = cvsW / currentState.zoom;
        const visibleH = cvsH / currentState.zoom;
        const visibleLeft = currentState.x - visibleW / 2;
        const visibleTop = currentState.y - visibleH / 2;
        const visibleRight = visibleLeft + visibleW;
        const visibleBottom = visibleTop + visibleH;

        // Convertir cette zone visible en coordonnées du NIVEAU actuel
        const levelVisibleLeft = visibleLeft * levelScaleFactor;
        const levelVisibleTop = visibleTop * levelScaleFactor;
        const levelVisibleRight = visibleRight * levelScaleFactor;
        const levelVisibleBottom = visibleBottom * levelScaleFactor;

        // Identifier les indices de tuiles
        const minTileX = Math.floor(levelVisibleLeft / tileSize);
        const maxTileX = Math.floor(levelVisibleRight / tileSize);
        const minTileY = Math.floor(levelVisibleTop / tileSize);
        const maxTileY = Math.floor(levelVisibleBottom / tileSize);

        // Nombre max de tiles à ce niveau
        const maxTilesX = Math.ceil(levelWidth / tileSize);
        const maxTilesY = Math.ceil(levelHeight / tileSize);

        for (let tx = minTileX; tx <= maxTileX; tx++) {
            for (let ty = minTileY; ty <= maxTileY; ty++) {
                if (tx < 0 || tx >= maxTilesX || ty < 0 || ty >= maxTilesY) continue;

                const cacheKey = `${imageId}-${targetLevel}-${tx}-${ty}`;
                const cachedImg = tileCache.get(cacheKey);

                // Position écran de la tuile
                // Coord tuile dans le niveau
                const tileImgX = tx * tileSize;
                const tileImgY = ty * tileSize;

                // Coord image full
                const fullImgX = tileImgX / levelScaleFactor;
                const fullImgY = tileImgY / levelScaleFactor;

                // Position écran
                const screenX = (fullImgX - currentState.x) * currentState.zoom + cvsW / 2;
                const screenY = (fullImgY - currentState.y) * currentState.zoom + cvsH / 2;

                // Taille écran
                const tileW = (tx === maxTilesX - 1) ? (levelWidth - tx * tileSize) : tileSize;
                const tileH = (ty === maxTilesY - 1) ? (levelHeight - ty * tileSize) : tileSize;

                const drawW = (tileW / levelScaleFactor) * currentState.zoom;
                const drawH = (tileH / levelScaleFactor) * currentState.zoom;
                
                // Petit overlap pour éviter les lignes blanches
                const overlap = 0.5;

                if (cachedImg) {
                    ctx.drawImage(cachedImg, 0, 0, tileW, tileH, screenX - overlap, screenY - overlap, drawW + 2*overlap, drawH + 2*overlap);
                } else {
                    // Lancer le chargement si pas déjà en cours
                    if (!activeFetches.has(cacheKey)) {
                        activeFetches.add(cacheKey);
                        // Appel API pour récupérer le Blob
                        get({ 
                            endpoint: `viewer/images/${imageId}/tile/${targetLevel}/${tx}_${ty}.png`,
                            blob: true 
                        }).then((blob) => {
                            if (blob instanceof Blob) {
                                const url = URL.createObjectURL(blob);
                                const img = new Image();
                                img.onload = () => {
                                    tileCache.set(cacheKey, img);
                                    activeFetches.delete(cacheKey);
                                    URL.revokeObjectURL(url); 
                                    requestAnimationFrame(draw); 
                                };
                                img.onerror = () => {
                                    console.error("Image load error", cacheKey);
                                    activeFetches.delete(cacheKey);
                                }
                                img.src = url;
                            } else {
                                activeFetches.delete(cacheKey);
                            }
                        }).catch((e) => {
                            console.error("Fetch error", e);
                            activeFetches.delete(cacheKey);
                        });
                    }
                }
            }
        }
        
        // Debug info
        ctx.fillStyle = "white";
        ctx.font = "14px monospace";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.fillText(`Lvl: ${targetLevel} | Zoom: ${currentState.zoom.toFixed(4)} | Center: ${currentState.x.toFixed(0)}, ${currentState.y.toFixed(0)}`, 10, 20);
        ctx.shadowBlur = 0;

    }, [imageId, get]); // draw est stable et n'a plus de dépendances changeantes


    // Gestion des événements souris pour Pan & Zoom via Ref pour accès aux handlers stables
    // On utilise un useEffect global pour le wheel non-passif
    useEffect(() => {
        const element = containerRef.current;
        if(!element) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            
            // Sur trackpad, le pinch-to-zoom envoie souvent ctrlKey=true avec wheel
            // Ou alors c'est un simple scroll (pan).
            
            if (e.ctrlKey) {
                // Pinch-to-zoom simulé par wheel
                const zoomSensitivity = 0.01;
                const delta = -e.deltaY * zoomSensitivity;
                const factor = Math.pow(2, delta);
                
                setViewState(prev => {
                    let newZoom = prev.zoom * factor;
                    if (newZoom < 0.001) newZoom = 0.001;
                    if (newZoom > 50) newZoom = 50; 
                    return { ...prev, zoom: newZoom };
                });
            } else {
                // Scroll simple -> on peut l'utiliser pour le zoom ou le pan? 
                // Classiquement scroll = zoom dans les viewers, 
                // mais sur trackpad c'est souvent Pan.
                // Ici on garde scroll = zoom comme demandé, mais on ajoute la gestion 'ctrl' pour le pinch spécifique.
                
                const zoomSensitivity = 0.001;
                const delta = -e.deltaY * zoomSensitivity;
                const factor = Math.pow(2, delta);
                
                setViewState(prev => {
                    let newZoom = prev.zoom * factor;
                    if (newZoom < 0.001) newZoom = 0.001;
                    if (newZoom > 50) newZoom = 50; 
                    return { ...prev, zoom: newZoom };
                });
            }
        };
        
        // Empêcher le zoom natif Safari (Pinch)
        const PreventDefault = (e: Event) => e.preventDefault();

        element.addEventListener('wheel', onWheel, { passive: false });
        element.addEventListener('gesturestart', PreventDefault);
        element.addEventListener('gesturechange', PreventDefault);
        element.addEventListener('gestureend', PreventDefault);

        return () => {
            element.removeEventListener('wheel', onWheel);
            element.removeEventListener('gesturestart', PreventDefault);
            element.removeEventListener('gesturechange', PreventDefault);
            element.removeEventListener('gestureend', PreventDefault);
        }
    }, []); // Empty deps = bind once

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        lastMousePos.current = null;
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !lastMousePos.current) return;
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        lastMousePos.current = { x: e.clientX, y: e.clientY };

        setViewState(prev => ({
            ...prev,
            x: prev.x - dx / prev.zoom,
            y: prev.y - dy / prev.zoom,
        }));
    };

    // Redessiner quand l'état change
    useEffect(() => {
        requestAnimationFrame(draw);
    }, [draw, viewState]);

    // Redessiner quand l'image change
    useEffect(() => {
        // Reset cache? 
        // tileCache.clear(); // Peut-être trop agressif si on revient sur l'image
        // Mais nécessaire si l'ID reste le même mais le contenu change (peu probable ici avec UUID)
        refetch();
    }, [imageId, refetch]);

    // Resize observer pour ajuster la taille du canvas
    useEffect(() => {
        if (!containerRef.current || !canvasRef.current) return;
        const resizeObserver = new ResizeObserver(() => {
            if (containerRef.current && canvasRef.current) {
                canvasRef.current.width = containerRef.current.clientWidth;
                canvasRef.current.height = containerRef.current.clientHeight;
                requestAnimationFrame(draw);
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [draw]);

    if (!info) return <div style={{ color: "white" }}>Chargement des métadonnées...</div>;

    return (
        <div 
            ref={containerRef} 
            style={{ 
                width: "100%", 
                height: "100%", 
                backgroundColor: "#111", 
                position: "relative", 
                overflow: "hidden", 
                cursor: "move" 
            }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseMove={handleMouseMove}
        >
            <canvas 
                ref={canvasRef} 
                style={{ display: "block", width: "100%", height: "100%" }} 
            />
        </div>
    );
}
