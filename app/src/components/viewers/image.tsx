import { useEffect, useRef, useState, useCallback } from "react";
import { Slider, Button, Switch } from "antd";
import { PlusOutlined, MinusOutlined, CompressOutlined, EditOutlined } from "@ant-design/icons";
import { useRest } from "../../hooks/rest";
import ImagePreview from "./preview"; // New import
import DrawingCanvas from "../drawing/DrawingCanvas";

interface ImageViewerProps {
    imageId: string;
}

interface ViewState {
    x: number; // Center of the view in image coordinates
    y: number;
    zoom: number; // Scale factor (screen pixels per image pixel)
}

// Global cache for tile images to avoid re-downloading during session/navigation
// In a more robust implementation, we would manage cache size and cleanup (LRU).
const tileCache = new Map<string, HTMLImageElement>();
const activeFetches = new Set<string>();

export default function ImageViewer({ imageId }: ImageViewerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { useQuery, get } = useRest();

    const [viewState, setViewState] = useState<ViewState>({ x: 0, y: 0, zoom: 0.1 });
    // Use refs for internal draw state to avoid changing dependencies
    const viewStateRef = useRef<ViewState>(viewState);
    const infoRef = useRef<any>(null);

    const [isDragging, setIsDragging] = useState(false);
    const lastMousePos = useRef<{ x: number, y: number } | null>(null);
    const [drawingMode, setDrawingMode] = useState(false);

    // 1. Fetch image info
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

    // Initialize view to center when info arrives
    useEffect(() => {
        console.log("Image info loaded:", info);
        if (info && containerRef.current) {
            const containerW = containerRef.current.clientWidth;
            const containerH = containerRef.current.clientHeight;
            
            // Initial zoom to see the entire image (contain) without excessive margin
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
                    // Start loading if not already in progress
                    if (!activeFetches.has(cacheKey)) {
                        activeFetches.add(cacheKey);
                        // API call to fetch the Blob
                        get({ 
                            endpoint: `viewer/images/${imageId}/tile/${targetLevel}/${tx}_${ty}.webp`,
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
                    if (newZoom < 0.001) newZoom = 0.001;
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
                    if (newZoom < 0.001) newZoom = 0.001;
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
    }, []); // Empty deps = bind once

    const handleMouseDown = (e: React.MouseEvent) => {
        if (drawingMode) return; // Don't pan when drawing
        setIsDragging(true);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        if (drawingMode) return;
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
        if (drawingMode) return; // Don't pan when drawing
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

    // Convenient zoom helpers
    const zoomBy = (factor: number) => setViewState(prev => {
        let newZoom = prev.zoom * factor;
        newZoom = Math.max(0.001, Math.min(1, newZoom));
        return { ...prev, zoom: newZoom };
    });

    const fitToScreen = () => {
        if (!info || !containerRef.current) return;
        const containerW = containerRef.current.clientWidth;
        const containerH = containerRef.current.clientHeight;
        const scaleX = containerW / info.width;
        const scaleY = containerH / info.height;
        const initialZoom = Math.min(scaleX, scaleY);
        // Animate instead of hard set for better feel
        animateTo({ x: info.width / 2, y: info.height / 2, zoom: initialZoom });
    };

    // Redraw when state changes
    useEffect(() => {
        requestAnimationFrame(draw);
    }, [draw, viewState]);

    // Redraw when image changes
    useEffect(() => {
        refetch();
    }, [imageId, refetch]);

    // Resize observer to adjust canvas size
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
                cursor: drawingMode ? "crosshair" : "move"
            }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseMove={handleMouseMove}
        >
            <div style={{ 
                position: "absolute", 
                left: 16, 
                top: 16, 
                zIndex: 300, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 6, 
                padding: '8px 4px', 
                background: 'rgba(30,30,30,0.85)', 
                borderRadius: 6,
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
            }} 
            onMouseDown={e => e.stopPropagation()}>
                {/* Drawing mode toggle */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8,
                    paddingBottom: 8,
                    marginBottom: 8,
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <Switch 
                        checked={drawingMode}
                        onChange={setDrawingMode}
                        size="small"
                    />
                    <span style={{ color: '#eee', fontSize: 12 }}>
                        <EditOutlined style={{ marginRight: 4 }} />
                        Dessin
                    </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                    <Button type="text" icon={<PlusOutlined style={{ color: '#eee' }} />} size="small" onClick={() => zoomBy(1.25)} />
                    <div style={{ height: 100, padding: '8px 0' }}>
                        <Slider
                            vertical
                            min={0.01}
                            max={1}
                            step={0.01}
                            value={viewState.zoom}
                            onChange={(value: number) => setViewState(prev => ({ ...prev, zoom: value }))}
                            tooltip={{ formatter: (value: number | undefined) => `Zoom: ${Math.round((value || 0) * 100)}%`, placement: 'right' }}
                        />
                    </div>
                    <Button type="text" icon={<MinusOutlined style={{ color: '#eee' }} />} size="small" onClick={() => zoomBy(1 / 1.25)} />
                    <Button type="text" icon={<CompressOutlined style={{ color: '#eee' }} />} size="small" onClick={fitToScreen} title="Fit to screen" />
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

            {/* Drawing layer overlay */}
            {drawingMode && containerRef.current && (
                <DrawingCanvas
                    width={containerRef.current.clientWidth}
                    height={containerRef.current.clientHeight}
                    viewState={viewState}
                />
            )}
        </div>
    );
}
