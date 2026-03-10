import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
    CanvaCursor,
    CircleCursor,
    EllipseCursor,
    LineCursor,
    PensilCursor,
    PolygonCursor,
    RectangleCursor,
    ShapeSelectorCursor,
} from "../../types/viewer/cursors";
import type { CursorBoundingBox, CursorType } from "../../types/viewer/cursors";
import { Circle, Ellipse, Line, Polygon, Polyline, Rectangle, Shape } from "../../types/viewer/shapes";
import type { Point } from "../../types/viewer/shapes";
import ShapeDetailCard, { SHAPE_DETAIL_BOX_WIDTH, getShapeDetailBoxHeight } from "./detail";

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
    onViewStateChange?: (updater: (prev: CanvaViewState) => CanvaViewState) => void;
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
    onDrawingActiveChange,    onViewStateChange,    imageWidth,
    imageHeight,
    children,
}: CanvaProps, ref) {

    const [internalTool] = useState<CanvaTool>("pan");
    const resolvedTool = activeTool ?? internalTool;
    const cursorRef = useRef<CanvaCursor | null>(null);
    const cursorWorldPosRef = useRef<Point | null>(null);
    const [shapes, setShapes] = useState<Shape[]>(initialShapes);
    const [previewShape, setPreviewShape] = useState<Shape | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [selectedShapeIds, setSelectedShapeIds] = useState<Set<string>>(new Set());
    const [movingShapeId, setMovingShapeId] = useState<string | null>(null);
    const moveStartRef = useRef<{ shapeId: string; pointerId: number; startPoint: Point; original: Shape; svg: SVGSVGElement } | null>(null);
    const moveCleanupRef = useRef<(() => void) | null>(null);
    const onViewStateChangeRef = useRef(onViewStateChange);
    useEffect(() => { onViewStateChangeRef.current = onViewStateChange; }, [onViewStateChange]);
    const [hoveredInfo, setHoveredInfo] = useState<null | {
        idx: number;
        box: { x: number; y: number; w: number; h: number };
        anchor: Point;
    }>(null); // used below for highlighting and connection line
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

        const createCursor = (tool: CursorType): CanvaCursor => {
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
                case "selector":
                    return new ShapeSelectorCursor("#4ea1ff", 1.5, getShapeBBox);
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
        const shapeId = shape.getId() as string;
        setShapes((prev) => prev.filter((current) => current !== shape));
        setSelectedShapeIds((prev) => {
            if (!prev.has(shapeId)) return prev;
            const next = new Set(prev);
            next.delete(shapeId);
            return next;
        });
        setPreviewShape(null);
        setIsDrawing(false);
    };

    const cloneShape = (shape: Shape): Shape => {
        if (shape instanceof Line) {
            return new Line({ ...shape.start }, { ...shape.end }, shape.borderColor, shape.borderWidth);
        }
        if (shape instanceof Circle) {
            return new Circle({ ...shape.center }, shape.radius, shape.borderColor, shape.borderWidth);
        }
        if (shape instanceof Ellipse) {
            return new Ellipse({ ...shape.center }, shape.radiusX, shape.radiusY, shape.borderColor, shape.borderWidth);
        }
        if (shape instanceof Rectangle) {
            return new Rectangle({ ...shape.origin }, shape.width, shape.height, shape.borderColor, shape.borderWidth);
        }
        if (shape instanceof Polygon) {
            return new Polygon(shape.points.map((p) => ({ ...p })), shape.borderColor, shape.borderWidth);
        }
        if (shape instanceof Polyline) {
            return new Polyline(shape.points.map((p) => ({ ...p })), shape.borderColor, shape.borderWidth);
        }
        return shape;
    };

    const removeShapeById = (shapeId: string) => {
        setShapes((prev) => prev.filter((shape) => (shape.getId() as string) !== shapeId));
        setSelectedShapeIds((prev) => {
            if (!prev.has(shapeId)) return prev;
            const next = new Set(prev);
            next.delete(shapeId);
            return next;
        });
    };

    const startShapeMove = (shape: Shape, e: React.PointerEvent<SVGGElement>) => {
        const svg = e.currentTarget.ownerSVGElement;
        if (!svg) return;
        const shapeId = shape.getId() as string;
        const startPoint = toImagePointFromClient(e.clientX, e.clientY, svg);
        const original = cloneShape(shape);
        const pointerId = e.pointerId;

        moveStartRef.current = { shapeId, pointerId, startPoint, original, svg };
        setMovingShapeId(shapeId);
        setSelectedShapeIds(new Set([shapeId]));

        // Tracks the latest pointer client position for the autopan RAF loop
        const latestClientPos = { x: e.clientX, y: e.clientY };
        let rafId = 0;

        // Compute original shape bbox once for clamping
        const origBBox: { minX: number; maxX: number; minY: number; maxY: number } | null = (() => {
            if (original instanceof Line) return { minX: Math.min(original.start.x, original.end.x), maxX: Math.max(original.start.x, original.end.x), minY: Math.min(original.start.y, original.end.y), maxY: Math.max(original.start.y, original.end.y) };
            if (original instanceof Circle) return { minX: original.center.x - original.radius, maxX: original.center.x + original.radius, minY: original.center.y - original.radius, maxY: original.center.y + original.radius };
            if (original instanceof Ellipse) return { minX: original.center.x - original.radiusX, maxX: original.center.x + original.radiusX, minY: original.center.y - original.radiusY, maxY: original.center.y + original.radiusY };
            if (original instanceof Rectangle) return { minX: original.origin.x, maxX: original.origin.x + original.width, minY: original.origin.y, maxY: original.origin.y + original.height };
            if ((original instanceof Polygon || original instanceof Polyline) && original.points.length) {
                const xs = original.points.map((p) => p.x);
                const ys = original.points.map((p) => p.y);
                return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
            }
            return null;
        })();

        const clampDelta = (dx: number, dy: number): { dx: number; dy: number } => {
            if (!origBBox || !imageWidth || !imageHeight) return { dx, dy };
            return {
                dx: Math.max(-origBBox.minX, Math.min(imageWidth - origBBox.maxX, dx)),
                dy: Math.max(-origBBox.minY, Math.min(imageHeight - origBBox.maxY, dy)),
            };
        };

        const applyShapeOffset = (rawDx: number, rawDy: number) => {
            const { dx, dy } = clampDelta(rawDx, rawDy);
            if (shape instanceof Line && original instanceof Line) {
                shape.start = { x: original.start.x + dx, y: original.start.y + dy };
                shape.end = { x: original.end.x + dx, y: original.end.y + dy };
            } else if (shape instanceof Circle && original instanceof Circle) {
                shape.center = { x: original.center.x + dx, y: original.center.y + dy };
            } else if (shape instanceof Ellipse && original instanceof Ellipse) {
                shape.center = { x: original.center.x + dx, y: original.center.y + dy };
            } else if (shape instanceof Rectangle && original instanceof Rectangle) {
                shape.origin = { x: original.origin.x + dx, y: original.origin.y + dy };
            } else if ((shape instanceof Polygon || shape instanceof Polyline) && (original instanceof Polygon || original instanceof Polyline)) {
                shape.points = original.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
            }
        };

        const onMove = (ev: PointerEvent) => {
            if (ev.pointerId !== pointerId) return;
            latestClientPos.x = ev.clientX;
            latestClientPos.y = ev.clientY;
            const pt = toImagePointFromClient(ev.clientX, ev.clientY, svg);
            applyShapeOffset(pt.x - startPoint.x, pt.y - startPoint.y);
            setShapes((prev) => [...prev]);
        };

        // Edge-scroll: pan the view when the pointer is near a border during a shape drag
        const EDGE_ZONE = 60; // px from border
        const MAX_SPEED = 12; // image-space px per frame at full edge
        const autopan = () => {
            if (!moveStartRef.current) return;
            const svgRect = svg.getBoundingClientRect();
            const cx = latestClientPos.x;
            const cy = latestClientPos.y;
            const { zoom } = viewStateRef.current;

            let panDx = 0;
            let panDy = 0;

            const distLeft   = cx - svgRect.left;
            const distRight  = svgRect.right - cx;
            const distTop    = cy - svgRect.top;
            const distBottom = svgRect.bottom - cy;

            if (distLeft   < EDGE_ZONE) panDx = -MAX_SPEED * (1 - distLeft   / EDGE_ZONE) / zoom;
            if (distRight  < EDGE_ZONE) panDx =  MAX_SPEED * (1 - distRight  / EDGE_ZONE) / zoom;
            if (distTop    < EDGE_ZONE) panDy = -MAX_SPEED * (1 - distTop    / EDGE_ZONE) / zoom;
            if (distBottom < EDGE_ZONE) panDy =  MAX_SPEED * (1 - distBottom / EDGE_ZONE) / zoom;

            // Don't pan toward a wall the shape is already against
            if (origBBox && imageWidth && imageHeight) {
                const pt = toImagePointFromClient(cx, cy, svg);
                const rawDx = pt.x - startPoint.x;
                const rawDy = pt.y - startPoint.y;
                if (panDx < 0 && rawDx <= -origBBox.minX)            panDx = 0;
                if (panDx > 0 && rawDx >= imageWidth - origBBox.maxX)  panDx = 0;
                if (panDy < 0 && rawDy <= -origBBox.minY)            panDy = 0;
                if (panDy > 0 && rawDy >= imageHeight - origBBox.maxY) panDy = 0;
            }

            if ((panDx !== 0 || panDy !== 0) && onViewStateChangeRef.current) {
                onViewStateChangeRef.current((prev) => ({ ...prev, x: prev.x + panDx, y: prev.y + panDy }));
                // Shift the drag origin so the shape follows without snapping back
                startPoint.x += panDx;
                startPoint.y += panDy;
                const pt = toImagePointFromClient(latestClientPos.x, latestClientPos.y, svg);
                applyShapeOffset(pt.x - startPoint.x, pt.y - startPoint.y);
                setShapes((prev) => [...prev]);
            }

            rafId = requestAnimationFrame(autopan);
        };
        rafId = requestAnimationFrame(autopan);

        const onEnd = (ev: PointerEvent) => {
            if (ev.pointerId !== pointerId) return;
            cleanup();
        };

        const cleanup = () => {
            cancelAnimationFrame(rafId);
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onEnd);
            document.removeEventListener("pointercancel", onEnd);
            moveStartRef.current = null;
            setMovingShapeId(null);
            moveCleanupRef.current = null;
        };

        moveCleanupRef.current = cleanup;
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onEnd);
        document.addEventListener("pointercancel", onEnd);
    };

    const stopShapeMove = () => {
        moveCleanupRef.current?.();
        moveCleanupRef.current = null;
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

    const toImagePointFromClient = (clientX: number, clientY: number, svg: SVGSVGElement): Point => {
        const rect = svg.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
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
        if (cursorRef.current instanceof ShapeSelectorCursor) {
            cursorRef.current.setSelectableShapes(shapes);
        }
        const shape = cursorRef.current.finish(force);
        if (cursorRef.current instanceof ShapeSelectorCursor) {
            const selected = new Set(cursorRef.current.getSelectedShapes().map((s) => s.getId() as string));
            setSelectedShapeIds(selected);
            setPreviewShape(null);
            setIsDrawing(false);
            return;
        }
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
        if (resolvedTool === "selector") {
            setSelectedShapeIds(new Set());
        }
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
        const isSelected = selectedShapeIds.has(shape.getId() as string);
        const shapeId = shape.getId() as string;
        const isMoving = movingShapeId === shapeId;
        if (!properties.shape.details && !isSelected) return null;

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

        const boxW = SHAPE_DETAIL_BOX_WIDTH;
        const boxH = getShapeDetailBoxHeight(detailEntries.length);

        const desiredX = anchor.x + 5;
        const desiredY = anchor.y - boxH / 2;
        const lx = Math.max(visible.minX + 4, Math.min(desiredX, visible.maxX - boxW - 4));
        const ly = Math.max(visible.minY + 4, Math.min(desiredY, visible.maxY - boxH - 4));

        if (isDrawing) {
            const margin = 12 / viewState.zoom;
            if (cursorWorldPosRef.current) {
                const { x: cx, y: cy } = cursorWorldPosRef.current;
                if (cx >= lx - margin && cx <= lx + boxW + margin && cy >= ly - margin && cy <= ly + boxH + margin) {
                    return null;
                }
            }
            if (previewShape) {
                const pbbox = getShapeBBox(previewShape);
                if (pbbox) {
                    if (
                        pbbox.maxX >= lx - margin &&
                        pbbox.minX <= lx + boxW + margin &&
                        pbbox.maxY >= ly - margin &&
                        pbbox.minY <= ly + boxH + margin
                    ) {
                        return null;
                    }
                }
            }
        }

        return (
            <ShapeDetailCard
                key={`shape-details-${idx}`}
                cardKey={`shape-details-${idx}`}
                shapeType={shape.getType()}
                detailEntries={detailEntries}
                x={lx}
                y={ly}
                isMoving={isMoving}
                onHoverStart={() => setHoveredInfo({ idx, box: { x: lx, y: ly, w: boxW, h: boxH }, anchor })}
                onHoverEnd={() => setHoveredInfo((h) => (h?.idx === idx ? null : h))}
                onMovePointerDown={(e) => {
                    e.stopPropagation();
                    startShapeMove(shape, e);
                }}
                onMovePointerUp={(e) => {
                    e.stopPropagation();
                    stopShapeMove();
                }}
                onDeletePointerDown={(e) => {
                    e.stopPropagation();
                    removeShapeById(shapeId);
                }}
            />
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
                        {shapes.map((shape, idx) => {
                            const elem = shape.render() as any;
                            if (hoveredInfo?.idx === idx) {
                                // override stroke and strokeWidth for highlight
                                const override: any = { stroke: "#409EFF" };
                                const baseWidth = elem.props?.strokeWidth ?? ("borderWidth" in shape ? (shape as any).borderWidth : undefined);
                                if (typeof baseWidth === "number") override.strokeWidth = baseWidth + 2;
                                return <g key={`shape-${idx}`}>{React.cloneElement(elem, override)}</g>;
                            }
                            if (selectedShapeIds.has(shape.getId() as string)) {
                                const override: any = { stroke: "#22c55e" };
                                const baseWidth = elem.props?.strokeWidth ?? ("borderWidth" in shape ? (shape as any).borderWidth : undefined);
                                if (typeof baseWidth === "number") override.strokeWidth = baseWidth + 1.5;
                                return <g key={`shape-${idx}`}>{React.cloneElement(elem, override)}</g>;
                            }
                            return <g key={`shape-${idx}`}>{elem}</g>;
                        })}
                        {shapes.map((shape, idx) => renderShapeDetails(shape, idx))}
                        {previewShape && (
                            <g opacity={0.75}>
                                {resolvedTool === "selector" && previewShape instanceof Rectangle ? (
                                    <>
                                        <rect
                                            x={previewShape.origin.x}
                                            y={previewShape.origin.y}
                                            width={previewShape.width}
                                            height={previewShape.height}
                                            fill="rgba(78, 161, 255, 0.14)"
                                            stroke="#4ea1ff"
                                            strokeWidth={1.5 / viewState.zoom}
                                            strokeDasharray={`${6 / viewState.zoom} ${4 / viewState.zoom}`}
                                        />
                                    </>
                                ) : (
                                    previewShape.render()
                                )}
                            </g>
                        )}
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
