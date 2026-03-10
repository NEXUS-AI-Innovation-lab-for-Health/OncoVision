import { useEffect, useRef, useState, useCallback, type ComponentType } from "react";
import { Slider, Button, Tooltip } from "antd";
import { FiZoomIn } from "react-icons/fi";
import { useRest } from "../../hooks/rest";
import ToolbarOverlayItem from "../tool/ToolbarOverlayItem";
import ImagePreview from "./preview"; // New import
import Canva from "./canva";
import type { CanvaHandle, CanvaTool, CanvaProps } from "./canva";

// Small inline icons to avoid extra dependencies and ensure consistent look on dark background
const ToolIcon = ({ name, size = 14 }: { name: string; size?: number }) => {
    const common: any = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
    switch (name) {
        case 'pan':
            return (
                <svg {...common}>
                    <path d="M12 2v4M12 18v4M4 12h4M16 12h4" />
                </svg>
            );
        case 'pensil':
            return (
                <svg {...common}>
                    <path d="M3 21l3-1 11-11 1 1L7 21 3 21z" />
                    <path d="M14 7l3 3" />
                </svg>
            );
        case 'line':
            return (
                <svg {...common}>
                    <line x1="4" y1="20" x2="20" y2="4" />
                </svg>
            );
        case 'rectangle':
            return (
                <svg {...common}>
                    <rect x="4" y="6" width="16" height="12" rx="2" />
                </svg>
            );
        case 'circle':
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="6" />
                </svg>
            );
        case 'ellipse':
            return (
                <svg {...common}>
                    <ellipse cx="12" cy="12" rx="8" ry="5" />
                </svg>
            );
        case 'polygon':
            return (
                <svg {...common}>
                    <polygon points="12 2 2 7 5 20 19 20 22 7 12 2" />
                </svg>
            );
        case 'erase':
            return (
                <svg {...common}>
                    <path d="M3 6h18M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" />
                </svg>
            );
        default:
            return null;
    }
};

interface ImageViewerProps {
    imageId: string;
    canva?: {
        type: ComponentType<CanvaProps>;
        props?: Partial<CanvaProps>;
    };
}

interface ViewState {
    x: number; // Center of the view in image coordinates
    y: number;
    zoom: number; // Scale factor (screen pixels per image pixel)
}

// Global cache for tile images to avoid re-downloading during session/navigation
const tileCache = new Map<string, HTMLImageElement>();

// Queue system: limited concurrency to avoid saturating the browser's HTTP connection pool
const TILE_CONCURRENCY = 6;
const activeTileFetches = new Map<string, AbortController>();
interface QueuedTile { cacheKey: string; execute: () => void; }
const tileQueue: QueuedTile[] = [];

function processTileQueue() {
    while (activeTileFetches.size < TILE_CONCURRENCY && tileQueue.length > 0) {
        const item = tileQueue.shift()!;
        // Skip tiles somehow already cached (edge case)
        if (!tileCache.has(item.cacheKey)) {
            item.execute();
        }
    }
}

/** Remove queue entries and abort in-flight requests for tiles no longer needed */
function cancelStaleTiles(neededKeys: Set<string>) {
    // Remove from queue
    for (let i = tileQueue.length - 1; i >= 0; i--) {
        if (!neededKeys.has(tileQueue[i].cacheKey)) {
            tileQueue.splice(i, 1);
        }
    }
    // Abort in-flight
    for (const [key, controller] of activeTileFetches) {
        if (!neededKeys.has(key)) {
            controller.abort();
            activeTileFetches.delete(key);
        }
    }
}

