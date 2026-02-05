import { useEffect, useRef, useState, useCallback } from "react";
import { Slider, Button, Tooltip } from "antd";
import { FiZoomIn, FiZoomOut, FiMaximize2 } from "react-icons/fi";
import { useRest } from "../../hooks/rest";
import ImagePreview from "./preview"; // New import
import Canva from "./canva";
import type { CanvaHandle, CanvaTool } from "./canva";

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
    const [isMobile, setIsMobile] = useState(false);
    
    // Touch support refs
    const lastTouchDistance = useRef<number | null>(null);
    const lastTouchCenter = useRef<{ x: number, y: number } | null>(null);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
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

    // Touch event handlers for mobile/tablet
    const handleTouchStart = (e: React.TouchEvent) => {
        if (isDrawingActive) return;
        
        if (e.touches.length === 1) {
            // Single touch - pan
            const touch = e.touches[0];
            setIsDragging(true);
            lastMousePos.current = { x: touch.clientX, y: touch.clientY };
        } else if (e.touches.length === 2) {
            // Two finger touch - prepare for pinch zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            const dx = touch2.clientX - touch1.clientX;
            const dy = touch2.clientY - touch1.clientY;
            lastTouchDistance.current = Math.sqrt(dx * dx + dy * dy);
            
            lastTouchCenter.current = {
                x: (touch1.clientX + touch2.clientX) / 2,
                y: (touch1.clientY + touch2.clientY) / 2
            };
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isDrawingActive) return;
        e.preventDefault(); // Prevent scrolling
        
        if (e.touches.length === 1 && isDragging && lastMousePos.current) {
            // Single touch pan
            const touch = e.touches[0];
            const dx = touch.clientX - lastMousePos.current.x;
            const dy = touch.clientY - lastMousePos.current.y;
            lastMousePos.current = { x: touch.clientX, y: touch.clientY };

            setViewState(prev => ({
                ...prev,
                x: prev.x - dx / prev.zoom,
                y: prev.y - dy / prev.zoom,
            }));
        } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
            // Two finger pinch zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            const dx = touch2.clientX - touch1.clientX;
            const dy = touch2.clientY - touch1.clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const scale = distance / lastTouchDistance.current;
            lastTouchDistance.current = distance;
            
            setViewState(prev => {
                let newZoom = prev.zoom * scale;
                newZoom = Math.max(0.001, Math.min(1, newZoom));
                return { ...prev, zoom: newZoom };
            });
        }
    };

    const handleTouchEnd = () => {
        if (isDrawingActive) return;
        setIsDragging(false);
        lastMousePos.current = null;
        lastTouchDistance.current = null;
        lastTouchCenter.current = null;
        checkBounds();
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

    return (
        <div 
            ref={containerRef} 
            style={{ 
                width: "100%", 
                height: "100%", 
                backgroundColor: "#111", 
                position: "relative", 
                overflow: "hidden", 
                cursor: activeTool === "pan" ? "move" : "crosshair",
                touchAction: "none" // Disable default touch behaviors (pull-to-refresh, double-tap zoom) for custom gesture handling
            }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div style={{
                position: 'absolute',
                left: isMobile ? 8 : 16,
                top: isMobile ? 8 : 16,
                zIndex: 300,
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? 6 : 10,
                padding: isMobile ? '8px' : '12px',
                background: 'linear-gradient(180deg, rgba(20,22,25,0.95), rgba(14,15,17,0.9))',
                borderRadius: isMobile ? 8 : 12,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                color: '#E9EEF5',
                width: isMobile ? 100 : 120
            }} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 6 : 8, alignItems: 'center' }}>
                    <Tooltip title="Zoom +" placement="right">
                        <Button
                            type="text"
                            shape="circle"
                            size={isMobile ? "small" : "middle"}
                            icon={<FiZoomIn size={isMobile ? 14 : 16} />}
                            onClick={() => zoomBy(1.25)}
                            style={{ color: '#E9EEF5', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                        />
                    </Tooltip>
                    <div style={{ height: isMobile ? 80 : 110, padding: '6px 0' }}>
                        <Slider
                            vertical
                            min={0.01}
                            max={1}
                            step={0.01}
                            value={viewState.zoom}
                            onChange={(value: number) => setViewState(prev => ({ ...prev, zoom: value }))}
                            tooltip={{ formatter: (value: number | undefined) => `Zoom: ${Math.round((value || 0) * 100)}%`, placement: 'right' }}
                            handleStyle={{ borderColor: '#1366FF', background: '#1366FF' }}
                            trackStyle={{ backgroundColor: '#1366FF' }}
                            railStyle={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                        />
                    </div>
                    <Tooltip title="Zoom -" placement="right">
                        <Button
                            type="text"
                            shape="circle"
                            size={isMobile ? "small" : "middle"}
                            icon={<FiZoomOut size={isMobile ? 14 : 16} />}
                            onClick={() => zoomBy(1 / 1.25)}
                            style={{ color: '#E9EEF5', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                        />
                    </Tooltip>
                    <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)', margin: isMobile ? '4px 0' : '6px 0' }} />
                    <Tooltip title="Ajuster à l'écran" placement="right">
                        <Button
                            type="text"
                            shape="circle"
                            size={isMobile ? "small" : "middle"}
                            icon={<FiMaximize2 size={isMobile ? 14 : 16} />}
                            onClick={fitToScreen}
                            style={{ color: '#E9EEF5', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                        />
                    </Tooltip>
                </div>

                <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)', margin: isMobile ? '6px 0' : '8px 0' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 6 : 8 }}>
                    <Button
                        type={activeTool === 'pan' ? 'primary' : 'text'}
                        size="small"
                        icon={<ToolIcon name="pan" size={isMobile ? 12 : 14} />}
                        onClick={() => setActiveTool('pan')}
                        style={activeTool === 'pan' ? { 
                            background: '#1366FF', 
                            color: '#FFF', 
                            borderRadius: 8, 
                            display: 'flex', 
                            gap: isMobile ? 4 : 8, 
                            alignItems: 'center', 
                            justifyContent: 'flex-start', 
                            padding: isMobile ? '4px 8px' : '6px 10px',
                            fontSize: isMobile ? 11 : 13
                        } : { 
                            color: '#E9EEF5', 
                            background: 'transparent', 
                            border: '1px solid rgba(255,255,255,0.02)', 
                            borderRadius: 8, 
                            display: 'flex', 
                            gap: isMobile ? 4 : 8, 
                            alignItems: 'center', 
                            justifyContent: 'flex-start', 
                            padding: isMobile ? '4px 8px' : '6px 10px',
                            fontSize: isMobile ? 11 : 13
                        }}
                    >
                        Pan
                    </Button>

                    {!isMobile && (
                        <>
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

                    <Button
                        danger
                        type="text"
                        size="small"
                        icon={<ToolIcon name="erase" />}
                        onClick={() => {
                            canvaRef.current?.clear();
                            setActiveTool('pan');
                        }}
                        style={{ color: '#FF6B6B', background: 'transparent', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-start', padding: '6px 10px' }}
                    >
                        Effacer
                    </Button>
                    </>
                    )}
                </div>
            </div>

            {/* Thumbnail preview */}
            <div style={{ position: 'absolute', right: isMobile ? 8 : 16, top: isMobile ? 8 : 16, zIndex: 300 }}>
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

            <Canva
                ref={canvaRef}
                viewState={viewState}
                width={canvasSize.w}
                height={canvasSize.h}
                activeTool={activeTool}
                onDrawingActiveChange={setIsDrawingActive}
                imageWidth={info.width}
                imageHeight={info.height}
            />
        </div>
    );
}
