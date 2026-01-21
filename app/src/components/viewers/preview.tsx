import { useEffect, useRef, useState } from "react";
import type { DrawingStroke } from "../drawing/DrawingCanvas";

interface PreviewProps {
    info: any;
    imageId: string;
    viewState: { x: number; y: number; zoom: number };
    setViewState: (s: any) => void;
    get: any; // from useRest
    containerW?: number;
    containerH?: number;
    thumbWidth?: number;
    strokes?: DrawingStroke[];
}

const tileCache = new Map<string, HTMLImageElement>();

export default function ImagePreview({ 
    info, 
    imageId, 
    viewState, 
    setViewState, 
    get, 
    containerW = 800, 
    containerH = 600,
    thumbWidth = 150,
    strokes = []
}: PreviewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);
    const previewImgRef = useRef<HTMLImageElement | null>(null);
    const isDragging = useRef(false);

    // Calculate the integer level where the whole image fits in roughly one tile (or closest to it)
    // We want a level L where dimensions are preferably <= tileSize, so we only need 0_0.
    // However, if the thumbnail size is larger than tileSize, we might prefer a slightly larger one,
    // but the critical part is simplified fetching: we really want to fetch just one tile "0_0".
    // So we target the largest level that fits in one tile.
    const targetLevel = info ? Math.max(0, Math.floor((info.levels - 1) - Math.log2(Math.max(info.width, info.height) / info.tileSize))) : 0;

    useEffect(() => {
        if (!info) return;

        const cacheKey = `preview-${imageId}-lvl${targetLevel}`;
        if (tileCache.has(cacheKey)) {
            const img = tileCache.get(cacheKey)!;
            previewImgRef.current = img;
            setPreviewSrc(img.src);
            drawThumbnail();
            return;
        }

        // Fetch the 0_0 tile at the calculated level
        get({ endpoint: `viewer/images/${imageId}/tile/${targetLevel}/0_0.webp`, blob: true })
            .then((blob: unknown) => {
                if (blob instanceof Blob) {
                    const url = URL.createObjectURL(blob);
                    const img = new Image();
                    img.onload = () => {
                        tileCache.set(cacheKey, img);
                        previewImgRef.current = img;
                        setPreviewSrc(url);
                        drawThumbnail(); // Initial draw
                    };
                    img.onerror = () => {
                         // Fallback? Try level 0 if calculated level fails
                         console.warn("Preview tile load failed", targetLevel);
                         URL.revokeObjectURL(url);
                    };
                    img.src = url;
                }
            })
            .catch((e: any) => console.error(e));
    }, [info, imageId, targetLevel]);

    const drawThumbnail = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        const img = previewImgRef.current;
        if (!canvas || !ctx || !info) return;

        // Determine canvas size based on aspect ratio
        const cw = thumbWidth;
        const ch = Math.round((info.height / info.width) * cw);
        
        if (canvas.width !== cw || canvas.height !== ch) {
            canvas.width = cw;
            canvas.height = ch;
        }

        ctx.clearRect(0, 0, cw, ch);

        // Draw the image
        if (img) {
             ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, cw, ch);
        } else {
            // Placeholder
            ctx.fillStyle = "#333";
            ctx.fillRect(0, 0, cw, ch);
        }

        // Scale factor from image coordinates to thumbnail
        const scale = cw / info.width;

        // Draw strokes on thumbnail
        if (strokes && strokes.length > 0) {
            strokes.forEach(stroke => {
                if (stroke.points.length < 2) return;

                ctx.strokeStyle = stroke.color;
                ctx.lineWidth = Math.max(1, stroke.size * scale);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                if (stroke.tool === 'eraser') {
                    ctx.globalCompositeOperation = 'destination-out';
                } else {
                    ctx.globalCompositeOperation = 'source-over';
                }

                ctx.beginPath();
                const firstPoint = stroke.points[0];
                ctx.moveTo(firstPoint.x * scale, firstPoint.y * scale);

                for (let i = 1; i < stroke.points.length; i++) {
                    const point = stroke.points[i];
                    ctx.lineTo(point.x * scale, point.y * scale);
                }
                ctx.stroke();
            });

            ctx.globalCompositeOperation = 'source-over';
        }

        // Draw the viewport rectangle
        // The viewState includes x,y (center) and zoom (screen pixels / image pixels)
        // We need to map the visible area of the *main container* onto this thumbnail.

        // Visible area in Image coords:
        const visibleW = containerW / viewState.zoom;
        const visibleH = containerH / viewState.zoom;
        
        const visibleLeft = viewState.x - visibleW / 2;
        const visibleTop = viewState.y - visibleH / 2;
        
        const rectX = visibleLeft * scale;
        const rectY = visibleTop * scale;
        const rectW = visibleW * scale;
        const rectH = visibleH * scale;

        ctx.strokeStyle = "#2fa4ff"; // Blue
        ctx.lineWidth = 2;
        ctx.strokeRect(rectX, rectY, rectW, rectH);
        
        // Fill vaguely to highlight view
        ctx.fillStyle = "rgba(47, 164, 255, 0.2)";
        ctx.fillRect(rectX, rectY, rectW, rectH);
    };

    // Redraw when view changes or strokes change
    useEffect(() => {
        requestAnimationFrame(drawThumbnail);
    }, [viewState, previewSrc, containerW, containerH, strokes]);

    // Handle interaction
    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging.current || !info) return;
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Convert click pos (thumbnail pixels) -> image centered coords
        const scale = info.width / rect.width;
        const imgX = x * scale;
        const imgY = y * scale;

        setViewState((prev: any) => ({ ...prev, x: imgX, y: imgY }));
    };

    const onPointerDown = (e: React.PointerEvent) => {
        isDragging.current = true;
        (e.target as Element).setPointerCapture(e.pointerId);
        handlePointerMove(e);
    };

    const onPointerUp = (e: React.PointerEvent) => {
        isDragging.current = false;
        try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
    };

    if (!info) return null;

    return (
        <div style={{ 
            background: 'rgba(30,30,30,0.8)', 
            padding: 4, 
            borderRadius: 6,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)'
        }}>
            <canvas
                ref={canvasRef}
                style={{ display: 'block', cursor: 'crosshair', borderRadius: 2 }}
                onPointerDown={onPointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
            />
        </div>
    );
}
