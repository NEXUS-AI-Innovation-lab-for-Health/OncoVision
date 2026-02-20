import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
    CircleCursor,
    DrawingCursor,
    EllipseCursor,
    LineCursor,
    PensilCursor,
    PolygonCursor,
    RectangleCursor,
} from "../../types/viewer/cursors";
import type { CursorType } from "../../types/viewer/cursors";
import { Shape } from "../../types/viewer/shapes";
import type { Point } from "../../types/viewer/shapes";

export type CanvaTool = "pan" | CursorType;

export interface CanvaViewState {
    x: number;
    y: number;
    zoom: number;
}

interface CanvaProps {
    viewState: CanvaViewState;
    width: number;
    height: number;
    activeTool?: CanvaTool;
    strokeColor?: string;
    strokeWidth?: number;
    initialShapes?: Shape[];
    onShapeCreated?: (shape: Shape, metrics: any) => void;
    onDrawingActiveChange?: (active: boolean) => void;
    imageWidth?: number;
    imageHeight?: number;
    showLabels?: boolean;
    scaleFactor?: number; // units per pixel
    scaleUnit?: string;
}

export interface CanvaHandle {
    addShape: (shape: Shape) => void;
    clear: () => void;
}

const Canva = forwardRef<CanvaHandle, CanvaProps>(function Canva({
    viewState,
    width,
    height,
    activeTool,
    strokeColor = "#00ff00",
    strokeWidth = 2,
    initialShapes = [],
    onShapeCreated,
    onDrawingActiveChange,
    imageWidth,
    imageHeight,
    showLabels = true,
    scaleFactor = 1,
    scaleUnit = 'px',
}: CanvaProps, ref) {
    const [internalTool] = useState<CanvaTool>("pan");
    const resolvedTool = activeTool ?? internalTool;
    const cursorRef = useRef<DrawingCursor | null>(null);
    const [shapes, setShapes] = useState<{ shape: Shape; metrics: any }[]>([]);
    const [previewShape, setPreviewShape] = useState<Shape | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const viewStateRef = useRef(viewState);
    useEffect(() => {
        viewStateRef.current = viewState;
    }, [viewState]);

    useEffect(() => {
        if (resolvedTool === "pan") {
            cursorRef.current = null;
            setPreviewShape(null);
            setIsDrawing(false);
            onDrawingActiveChange?.(false);
            return;
        }

        const createCursor = (tool: CursorType): DrawingCursor => {
            switch (tool) {
                case "line":
                    return new LineCursor(strokeColor, strokeWidth);
                case "pensil":
                    return new PensilCursor(strokeColor, strokeWidth);
                case "circle":
                    return new CircleCursor(strokeColor, strokeWidth);
                case "ellipse":
                    return new EllipseCursor(strokeColor, strokeWidth);
                case "rectangle":
                    return new RectangleCursor(strokeColor, strokeWidth);
                case "polygon":
                    return new PolygonCursor(strokeColor, strokeWidth);
                default:
                    return new LineCursor(strokeColor, strokeWidth);
            }
        };

        cursorRef.current = createCursor(resolvedTool);
        setPreviewShape(null);
        setIsDrawing(false);
        onDrawingActiveChange?.(false);
    }, [resolvedTool, strokeColor, strokeWidth]);

    const addShape = (shape: Shape) => {
        const metrics = shape.getMetrics();
        setShapes((prev) => [...prev, { shape, metrics }]);
        onShapeCreated?.(shape, metrics);
    };

    const clear = () => {
        setShapes([]);
        setPreviewShape(null);
        setIsDrawing(false);
    };

    useImperativeHandle(ref, () => ({ addShape, clear }), [addShape, clear]);

    const toImagePoint = (e: React.PointerEvent<SVGSVGElement>): Point => {
        // Convertit un événement pointer (coordonnées écran) en coordonnées image
        // Prend en compte la taille du SVG, le centre courant (`viewState`) et le zoom.
        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const { x: cx, y: cy, zoom } = viewStateRef.current;

        return {
            x: (x - width / 2) / zoom + cx,
            y: (y - height / 2) / zoom + cy,
        };
    };

    const isPointInImage = (p: Point) => {
        // Vérifie si un point (en coords image) est à l'intérieur des limites connues
        if (typeof imageWidth !== 'number' || typeof imageHeight !== 'number') return true;
        return p.x >= 0 && p.x <= imageWidth && p.y >= 0 && p.y <= imageHeight;
    };

    const clampPointToImage = (p: Point): Point => {
        // Contraint un point pour rester dans la zone image
        if (typeof imageWidth !== 'number' || typeof imageHeight !== 'number') return p;
        return {
            x: Math.max(0, Math.min(imageWidth, p.x)),
            y: Math.max(0, Math.min(imageHeight, p.y)),
        };
    };

    const commitShapeIfReady = (force?: boolean) => {
        // Termine le dessin courant si le curseur indique qu'il y a une forme complète
        // `force` est utilisé par le double-clic (polygon close)
        if (!cursorRef.current) return;
        const shape = cursorRef.current.finish(force);
        if (shape) {
            addShape(shape);
            setPreviewShape(null);
            setIsDrawing(false);
        } else {
            // Met à jour l'aperçu si la forme n'est pas encore complète
            setPreviewShape(cursorRef.current.createPreview());
        }
    };

    const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
        // Début d'interaction pour les outils de dessin : capture du pointer
        // Convertit la position en coordonnées image et démarre le curseur
        if (resolvedTool === "pan" || !cursorRef.current) return;
        e.stopPropagation();

        const point = toImagePoint(e);
        if (!isPointInImage(point)) return;

        (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
        cursorRef.current.press(point);
        setPreviewShape(cursorRef.current.createPreview());
        setIsDrawing(true);
        onDrawingActiveChange?.(true);
    };

    const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
        // Pendant le mouvement, on met à jour le curseur si on dessine
        // Sinon on ajuste l'apparence du curseur (crosshair / not-allowed)
        if (!isDrawing || !cursorRef.current) {
            if (resolvedTool !== "pan") {
                const pt = toImagePoint(e);
                try {
                    (e.currentTarget as SVGSVGElement).style.cursor = isPointInImage(pt) ? 'crosshair' : 'not-allowed';
                } catch {}
            }
            return;
        }

        const point = toImagePoint(e);
        const clamped = clampPointToImage(point);
        cursorRef.current.move(clamped);
        setPreviewShape(cursorRef.current.createPreview());
    };

    const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
        // Fin d'interaction : relâche le pointer et essaye de finaliser la forme
        if (!isDrawing || !cursorRef.current) return;
        const point = toImagePoint(e);
        const clamped = clampPointToImage(point);
        cursorRef.current.release(clamped);
        commitShapeIfReady();
        onDrawingActiveChange?.(false);
        try {
            (e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
        } catch {}
    };

    const handlePointerCancel = (e: React.PointerEvent<SVGSVGElement>) => {
        if (!isDrawing) return;
        setIsDrawing(false);
        setPreviewShape(null);
        onDrawingActiveChange?.(false);
        try {
            (e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
        } catch {}
    };

    const handleDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        // Double-clic ferme un polygone en cours (force = true)
        if (resolvedTool !== "polygon") return;
        e.stopPropagation();
        commitShapeIfReady(true);
    };

    const canvaStyle = useMemo<CSSProperties>(() => ({
        position: "absolute",
        inset: 0,
        pointerEvents: resolvedTool === "pan" ? "none" : "auto",
    }), [resolvedTool]);

    const canRenderSvg = width > 0 && height > 0;

    return (
        <>
            {canRenderSvg && (
                <svg
                    width={width}
                    height={height}
                    viewBox={`0 0 ${width} ${height}`}
                    style={canvaStyle}
                    onMouseDown={(e) => { if (resolvedTool !== "pan") e.stopPropagation(); }}
                    onMouseMove={(e) => { if (resolvedTool !== "pan") e.stopPropagation(); }}
                    onMouseUp={(e) => { if (resolvedTool !== "pan") e.stopPropagation(); }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    onDoubleClick={handleDoubleClick}
                >
                    {/*
                        Groupe principal des formes :
                        On applique une transformation pour passer des coordonnées image
                        aux coordonnées SVG affichées (centrage + zoom + translation).
                    */}
                    <g
                        transform={`translate(${width / 2}, ${height / 2}) scale(${viewState.zoom}) translate(${-viewState.x}, ${-viewState.y})`}
                    >
                        {shapes.map(({ shape, metrics }, idx) => (
                            <g key={`shape-${idx}`}>
                                {shape.render()}
                                {showLabels && shape.renderLabel?.(metrics, { factor: scaleFactor, unit: scaleUnit })}
                            </g>
                        ))}
                        {previewShape && <g opacity={0.7}>{previewShape.render()}</g>}
                    </g>
                </svg>
            )}
        </>
    );
});

export default Canva;
