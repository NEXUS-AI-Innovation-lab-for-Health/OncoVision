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
import { Circle, Ellipse, Line, Polygon, Polyline, Rectangle, Shape } from "../../types/viewer/shapes";
import type { Point } from "../../types/viewer/shapes";

export type CanvaTool = "pan" | CursorType;

export interface CanvaViewState {
    x: number;
    y: number;
    zoom: number;
}

export type MeterUnit = "px" | "mm" | "µm" | "nm";

export interface Properties {
    canva: {
        unit: MeterUnit;
    };
    shape: {
        details: boolean;
        strike: {
            color: string;
            width: number;
        };
    };
}

export const DEFAULT_PROPERTIES: Properties = {
    canva: {
        unit: "px",
    },
    shape: {
        details: true,
        strike: {
            color: "#ff3b30",
            width: 2,
        },
    },
};

export type CanvaProps = {
    viewState: CanvaViewState;
    width: number;
    height: number;
    activeTool?: CanvaTool;
    properties?: Properties;
    initialShapes?: Shape[];
    onShapeCreated?: (shape: Shape) => void;
    onDrawingActiveChange?: (active: boolean) => void;
    // Optional image bounds (in image pixel coordinates). If provided, drawing is limited to these bounds.
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
    properties = DEFAULT_PROPERTIES,
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
    const cursorWorldPosRef = useRef<Point | null>(null);
    const [shapes, setShapes] = useState<Shape[]>(initialShapes);
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

        const { color, width: strokeWidth } = properties.shape.strike;

        const createCursor = (tool: CursorType): DrawingCursor => {
            switch (tool) {
                case "line":
                    return new LineCursor(color, strokeWidth);
                case "pensil":
                    return new PensilCursor(color, strokeWidth);
                case "circle":
                    return new CircleCursor(color, strokeWidth);
                case "ellipse":
                    return new EllipseCursor(color, strokeWidth);
                case "rectangle":
                    return new RectangleCursor(color, strokeWidth);
                case "polygon":
                    return new PolygonCursor(color, strokeWidth);
                default:
                    return new LineCursor(color, strokeWidth);
            }
        };

        cursorRef.current = createCursor(resolvedTool);
        setPreviewShape(null);
        setIsDrawing(false);
        onDrawingActiveChange?.(false);
    }, [resolvedTool, properties, imageWidth, imageHeight]);

    const addShape = (shape: Shape) => {
        setShapes((prev) => {
            const next = [...prev, shape];
            listenerRef.current?.(shape, next);
            return next;
        });
        onShapeCreated?.(shape);
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
        // Do not start drawing if the user pressed outside the image (black margins)
        if (!isPointInImage(point)) return;

        (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
        cursorRef.current.press(point, bounds);
        setPreviewShape(cursorRef.current.createPreview());
        setIsDrawing(true);
        onDrawingActiveChange?.(true);
    };

    const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
        cursorWorldPosRef.current = toImagePoint(e);
        // If not drawing, update cursor feedback to indicate writable area
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
        // Keep drawing but clamp movements to image bounds so we never draw outside
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

    const getVisibleWorldBounds = () => {
        const halfW = width / (2 * viewState.zoom);
        const halfH = height / (2 * viewState.zoom);
        return {
            minX: viewState.x - halfW,
            maxX: viewState.x + halfW,
            minY: viewState.y - halfH,
            maxY: viewState.y + halfH,
        };
    };

    const getShapeBBox = (shape: Shape): { minX: number; maxX: number; minY: number; maxY: number } | null => {
        if (shape instanceof Line) {
            return {
                minX: Math.min(shape.start.x, shape.end.x),
                maxX: Math.max(shape.start.x, shape.end.x),
                minY: Math.min(shape.start.y, shape.end.y),
                maxY: Math.max(shape.start.y, shape.end.y),
            };
        }
        if (shape instanceof Circle) {
            return {
                minX: shape.center.x - shape.radius,
                maxX: shape.center.x + shape.radius,
                minY: shape.center.y - shape.radius,
                maxY: shape.center.y + shape.radius,
            };
        }
        if (shape instanceof Ellipse) {
            return {
                minX: shape.center.x - shape.radiusX,
                maxX: shape.center.x + shape.radiusX,
                minY: shape.center.y - shape.radiusY,
                maxY: shape.center.y + shape.radiusY,
            };
        }
        if (shape instanceof Rectangle) {
            return {
                minX: shape.origin.x,
                maxX: shape.origin.x + shape.width,
                minY: shape.origin.y,
                maxY: shape.origin.y + shape.height,
            };
        }
        if (shape instanceof Polygon || shape instanceof Polyline) {
            if (!shape.points.length) return null;
            const xs = shape.points.map((p) => p.x);
            const ys = shape.points.map((p) => p.y);
            return {
                minX: Math.min(...xs),
                maxX: Math.max(...xs),
                minY: Math.min(...ys),
                maxY: Math.max(...ys),
            };
        }
        return null;
    };

    const getShapeAnchor = (shape: Shape): Point | null => {
        if (shape instanceof Line) {
            return {
                x: Math.max(shape.start.x, shape.end.x),
                y: Math.min(shape.start.y, shape.end.y),
            };
        }
        if (shape instanceof Circle) {
            return {
                x: shape.center.x + shape.radius,
                y: shape.center.y - shape.radius,
            };
        }
        if (shape instanceof Ellipse) {
            return {
                x: shape.center.x + shape.radiusX,
                y: shape.center.y - shape.radiusY,
            };
        }
        if (shape instanceof Rectangle) {
            return {
                x: shape.origin.x + shape.width,
                y: shape.origin.y,
            };
        }
        if (shape instanceof Polygon || shape instanceof Polyline) {
            if (!shape.points.length) return null;
            const xs = shape.points.map((p) => p.x);
            const ys = shape.points.map((p) => p.y);
            return {
                x: Math.max(...xs),
                y: Math.min(...ys),
            };
        }

        return null;
    };

    const renderShapeDetails = (shape: Shape, idx: number) => {
        if (!properties.shape.details) return null;

        const details = shape.details(properties);
        const detailEntries = Object.values(details);
        if (!detailEntries.length) return null;

        const anchor = getShapeAnchor(shape);
        if (!anchor) return null;

        const visible = getVisibleWorldBounds();
        const bbox = getShapeBBox(shape);
        if (!bbox) return null;
        const shapeVisible =
            bbox.maxX >= visible.minX &&
            bbox.minX <= visible.maxX &&
            bbox.maxY >= visible.minY &&
            bbox.minY <= visible.maxY;
        if (!shapeVisible) return null;

        const pad = 5;
        const lineH = 12;
        const titleH = 13;
        const sepH = 3;
        const boxW = 118;
        const boxH = pad + titleH + sepH + detailEntries.length * lineH + pad;

        const desiredX = anchor.x + 5;
        const desiredY = anchor.y - boxH / 2;
        const lx = Math.max(visible.minX + 4, Math.min(desiredX, visible.maxX - boxW - 4));
        const ly = Math.max(visible.minY + 4, Math.min(desiredY, visible.maxY - boxH - 4));

        if (isDrawing && cursorWorldPosRef.current) {
            const { x: cx, y: cy } = cursorWorldPosRef.current;
            const margin = 12 / viewState.zoom;
            if (cx >= lx - margin && cx <= lx + boxW + margin && cy >= ly - margin && cy <= ly + boxH + margin) {
                return null;
            }
        }

        return (
            <g key={`shape-details-${idx}`} pointerEvents="none" style={{ userSelect: "none" }}>
                <rect
                    x={lx}
                    y={ly}
                    width={boxW}
                    height={boxH}
                    fill="rgba(20, 22, 25, 0.96)"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth={0.6}
                    rx={5}
                    ry={5}
                    filter="url(#shape-detail-shadow)"
                />
                <text
                    x={lx + pad}
                    y={ly + pad + 9}
                    fill="rgba(255,255,255,0.38)"
                    fontSize={7}
                    fontWeight={700}
                    fontFamily="system-ui, sans-serif"
                    letterSpacing={0.9}
                    style={{ userSelect: "none" }}
                >
                    {shape.getType().toUpperCase()}
                </text>
                <line
                    x1={lx + pad}
                    y1={ly + pad + titleH}
                    x2={lx + boxW - pad}
                    y2={ly + pad + titleH}
                    stroke="rgba(255,255,255,0.07)"
                    strokeWidth={0.5}
                />
                {detailEntries.map((entry, detailIdx) => (
                    <text
                        key={`shape-detail-line-${idx}-${detailIdx}`}
                        x={lx + pad}
                        y={ly + pad + titleH + sepH + (detailIdx + 1) * lineH - 2}
                        fontSize={9}
                        fontFamily="system-ui, sans-serif"
                        style={{ userSelect: "none" }}
                    >
                        <tspan fill="rgba(141,179,255,0.75)" fontWeight={500}>{entry.label}: </tspan>
                        <tspan fill="rgba(255,255,255,0.85)">{entry.value}</tspan>
                    </text>
                ))}
            </g>
        );
    };

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
                    <defs>
                        <filter id="shape-detail-shadow" x="-30%" y="-30%" width="160%" height="160%">
                            <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="rgba(0,0,0,0.7)" floodOpacity="1" />
                        </filter>
                    </defs>
                    <g
                        transform={`translate(${width / 2}, ${height / 2}) scale(${viewState.zoom}) translate(${-viewState.x}, ${-viewState.y})`}
                    >
                        {shapes.map((shape, idx) => (
                            <g key={`shape-${idx}`}>{shape.render()}</g>
                        ))}
                        {shapes.map((shape, idx) => renderShapeDetails(shape, idx))}
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
