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
    onShapeCreated?: (shape: Shape) => void;
    onDrawingActiveChange?: (active: boolean) => void;
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
    strokeColor = "#ff3b30",
    strokeWidth = 2,
    initialShapes = [],
    onShapeCreated,
    onDrawingActiveChange,
}: CanvaProps, ref) {
    const [internalTool] = useState<CanvaTool>("pan");
    const resolvedTool = activeTool ?? internalTool;
    const cursorRef = useRef<DrawingCursor | null>(null);
    const [shapes, setShapes] = useState<Shape[]>(initialShapes);
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
        setShapes((prev) => [...prev, shape]);
        onShapeCreated?.(shape);
    };

    const clear = () => {
        setShapes([]);
        setPreviewShape(null);
        setIsDrawing(false);
    };

    useImperativeHandle(ref, () => ({ addShape, clear }), [addShape, clear]);

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
        (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);

        const point = toImagePoint(e);
        cursorRef.current.press(point);
        setPreviewShape(cursorRef.current.createPreview());
        setIsDrawing(true);
        onDrawingActiveChange?.(true);
    };

    const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
        if (!isDrawing || !cursorRef.current) return;
        const point = toImagePoint(e);
        cursorRef.current.move(point);
        setPreviewShape(cursorRef.current.createPreview());
    };

    const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
        if (!isDrawing || !cursorRef.current) return;
        const point = toImagePoint(e);
        cursorRef.current.release(point);
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
                    <g
                        transform={`translate(${width / 2}, ${height / 2}) scale(${viewState.zoom}) translate(${-viewState.x}, ${-viewState.y})`}
                    >
                        {shapes.map((shape, idx) => (
                            <g key={`shape-${idx}`}>{shape.render()}</g>
                        ))}
                        {previewShape && <g opacity={0.7}>{previewShape.render()}</g>}
                    </g>
                </svg>
            )}
        </>
    );
});

export default Canva;
