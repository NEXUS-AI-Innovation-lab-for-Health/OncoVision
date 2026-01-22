import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Button } from "antd";
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
    strokeColor = "#ff3b30",
    strokeWidth = 2,
    initialShapes = [],
    onShapeCreated,
    onDrawingActiveChange,
}: CanvaProps, ref) {

    const [activeTool, setActiveTool] = useState<CanvaTool>("pan");
    const cursorRef = useRef<DrawingCursor | null>(null);
    const [shapes, setShapes] = useState<Shape[]>(initialShapes);
    const [previewShape, setPreviewShape] = useState<Shape | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const viewStateRef = useRef(viewState);
    useEffect(() => {
        viewStateRef.current = viewState;
    }, [viewState]);

    useEffect(() => {
        if (activeTool === "pan") {
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

        cursorRef.current = createCursor(activeTool);
        setPreviewShape(null);
        setIsDrawing(false);
        onDrawingActiveChange?.(false);
    }, [activeTool, strokeColor, strokeWidth]);

    const addShape = (shape: Shape) => {
        setShapes((prev) => [...prev, shape]);
        onShapeCreated?.(shape);
    };

    const clear = () => {
        setShapes([]);
        setPreviewShape(null);
        setIsDrawing(false);
    };

    useImperativeHandle(ref, () => ({ addShape, clear }), [addShape]);

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
        if (activeTool === "pan" || !cursorRef.current) return;
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
        if (activeTool !== "polygon") return;
        e.stopPropagation();
        commitShapeIfReady(true);
    };

    const canvaStyle = useMemo<CSSProperties>(() => ({
        position: "absolute",
        inset: 0,
        pointerEvents: activeTool === "pan" ? "none" : "auto",
    }), [activeTool]);

    const canRenderSvg = width > 0 && height > 0;

    return (
        <>
            <div
                style={{
                    position: "absolute",
                    left: 16,
                    top: 170,
                    zIndex: 320,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: "8px 6px",
                    background: "rgba(30,30,30,0.85)",
                    borderRadius: 6,
                    backdropFilter: "blur(4px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <Button
                    type={activeTool === "pan" ? "primary" : "text"}
                    size="small"
                    onClick={() => setActiveTool("pan")}
                >
                    Pan
                </Button>
                <Button
                    type={activeTool === "pensil" ? "primary" : "text"}
                    size="small"
                    onClick={() => setActiveTool("pensil")}
                >
                    Crayon
                </Button>
                <Button
                    type={activeTool === "line" ? "primary" : "text"}
                    size="small"
                    onClick={() => setActiveTool("line")}
                >
                    Ligne
                </Button>
                <Button
                    type={activeTool === "rectangle" ? "primary" : "text"}
                    size="small"
                    onClick={() => setActiveTool("rectangle")}
                >
                    Rectangle
                </Button>
                <Button
                    type={activeTool === "circle" ? "primary" : "text"}
                    size="small"
                    onClick={() => setActiveTool("circle")}
                >
                    Cercle
                </Button>
                <Button
                    type={activeTool === "ellipse" ? "primary" : "text"}
                    size="small"
                    onClick={() => setActiveTool("ellipse")}
                >
                    Ellipse
                </Button>
                <Button
                    type={activeTool === "polygon" ? "primary" : "text"}
                    size="small"
                    onClick={() => setActiveTool("polygon")}
                >
                    Polygone
                </Button>
                <Button
                    danger
                    type="text"
                    size="small"
                    onClick={clear}
                >
                    Effacer
                </Button>
            </div>

            {canRenderSvg && (
                <svg
                    width={width}
                    height={height}
                    viewBox={`0 0 ${width} ${height}`}
                    style={canvaStyle}
                    onMouseDown={(e) => { if (activeTool !== "pan") e.stopPropagation(); }}
                    onMouseMove={(e) => { if (activeTool !== "pan") e.stopPropagation(); }}
                    onMouseUp={(e) => { if (activeTool !== "pan") e.stopPropagation(); }}
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