export default function ImageViewer(props: ImageViewerProps) {

    const { imageId, canva } = props;
    const CanvaComponent = canva?.type || Canva;
    const canvaProps = canva?.props || {};

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const canvaRef = useRef<CanvaHandle>(null);
    const { useQuery, get } = useRest();

    const [viewState, setViewState] = useState<ViewState>({ x: 0, y: 0, zoom: 0.1 });
    // Use refs for internal draw state to avoid changing dependencies
    const viewStateRef = useRef<ViewState>(viewState);
    const infoRef = useRef<any>(null);

    const [isDragging, setIsDragging] = useState(false);
    const lastMousePos = useRef<{ x: number, y: number } | null>(null);
    const [isDrawingActive, setIsDrawingActive] = useState(false);
    const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
    const [activeTool, setActiveTool] = useState<CanvaTool>("pan");

    const getFitZoom = useCallback(() => {
        if (!infoRef.current || !containerRef.current) return 0.001;
        const containerW = containerRef.current.clientWidth;
        const containerH = containerRef.current.clientHeight;
        const scaleX = containerW / infoRef.current.width;
        const scaleY = containerH / infoRef.current.height;
        // Keep min zoom aligned with "fit to screen" while respecting max zoom cap.
        return Math.min(1, Math.min(scaleX, scaleY));
    }, []);

    // 1. Fetch image info
    const { data: info, refetch } = useQuery<any>({
        queryKey: ["viewer", "images", imageId, "info"],
        queryFn: async () => {
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

    // Initialize view to center when info arrives
    useEffect(() => {
        if (info && containerRef.current) {
            const initialZoom = getFitZoom();

            const newState = {
                x: info.width / 2,
                y: info.height / 2,
                zoom: initialZoom
            };
            setViewState(newState);
            viewStateRef.current = newState;
        }
    }, [info]);

    // Enforce dynamic minimum zoom after layout changes (e.g. resize).
    useEffect(() => {
        if (!info) return;
        const minZoom = getFitZoom();
        setViewState(prev => (prev.zoom < minZoom ? { ...prev, zoom: minZoom } : prev));
    }, [info, canvasSize, getFitZoom]);

    // Main stable drawing function
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        const info = infoRef.current;
        const currentState = viewStateRef.current;

        if (!canvas || !ctx || !info) return;

        const { width: cvsW, height: cvsH } = canvas;
        
        // Clear the canvas
        ctx.clearRect(0, 0, cvsW, cvsH);
        ctx.imageSmoothingEnabled = currentState.zoom > 1; // Enable interpolation only for zoom beyond 100% to avoid pixelation

        // Calculate appropriate DZI level
        const maxLevel = info.levels - 1; 
        
        // Choose the closest level for good resolution
        let targetLevel = Math.ceil(maxLevel + Math.log2(currentState.zoom));
        if (targetLevel > maxLevel) targetLevel = maxLevel;
        if (targetLevel < 0) targetLevel = 0;

        // Scale factor between chosen DZI level and original image
        const levelScaleFactor = Math.pow(0.5, maxLevel - targetLevel);
        
        // Logical dimensions of the image at this level
        const levelWidth = Math.ceil(info.width * levelScaleFactor);
        const levelHeight = Math.ceil(info.height * levelScaleFactor);
        
        const tileSize = info.tileSize;

        // Calculate visible area in IMAGE coordinates (full resolution)
        const visibleW = cvsW / currentState.zoom;
        const visibleH = cvsH / currentState.zoom;
        const visibleLeft = currentState.x - visibleW / 2;
        const visibleTop = currentState.y - visibleH / 2;
        const visibleRight = visibleLeft + visibleW;
        const visibleBottom = visibleTop + visibleH;

        // Convert this visible area to current LEVEL coordinates
        const levelVisibleLeft = visibleLeft * levelScaleFactor;
        const levelVisibleTop = visibleTop * levelScaleFactor;
        const levelVisibleRight = visibleRight * levelScaleFactor;
        const levelVisibleBottom = visibleBottom * levelScaleFactor;

        // Identify tile indices
        const minTileX = Math.floor(levelVisibleLeft / tileSize);
        const maxTileX = Math.floor(levelVisibleRight / tileSize);
        const minTileY = Math.floor(levelVisibleTop / tileSize);
        const maxTileY = Math.floor(levelVisibleBottom / tileSize);

        // Max number of tiles at this level
        const maxTilesX = Math.ceil(levelWidth / tileSize);
        const maxTilesY = Math.ceil(levelHeight / tileSize);

        // 1. Compute the set of needed tile keys for this draw pass
        const neededKeys = new Set<string>();
        for (let tx = minTileX; tx <= maxTileX; tx++) {
            for (let ty = minTileY; ty <= maxTileY; ty++) {
                if (tx < 0 || tx >= maxTilesX || ty < 0 || ty >= maxTilesY) continue;
                neededKeys.add(`${imageId}-${targetLevel}-${tx}-${ty}`);
            }
        }

        // 2. Cancel requests for tiles that are no longer needed
        cancelStaleTiles(neededKeys);

        // 3. Draw tiles and enqueue missing ones
        for (let tx = minTileX; tx <= maxTileX; tx++) {
            for (let ty = minTileY; ty <= maxTileY; ty++) {
                if (tx < 0 || tx >= maxTilesX || ty < 0 || ty >= maxTilesY) continue;

                const cacheKey = `${imageId}-${targetLevel}-${tx}-${ty}`;
                const cachedImg = tileCache.get(cacheKey);

                // Screen position of the tile
                // Tile coords in the level
                const tileImgX = tx * tileSize;
                const tileImgY = ty * tileSize;

                // Full image coords
                const fullImgX = tileImgX / levelScaleFactor;
                const fullImgY = tileImgY / levelScaleFactor;

                // Screen position
                const screenX = (fullImgX - currentState.x) * currentState.zoom + cvsW / 2;
                const screenY = (fullImgY - currentState.y) * currentState.zoom + cvsH / 2;

                // Screen size
                const tileW = (tx === maxTilesX - 1) ? (levelWidth - tx * tileSize) : tileSize;
                const tileH = (ty === maxTilesY - 1) ? (levelHeight - ty * tileSize) : tileSize;

                const drawW = (tileW / levelScaleFactor) * currentState.zoom;
                const drawH = (tileH / levelScaleFactor) * currentState.zoom;
                
                // Small overlap to avoid white lines
                const overlap = 0.5;

                if (cachedImg) {
                    ctx.drawImage(cachedImg, 0, 0, tileW, tileH, screenX - overlap, screenY - overlap, drawW + 2*overlap, drawH + 2*overlap);
                } else {
                    // Enqueue if not already active or queued
                    const alreadyQueued = tileQueue.some(t => t.cacheKey === cacheKey);
                    if (!activeTileFetches.has(cacheKey) && !alreadyQueued) {
                        // Capture loop variables for the closure
                        const _tx = tx, _ty = ty, _level = targetLevel;
                        tileQueue.push({
                            cacheKey,
                            execute: () => {
                                const controller = new AbortController();
                                activeTileFetches.set(cacheKey, controller);
                                get({
                                    endpoint: `viewer/images/${imageId}/tile/${_level}/${_tx}_${_ty}.webp`,
                                    blob: true,
                                    signal: controller.signal,
                                }).then((blob) => {
                                    if (blob instanceof Blob) {
                                        const url = URL.createObjectURL(blob);
                                        const img = new Image();
                                        img.onload = () => {
                                            tileCache.set(cacheKey, img);
                                            activeTileFetches.delete(cacheKey);
                                            URL.revokeObjectURL(url);
                                            processTileQueue();
                                            requestAnimationFrame(draw);
                                        };
                                        img.onerror = () => {
                                            console.error("Image load error", cacheKey);
                                            activeTileFetches.delete(cacheKey);
                                            processTileQueue();
                                        };
                                        img.src = url;
                                    } else {
                                        activeTileFetches.delete(cacheKey);
                                        processTileQueue();
                                    }
                                }).catch((e) => {
                                    if (e?.name !== 'AbortError') {
                                        console.error("Fetch error", cacheKey, e);
                                    }
                                    activeTileFetches.delete(cacheKey);
                                    processTileQueue();
                                });
                            }
                        });
                    }
                }
            }
        }

        // 4. Kick off queue processing after enqueuing all needed tiles
        processTileQueue();
        
        // Debug info (Removed to screen space is clean)
        // ctx.fillStyle = "white";
        // ctx.font = "14px monospace";
        // ctx.shadowColor = "black";
        // ctx.shadowBlur = 4;
        // ctx.fillText(`Lvl: ${targetLevel} | Zoom: ${currentState.zoom.toFixed(4)} | Center: ${currentState.x.toFixed(0)}, ${currentState.y.toFixed(0)}`, 10, 20);
        // ctx.shadowBlur = 0;

    }, [imageId, get]); // draw is stable and no longer has changing dependencies


    // Mouse event handling for Pan & Zoom using Ref for stable handler access
    // Use a global useEffect for non-passive wheel
    useEffect(() => {
        const element = containerRef.current;
        if(!element) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            
            // On trackpad, pinch-to-zoom often sends ctrlKey=true with wheel
            // Or it's a simple scroll (pan).
            
            if (e.ctrlKey) {
                // Pinch-to-zoom simulated by wheel
                const zoomSensitivity = 0.01;
                const delta = -e.deltaY * zoomSensitivity;
                const factor = Math.pow(2, delta);
                
                setViewState(prev => {
                    let newZoom = prev.zoom * factor;
                    const minZoom = getFitZoom();
                    if (newZoom < minZoom) newZoom = minZoom;
                    if (newZoom > 1) newZoom = 1; // Limit zoom to server's maximum level
                    return { ...prev, zoom: newZoom };
                });
            } else {
                // Simple scroll -> can we use it for zoom or pan? 
                // Traditionally scroll = zoom in viewers, 
                // but on trackpad it's often pan.
                // Here we keep scroll = zoom as requested, but add 'ctrl' handling for specific pinch.
                
                const zoomSensitivity = 0.001;
                const delta = -e.deltaY * zoomSensitivity;
                const factor = Math.pow(2, delta);
                
                setViewState(prev => {
                    let newZoom = prev.zoom * factor;
                    const minZoom = getFitZoom();
                    if (newZoom < minZoom) newZoom = minZoom;
                    if (newZoom > 1) newZoom = 1; // Limit zoom to server's maximum level
                    return { ...prev, zoom: newZoom };
                });
            }
        };
        
        // Prevent native Safari zoom (Pinch)
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
    }, [getFitZoom]); // Keep min zoom dynamic with current layout

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isDrawingActive) return;
        setIsDragging(true);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        if (isDrawingActive) return;
        setIsDragging(false);
        lastMousePos.current = null;
        checkBounds();
    };

    const checkBounds = () => {
        if(!info) return;
        const state = viewStateRef.current;
        // Clamp center to [0, width] and [0, height]
        // This ensures at least one quadrant is visible. 
        // We can be stricter if we want to ensure margin.
        
        // Let's ensure the center is strictly inside the image bounds.
        // It's a simple, robust rule.
        const clampedX = Math.max(0, Math.min(info.width, state.x));
        const clampedY = Math.max(0, Math.min(info.height, state.y));

        if (clampedX !== state.x || clampedY !== state.y) {
            animateTo({ x: clampedX, y: clampedY, zoom: state.zoom });
        }
    };

    const animateTo = (target: ViewState) => {
        const start = viewStateRef.current;
        const startTime = performance.now();
        const duration = 300; // ms

        const animate = (time: number) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);

            const newX = start.x + (target.x - start.x) * ease;
            const newY = start.y + (target.y - start.y) * ease;
            const newZoom = start.zoom + (target.zoom - start.zoom) * ease;

            setViewState({ x: newX, y: newY, zoom: newZoom });

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDrawingActive) return;
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

    // Redraw when state changes
    useEffect(() => {
        requestAnimationFrame(draw);
    }, [draw, viewState]);

    // Redraw when image changes
    useEffect(() => {
        refetch();
    }, [imageId, refetch]);

    // Resize observer to adjust canvas size (rerun on image change)
    useEffect(() => {
        if (!info) return;
        if (!containerRef.current || !canvasRef.current) return;
        const updateSize = () => {
            if (!containerRef.current || !canvasRef.current) return;
            canvasRef.current.width = containerRef.current.clientWidth;
            canvasRef.current.height = containerRef.current.clientHeight;
            setCanvasSize({
                w: containerRef.current.clientWidth,
                h: containerRef.current.clientHeight,
            });
            requestAnimationFrame(draw);
        };
        const resizeObserver = new ResizeObserver(updateSize);
        updateSize();
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [draw, info]);

    if (!info) return <div style={{ color: "white" }}>Chargement des métadonnées...</div>;

    const minZoom = getFitZoom();

    const defaultCanvaProps: CanvaProps = {
        viewState,
        width: canvasSize.w,
        height: canvasSize.h,
        activeTool,
        onDrawingActiveChange: setIsDrawingActive,
        imageWidth: info.width,
        imageHeight: info.height,
    };

    return (
        <div 
            ref={containerRef} 
            style={{ 
                width: "100%", 
                height: "100%", 
                backgroundColor: "#111", 
                position: "relative", 
                overflow: "hidden", 
                cursor: activeTool === "pan" ? "move" : "crosshair" 
            }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseMove={handleMouseMove}
        >
            <div style={{
                position: 'absolute',
                left: 16,
                top: 16,
                zIndex: 300,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                padding: '12px',
                background: 'linear-gradient(180deg, rgba(20,22,25,0.95), rgba(14,15,17,0.9))',
                borderRadius: 12,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                color: '#E9EEF5',
                width: 120
            }} onMouseDown={e => e.stopPropagation()}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                    <ToolbarOverlayItem
                        panel={
                            <div style={{
                                height: 140,
                                width: 44,
                                padding: '10px 0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'linear-gradient(180deg, rgba(20,22,25,0.95), rgba(14,15,17,0.9))',
                                borderRadius: 10,
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                            }}>
                                <Slider
                                    vertical
                                    min={minZoom}
                                    max={1}
                                    step={0.01}
                                    value={viewState.zoom}
                                    onChange={(value: number) => setViewState(prev => ({ ...prev, zoom: Math.max(minZoom, Math.min(1, value)) }))}
                                    tooltip={{ formatter: (value: number | undefined) => `Zoom: ${Math.round((value || 0) * 100)}%`, placement: 'right' }}
                                    handleStyle={{ borderColor: '#1366FF', background: '#1366FF' }}
                                    trackStyle={{ backgroundColor: '#1366FF' }}
                                    railStyle={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                                />
                            </div>
                        }
                    >
                        <Tooltip title="Zoom" placement="right">
                            <Button
                                type="text"
                                shape="circle"
                                size="small"
                                icon={<FiZoomIn size={16} />}
                                style={{ color: '#E9EEF5', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                            />
                        </Tooltip>
                    </ToolbarOverlayItem>
                </div>

                <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 0' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Button
                        type={activeTool === 'pan' ? 'primary' : 'text'}
                        size="small"
                        icon={<ToolIcon name="pan" />}
                        onClick={() => setActiveTool('pan')}
                        style={activeTool === 'pan' ? { background: '#1366FF', color: '#FFF', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-start', padding: '6px 10px' } : { color: '#E9EEF5', background: 'transparent', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-start', padding: '6px 10px' }}
                    >
                        Pan
                    </Button>

                    <Button
                        type={activeTool === 'pensil' ? 'primary' : 'text'}
                        size="small"
                        icon={<ToolIcon name="pensil" />}
                        onClick={() => setActiveTool('pensil')}
                        style={activeTool === 'pensil' ? { background: '#1366FF', color: '#FFF', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-start', padding: '6px 10px' } : { color: '#E9EEF5', background: 'transparent', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-start', padding: '6px 10px' }}
                    >
                        Crayon
                    </Button>

                    <Button
                        type={activeTool === 'line' ? 'primary' : 'text'}
                        size="small"
                        icon={<ToolIcon name="line" />}
                        onClick={() => setActiveTool('line')}
                        style={activeTool === 'line' ? { background: '#1366FF', color: '#FFF', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-start', padding: '6px 10px' } : { color: '#E9EEF5', background: 'transparent', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-start', padding: '6px 10px' }}
                    >
                        Ligne
                    </Button>

                    <Button
                        type={activeTool === 'rectangle' ? 'primary' : 'text'}
                        size="small"
                        icon={<ToolIcon name="rectangle" />}
                        onClick={() => setActiveTool('rectangle')}
                        style={activeTool === 'rectangle' ? { background: '#1366FF', color: '#FFF', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-start', padding: '6px 10px' } : { color: '#E9EEF5', background: 'transparent', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-start', padding: '6px 10px' }}
                    >
                        Rectangle
                    </Button>

                    <Button
                        type={activeTool === 'circle' ? 'primary' : 'text'}
                        size="small"
                        icon={<ToolIcon name="circle" />}
                        onClick={() => setActiveTool('circle')}
                        style={activeTool === 'circle' ? { background: '#1366FF', color: '#FFF', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-start', padding: '6px 10px' } : { color: '#E9EEF5', background: 'transparent', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-start', padding: '6px 10px' }}
                    >
                        Cercle
                    </Button>

                    <Button
                        type={activeTool === 'ellipse' ? 'primary' : 'text'}
                        size="small"
                        icon={<ToolIcon name="ellipse" />}
                        onClick={() => setActiveTool('ellipse')}
                        style={activeTool === 'ellipse' ? { background: '#1366FF', color: '#FFF', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-start', padding: '6px 10px' } : { color: '#E9EEF5', background: 'transparent', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-start', padding: '6px 10px' }}
                    >
                        Ellipse
                    </Button>

                    <Button
                        type={activeTool === 'polygon' ? 'primary' : 'text'}
                        size="small"
                        icon={<ToolIcon name="polygon" />}
                        onClick={() => setActiveTool('polygon')}
                        style={activeTool === 'polygon' ? { background: '#1366FF', color: '#FFF', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-start', padding: '6px 10px' } : { color: '#E9EEF5', background: 'transparent', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-start', padding: '6px 10px' }}
                    >
                        Polygone
                    </Button>

                </div>
            </div>

            {/* Thumbnail preview */}
            <div style={{ position: 'absolute', right: 16, top: 16, zIndex: 300 }}>
                <ImagePreview
                    info={info}
                    imageId={imageId}
                    viewState={viewState}
                    setViewState={setViewState}
                    get={get}
                    containerW={containerRef.current?.clientWidth || 0}
                    containerH={containerRef.current?.clientHeight || 0}
                />
            </div>

            <canvas 
                ref={canvasRef} 
                style={{ display: "block", width: "100%", height: "100%" }} 
            />

            <CanvaComponent
                ref={canvaRef}
                {...defaultCanvaProps}
                {...canvaProps}
            />
        </div>
    );
}
