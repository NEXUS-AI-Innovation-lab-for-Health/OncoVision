import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
    CircleCursor,
    DrawingCursor,
    EllipseCursor,
    LineCursor,
    PensilCursor,
    PolygonCursor,
    RectangleCursor,
} from "../../types/viewer/cursors";
import type { CursorBoundingBox, CursorType } from "../../types/viewer/cursors";
import { Shape } from "../../types/viewer/shapes";
import type { Point } from "../../types/viewer/shapes";

export type CanvaTool = "pan" | CursorType;

export interface CanvaViewState {
    x: number;
    y: number;
    zoom: number;
}

export type CanvaProps = {
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
    children?: ReactNode;
}

export interface CanvaHandle {
    addShape: (shape: Shape) => void;
    removeShape: (shape: Shape) => void;
    setListener: (listener: (shape: Shape, shapes: Shape[]) => void) => void;
    setShapes: (shapes: Shape[]) => void;
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
    children,
}: CanvaProps, ref) {
    const [internalTool] = useState<CanvaTool>("pan");
    const resolvedTool = activeTool ?? internalTool;
    const cursorRef = useRef<DrawingCursor | null>(null);
    const [shapes, setShapes] = useState<{ shape: Shape; metrics: any }[]>([]);
    const [previewShape, setPreviewShape] = useState<Shape | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const listenerRef = useRef<((shape: Shape, shapes: Shape[]) => void) | null>(null);

    const bounds: CursorBoundingBox | undefined = (imageWidth && imageHeight) ? { width: imageWidth, height: imageHeight } : undefined;

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
    }, [resolvedTool, strokeColor, strokeWidth, imageWidth, imageHeight]);

    const addShape = (shape: Shape) => {
        const metrics = shape.getMetrics();
        setShapes((prev) => [...prev, { shape, metrics }]);
        onShapeCreated?.(shape, metrics);
    };

    const removeShape = (shape: Shape) => {
        setShapes((prev) => prev.filter((current) => current !== shape));
        setPreviewShape(null);
        setIsDrawing(false);
    };

    const setListener = (listener: (shape: Shape, shapes: Shape[]) => void) => {
        listenerRef.current = listener;
    };

    const setShapesExternal = (nextShapes: Shape[]) => {
        setShapes(nextShapes);
        // Reset preview/drawing state when shapes are replaced externally
        setPreviewShape(null);
        setIsDrawing(false);
    };

    useImperativeHandle(ref, () => {
        const handle = { addShape, removeShape, setListener, setShapes: setShapesExternal };
        return handle;
    }, [addShape, removeShape, setListener, setShapesExternal]);

    const toImagePoint = (e: React.PointerEvent<SVGSVGElement>): Point => {
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
        if (typeof imageWidth !== 'number' || typeof imageHeight !== 'number') return true;
        return p.x >= 0 && p.x <= imageWidth && p.y >= 0 && p.y <= imageHeight;
    };

    const clampPointToImage = (p: Point): Point => {
        if (typeof imageWidth !== 'number' || typeof imageHeight !== 'number') return p;
        return {
            x: Math.max(0, Math.min(imageWidth, p.x)),
            y: Math.max(0, Math.min(imageHeight, p.y)),
        };
    };

    const commitShapeIfReady = (force?: boolean) => {
        if (!cursorRef.current) return;
        const shape = cursorRef.current.finish(force);
        if (shape) {
            addShape(shape);
            setPreviewShape(null);
            setIsDrawing(false);
        } else {
            setPreviewShape(cursorRef.current.createPreview());
        }
    };

    const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
        if (resolvedTool === "pan" || !cursorRef.current) return;
        e.stopPropagation();

        const point = toImagePoint(e);
        if (!isPointInImage(point)) return;

        (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
        cursorRef.current.press(point, bounds);
        setPreviewShape(cursorRef.current.createPreview());
        setIsDrawing(true);
        onDrawingActiveChange?.(true);
    };

    const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
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
        cursorRef.current.move(clamped, bounds);
        setPreviewShape(cursorRef.current.createPreview());
    };

    const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
        if (!isDrawing || !cursorRef.current) return;
        const point = toImagePoint(e);
        const clamped = clampPointToImage(point);
        cursorRef.current.release(clamped, bounds);
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
        if (resolvedTool !== "polygon") return;
        e.stopPropagation();
        commitShapeIfReady(true);
    };

    const canvaStyle = useMemo<CSSProperties>(() => ({
        position: "absolute",
        inset: 0,
        pointerEvents: resolvedTool === "pan" ? "none" : "auto",
        zIndex: 1,
    }), [resolvedTool]);

    const overlayStyle = useMemo<CSSProperties>(() => ({
        position: "absolute",
        inset: 0,
        zIndex: 2,
    }), []);

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
                    <g
                        transform={`translate(${width / 2}, ${height / 2}) scale(${viewState.zoom}) translate(${-viewState.x}, ${-viewState.y})`}
                    >
                        {shapes.map(({ shape, metrics }, idx) => (
                            <g key={`shape-${idx}`}>
                                {shape.render()}
                                {shape.renderLabel?.(metrics)}
                            </g>
                        ))}
                        {previewShape && <g opacity={0.7}>{previewShape.render()}</g>}
                    </g>
                </svg>
            )}
            {children && (
                <div style={overlayStyle}>
                    {children}
                </div>
            )}
        </>
    );
});

export default Canva;
