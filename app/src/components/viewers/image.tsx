import { useEffect, useRef, useState, useCallback } from "react";
import { Slider, Button, Tooltip } from "antd";
import { FiZoomIn, FiZoomOut, FiMaximize2, FiMinimize2, FiChevronLeft, FiChevronRight } from "react-icons/fi";
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
        case 'hide-dimensions':
            return (
                <svg {...common} viewBox="0 -960 960 960" fill="currentColor">
                    <path d="M312-240q-51 0-97.5-18T131-311q-48-45-69.5-106.5T40-545q0-78 38-126.5T189-720q14 0 26.5 2.5T241-710l239 89 239-89q13-5 25.5-7.5T771-720q73 0 111 48.5T920-545q0 66-21.5 127.5T829-311q-37 35-83.5 53T648-240q-66 0-112-30l-46-30h-20l-46 30q-46 30-112 30Zm0-80q37 0 69-17.5t59-42.5h80q27 25 59 42.5t69 17.5q36 0 69.5-12.5T777-371q34-34 48.5-80t14.5-94q0-41-17-68.5T769-640q-3 0-22 4L480-536 213-636q-5-2-10.5-3t-11.5-1q-37 0-54 27t-17 68q0 49 14.5 95t49.5 80q26 25 59 37.5t69 12.5Zm49-60q37 0 58-16.5t21-45.5q0-49-64.5-93.5T239-580q-37 0-58 16.5T160-518q0 49 64.5 93.5T361-380Zm-6-60q-38 0-82.5-25T220-516q5-2 11.5-3.5T245-521q38 0 82.5 25.5T380-444q-5 2-11.5 3t-13.5 1Zm244 61q72 0 136.5-45t64.5-94q0-29-20.5-46T721-581q-72 0-136.5 45T520-442q0 29 21 46t58 17Zm6-61q-7 0-13-1t-11-3q8-26 52.5-51t82.5-25q7 0 13 1t11 3q-8 26-52.5 51T605-440Zm-125-40Z" />
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
    const [isToolbarMinimized, setIsToolbarMinimized] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showLabels, setShowLabels] = useState(true);
    
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
            
            const scaleX = containerW / info.width;
            const scaleY = containerH / info.height;

            // Initial zoom: much closer by default (zoom value of 0.5 or 0.8 depending on needs, 
            // but let's go with a fixed high scale or a multiple of the fit-to-screen zoom)
            const initialZoom = Math.max(0.5, Math.min(scaleX, scaleY) * 4);

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
        
        // Prevent default only if possible (avoid passive event listener error)
        try {
            e.preventDefault();
        } catch (err) {
            // Ignore passive event listener error
        }
        
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

    const toggleFullscreen = async () => {
        if (!containerRef.current) return;
        
        try {
            if (!document.fullscreenElement) {
                await containerRef.current.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch (err) {
            console.error('Fullscreen error:', err);
        }
    };

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

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

    const showToolbar = isFullscreen || !isMobile;

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
                touchAction: "none",
                borderRadius: isFullscreen ? 0 : 12,
            }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Fullscreen Prompt Overlay for Mobile */}
            {isMobile && !isFullscreen && (
                <div 
                    onClick={toggleFullscreen}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(4px)',
                        color: '#FFF',
                        cursor: 'pointer'
                    }}
                >
                    <div style={{ 
                        background: 'rgba(20,22,25,0.8)',
                        padding: '20px',
                        borderRadius: '50%',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <FiMaximize2 size={32} />
                    </div>
                    <span style={{ marginTop: 12, fontSize: 12, fontWeight: 500, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                        Cliquer pour agrandir
                    </span>
                </div>
            )}

            {/* Minimized toolbar - just toggle button */}
            {isToolbarMinimized && showToolbar && (
                <div style={{
                    position: 'absolute',
                    left: isMobile ? 6 : 12,
                    top: isMobile ? 6 : 12,
                    zIndex: 300,
                }} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
                    <Tooltip title="Afficher la barre d'outils" placement="right">
                        <Button
                            type="text"
                            shape="circle"
                            size="small"
                            icon={<FiChevronRight size={isMobile ? 12 : 13} />}
                            onClick={() => setIsToolbarMinimized(false)}
                            style={{ 
                                color: '#E9EEF5', 
                                background: 'rgba(20,22,25,0.95)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                backdropFilter: 'blur(10px)'
                            }}
                        />
                    </Tooltip>
                </div>
            )}

            {/* Full toolbar */}
            {!isToolbarMinimized && showToolbar && (
            <div style={{
                position: 'absolute',
                left: isMobile ? 6 : 12,
                top: isMobile ? 6 : 12,
                zIndex: 300,
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? 4 : 6,
                padding: isMobile ? '6px' : '8px',
                background: 'linear-gradient(180deg, rgba(20,22,25,0.95), rgba(14,15,17,0.9))',
                borderRadius: isMobile ? 6 : 8,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                color: '#E9EEF5',
                width: isMobile ? 44 : 80,
                maxHeight: 'calc(100% - 24px)',
                overflowY: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
            }} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
                {/* Minimize button at top */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: isMobile ? 2 : 4 }}>
                    <Tooltip title="Masquer la barre d'outils" placement="right">
                        <Button
                            type="text"
                            size="small"
                            icon={<FiChevronLeft size={10} />}
                            onClick={() => setIsToolbarMinimized(true)}
                            style={{ 
                                color: '#E9EEF5', 
                                background: 'transparent',
                                border: 'none',
                                padding: '1px',
                                height: 'auto',
                                minHeight: 'auto'
                            }}
                        />
                    </Tooltip>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 4 : 5, alignItems: 'center' }}>
                    <Tooltip title="Zoom -" placement="right">
                        <Button
                            type="text"
                            shape="circle"
                            size="small"
                            icon={<FiZoomOut size={isMobile ? 12 : 13} />}
                            onClick={() => zoomBy(1 / 1.25)}
                            style={{ color: '#E9EEF5', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                        />
                    </Tooltip>
                    {!isMobile && (
                        <div style={{ height: 70, padding: '4px 0' }}>
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
                    )}
                    <Tooltip title="Zoom +" placement="right">
                        <Button
                            type="text"
                            shape="circle"
                            size="small"
                            icon={<FiZoomIn size={isMobile ? 12 : 13} />}
                            onClick={() => zoomBy(1.25)}
                            style={{ color: '#E9EEF5', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                        />
                    </Tooltip>
                    <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)', margin: isMobile ? '2px 0' : '3px 0' }} />
                    <Tooltip title="Ajuster à l'écran" placement="right">
                        <Button
                            type="text"
                            shape="circle"
                            size="small"
                            icon={<FiMaximize2 size={isMobile ? 12 : 13} />}
                            onClick={fitToScreen}
                            style={{ color: '#E9EEF5', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                        />
                    </Tooltip>
                    <Tooltip title={isFullscreen ? "Quitter plein écran" : "Plein écran"} placement="right">
                        <Button
                            type="text"
                            shape="circle"
                            size="small"
                            icon={isFullscreen ? <FiMinimize2 size={isMobile ? 12 : 13} /> : <FiMaximize2 size={isMobile ? 12 : 13} />}
                            onClick={toggleFullscreen}
                            style={{ color: '#E9EEF5', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                        />
                    </Tooltip>
                </div>

                <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)', margin: isMobile ? '4px 0' : '5px 0' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 4 : 5 }}>
                    <Button
                        type={activeTool === 'pan' ? 'primary' : 'text'}
                        size="small"
                        icon={<ToolIcon name="pan" size={isMobile ? 14 : 11} />}
                        onClick={() => setActiveTool('pan')}
                        style={activeTool === 'pan' ? { 
                            background: '#1366FF', 
                            color: '#FFF', 
                            borderRadius: 6, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            padding: isMobile ? '6px 0' : '4px 6px',
                            width: '100%',
                            fontSize: 11
                        } : { 
                            color: '#E9EEF5', 
                            background: 'transparent', 
                            border: '1px solid rgba(255,255,255,0.02)', 
                            borderRadius: 6, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            padding: isMobile ? '6px 0' : '4px 6px',
                            width: '100%',
                            fontSize: 11
                        }}
                    >
                        {!isMobile && <span style={{ marginLeft: 4 }}>Pan</span>}
                    </Button>

                    <Button
                        type={activeTool === 'pensil' ? 'primary' : 'text'}
                        size="small"
                        icon={<ToolIcon name="pensil" size={isMobile ? 14 : 11} />}
                        onClick={() => setActiveTool('pensil')}
                        style={activeTool === 'pensil' ? { background: '#1366FF', color: '#FFF', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '6px 0' : '4px 6px', width: '100%', fontSize: 11 } : { color: '#E9EEF5', background: 'transparent', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '6px 0' : '4px 6px', width: '100%', fontSize: 11 }}
                    >
                        {!isMobile && <span style={{ marginLeft: 4 }}>Crayon</span>}
                    </Button>

                    <Button
                        type={activeTool === 'line' ? 'primary' : 'text'}
                        size="small"
                        icon={<ToolIcon name="line" size={isMobile ? 14 : 11} />}
                        onClick={() => setActiveTool('line')}
                        style={activeTool === 'line' ? { background: '#1366FF', color: '#FFF', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '6px 0' : '4px 6px', width: '100%', fontSize: 11 } : { color: '#E9EEF5', background: 'transparent', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '6px 0' : '4px 6px', width: '100%', fontSize: 11 }}
                    >
                        {!isMobile && <span style={{ marginLeft: 4 }}>Ligne</span>}
                    </Button>

                    <Button
                        type={activeTool === 'rectangle' ? 'primary' : 'text'}
                        size="small"
                        icon={<ToolIcon name="rectangle" size={isMobile ? 14 : 11} />}
                        onClick={() => setActiveTool('rectangle')}
                        style={activeTool === 'rectangle' ? { background: '#1366FF', color: '#FFF', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '6px 0' : '4px 6px', width: '100%', fontSize: 11 } : { color: '#E9EEF5', background: 'transparent', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '6px 0' : '4px 6px', width: '100%', fontSize: 11 }}
                    >
                        {!isMobile && <span style={{ marginLeft: 4 }}>Rect.</span>}
                    </Button>

                    <Button
                        type={activeTool === 'circle' ? 'primary' : 'text'}
                        size="small"
                        icon={<ToolIcon name="circle" size={isMobile ? 14 : 11} />}
                        onClick={() => setActiveTool('circle')}
                        style={activeTool === 'circle' ? { background: '#1366FF', color: '#FFF', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '6px 0' : '4px 6px', width: '100%', fontSize: 11 } : { color: '#E9EEF5', background: 'transparent', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '6px 0' : '4px 6px', width: '100%', fontSize: 11 }}
                    >
                        {!isMobile && <span style={{ marginLeft: 4 }}>Cercle</span>}
                    </Button>

                    <Button
                        type={activeTool === 'ellipse' ? 'primary' : 'text'}
                        size="small"
                        icon={<ToolIcon name="ellipse" size={isMobile ? 14 : 11} />}
                        onClick={() => setActiveTool('ellipse')}
                        style={activeTool === 'ellipse' ? { background: '#1366FF', color: '#FFF', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '6px 0' : '4px 6px', width: '100%', fontSize: 11 } : { color: '#E9EEF5', background: 'transparent', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '6px 0' : '4px 6px', width: '100%', fontSize: 11 }}
                    >
                        {!isMobile && <span style={{ marginLeft: 4 }}>Ellip.</span>}
                    </Button>

                    <Button
                        type={activeTool === 'polygon' ? 'primary' : 'text'}
                        size="small"
                        icon={<ToolIcon name="polygon" size={isMobile ? 14 : 11} />}
                        onClick={() => setActiveTool('polygon')}
                        style={activeTool === 'polygon' ? { background: '#1366FF', color: '#FFF', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '6px 0' : '4px 6px', width: '100%', fontSize: 11 } : { color: '#E9EEF5', background: 'transparent', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '6px 0' : '4px 6px', width: '100%', fontSize: 11 }}
                    >
                        {!isMobile && <span style={{ marginLeft: 4 }}>Poly.</span>}
                    </Button>

                    <Button
                        danger
                        type="text"
                        size="small"
                        icon={<ToolIcon name="erase" size={isMobile ? 14 : 11} />}
                        onClick={() => {
                            canvaRef.current?.clear();
                            setActiveTool('pan');
                        }}
                        style={{ color: '#FF6B6B', background: 'transparent', border: '1px solid rgba(255,255,255,0.02)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '6px 0' : '4px 6px', width: '100%', fontSize: 11 }}
                    >
                        {!isMobile && <span style={{ marginLeft: 4 }}>Effac.</span>}
                    </Button>

                    <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)', margin: isMobile ? '4px 0' : '5px 0' }} />

                    <Button
                        type={showLabels ? 'primary' : 'text'}
                        size="small"
                        icon={<ToolIcon name="hide-dimensions" size={isMobile ? 14 : 11} />}
                        onClick={() => setShowLabels(!showLabels)}
                        style={showLabels ? { 
                            background: '#1366FF', 
                            color: '#FFF', 
                            borderRadius: 6, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            padding: isMobile ? '6px 0' : '4px 6px',
                            width: '100%',
                            fontSize: 11
                        } : { 
                            color: '#E9EEF5', 
                            background: 'transparent', 
                            border: '1px solid rgba(255,255,255,0.02)', 
                            borderRadius: 6, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            padding: isMobile ? '6px 0' : '4px 6px',
                            width: '100%',
                            fontSize: 11
                        }}
                    >
                        {!isMobile && <span style={{ marginLeft: 4 }}>Dim.</span>}
                    </Button>
                </div>
            </div>
            )}

            {/* Thumbnail preview (hidden on mobile to keep toolbar visible) */}
            {!isMobile && (
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
            )}

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
                showLabels={showLabels}
            />
        </div>
    );
}
